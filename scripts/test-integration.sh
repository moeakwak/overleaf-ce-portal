#!/bin/bash

# Integration test script for Overleaf CE Portal
# This script sets up the environment and runs integration tests

set -e

echo "Starting Overleaf CE Portal Integration Tests..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if required containers are running
SHARELATEX_RUNNING=$(docker ps --filter "name=sharelatex" --format "{{.Names}}" | wc -l)
MONGO_RUNNING=$(docker ps --filter "name=mongo" --format "{{.Names}}" | wc -l)
REDIS_RUNNING=$(docker ps --filter "name=redis" --format "{{.Names}}" | wc -l)

if [ "$SHARELATEX_RUNNING" -eq 0 ] || [ "$MONGO_RUNNING" -eq 0 ] || [ "$REDIS_RUNNING" -eq 0 ]; then
    echo "⚠️  Required containers are not running. Attempting to start them..."

    # Try to start containers using overleaf-toolkit
    if [ -d "../docker/overleaf-toolkit" ]; then
        cd ../docker/overleaf-toolkit
        ./bin/up
        cd - > /dev/null
    else
        echo "❌ Overleaf toolkit not found. Please start the containers manually."
        echo "Required containers: sharelatex, mongo, redis"
        exit 1
    fi
fi

# Wait for containers to be ready
echo "⏳ Waiting for containers to be ready..."
sleep 10

# Check container health
echo "🔍 Checking container health..."
docker ps --filter "name=sharelatex" --filter "name=mongo" --filter "name=redis" --format "table {{.Names}}\t{{.Status}}"

# Set environment variables for integration tests
export RUN_INTEGRATION_TESTS=true
export NODE_ENV=test

# Run the integration tests
echo "🧪 Running integration tests..."
bun run test:run test/integration/

echo "✅ Integration tests completed!"

# Optional: Run a quick health check
echo "🏥 Running final health check..."
node -e "
(async () => {
  try {
    const { AppContext } = await import('./dist/server/context.js');
    const appContext = AppContext.getInstance();
    await appContext.initialize();
    const systemService = appContext.getOverleafSystemService();
    const health = await systemService.getSystemHealth();

    console.log('System Health:', health.overall);
    console.log('Components:', Object.keys(health.components)
      .map((key) => key + ': ' + health.components[key].status)
      .join(', '));

    await appContext.cleanup();
    process.exit(0);
  } catch (err) {
    console.error('Health check failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
})();
"
