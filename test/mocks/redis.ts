import type { SessionData } from "@/server/overleaf/repositories/session.repository";

export const mockSessionData: SessionData = {
  cookie: {
    originalMaxAge: 432000000,
    expires: new Date(Date.now() + 432000000).toISOString(),
    secure: false,
    httpOnly: true,
  },
  csrfSecret: "csrf-secret",
  validationToken: "validation-token",
  userId: "user123",
};
