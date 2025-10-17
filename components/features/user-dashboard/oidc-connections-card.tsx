"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Never";
  try {
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleString();
  } catch {
    return "Unknown";
  }
}

export type OidcConnection = {
  providerId: string;
  accountId: string;
  linkedAt: Date | string;
};

export function OidcConnectionsCard({
  oidcProviderName,
  connections,
}: {
  oidcProviderName: string;
  connections: OidcConnection[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{oidcProviderName} Connection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Your portal account can also authenticate via {oidcProviderName}.
          Linked identities are listed below.
        </p>
        {connections.length > 0 ? (
          <div className="space-y-3">
            {connections.map((connection) => (
              <div
                key={`${connection.providerId}-${connection.accountId}`}
                className="rounded-lg border p-4 text-sm"
              >
                <div className="space-y-1">
                  <span className="font-medium">Account ID</span>
                  <p className="font-mono text-xs text-muted-foreground">
                    {connection.accountId}
                  </p>
                </div>
                <div className="mt-3 flex flex-col gap-1">
                  <span className="text-muted-foreground">Linked on</span>
                  <span>{formatDate(connection.linkedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No OIDC connection has been established yet. It will appear here
            after your first sign-in via {oidcProviderName}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
