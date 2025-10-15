import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DockerCommandExecutor } from "@/server/connectors/docker-executor";

const createStream = () => {
  const handlers: Record<string, Array<(...args: any[]) => void>> = {};

  const stream = {
    destroy: vi.fn(),
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      handlers[event] = handlers[event] || [];
      handlers[event].push(handler);
      return stream;
    }),
    emit: (event: string, ...args: any[]) => {
      for (const handler of handlers[event] ?? []) {
        handler(...args);
      }
    },
  };

  return stream;
};

describe("DockerCommandExecutor", () => {
  let dockerMock: any;
  let containerMock: any;
  let execMock: any;
  let executor: DockerCommandExecutor;

  beforeEach(() => {
    execMock = {
      start: vi.fn(),
      inspect: vi.fn().mockResolvedValue({ ExitCode: 0 }),
    };

    containerMock = {
      inspect: vi.fn().mockResolvedValue({
        State: {
          Running: true,
          Status: "running",
          StartedAt: new Date().toISOString(),
        },
      }),
      exec: vi.fn().mockResolvedValue(execMock),
    };

    dockerMock = {
      getContainer: vi.fn(() => containerMock),
      listContainers: vi.fn().mockResolvedValue([]),
    };

    executor = new DockerCommandExecutor(dockerMock, "sharelatex");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("executes script inside running container", async () => {
    execMock.start.mockImplementation(async () => {
      const stream = createStream();
      setImmediate(() => {
        stream.emit("data", Buffer.from("hello"));
        stream.emit("data", Buffer.from(" world"));
        stream.emit("end");
      });
      return stream;
    });

    const result = await executor.executeScript("test-script.mjs", ["--flag"]);

    expect(result.success).toBe(true);
    expect(result.stdout).toBe("hello world");
    expect(result.stderr).toBe("");
    expect(result.exitCode).toBe(0);
    expect(containerMock.exec).toHaveBeenCalledWith({
      Cmd: [
        "node",
        "/overleaf/services/web/modules/server-ce-scripts/scripts/test-script.mjs",
        "--flag",
      ],
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: "/overleaf/services/web",
      Env: undefined,
    });
  });

  it("returns failure when container is not running", async () => {
    containerMock.inspect.mockResolvedValueOnce({
      State: { Running: false, Status: "stopped" },
    });

    const result = await executor.executeScript("test-script.mjs");

    expect(result.success).toBe(false);
    expect(result.stderr).toContain("is not running");
  });

  it("returns failure on timeout", async () => {
    vi.useFakeTimers();

    const stream = createStream();
    execMock.start.mockResolvedValue(stream);

    const resultPromise = executor.executeScript("hanging.mjs", [], {
      timeout: 50,
    });
    const expectation = expect(resultPromise).rejects.toThrow("timed out");

    await vi.advanceTimersByTimeAsync(60);

    await expectation;
    expect(stream.destroy).toHaveBeenCalled();
  });

  it("builds command arguments for createUser", async () => {
    const executeSpy = vi.spyOn(executor, "executeScript").mockResolvedValue({
      success: true,
      stdout: "",
      stderr: "",
      exitCode: 0,
      executionTime: 10,
    });

    await executor.createUser("admin@example.com", true);

    expect(executeSpy).toHaveBeenCalledWith(
      "create-user.mjs",
      ["--email", "admin@example.com", "--admin"],
      { timeout: 60000 },
    );

    executeSpy.mockRestore();
  });
});
