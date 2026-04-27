import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ADMIN_COOKIE_NAME,
  createAdminSession,
  verifyAdminSession,
  revokeAdminSession,
  countActiveSessions,
  buildSessionCookieOptions,
} from "./admin-session";

const TEST_SECRET = "test-secret-at-least-32-chars-long-xx";

describe("admin-session (stateless HMAC)", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_SESSION_SECRET", TEST_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ADMIN_COOKIE_NAME is unchanged", () => {
    expect(ADMIN_COOKIE_NAME).toBe("sp_admin_session");
  });

  it("crea un token con formato payload.signature", () => {
    const token = createAdminSession();
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it("verifica un token appena creato", () => {
    const token = createAdminSession();
    expect(verifyAdminSession(token)).toBe(true);
  });

  it("rifiuta un token tampered", () => {
    const token = createAdminSession();
    const tampered = token.slice(0, -1) + "X";
    expect(verifyAdminSession(tampered)).toBe(false);
  });

  it("rifiuta un token scaduto", () => {
    const expired = createAdminSession(-1000);
    expect(verifyAdminSession(expired)).toBe(false);
  });

  it("rifiuta token malformati", () => {
    expect(verifyAdminSession(null)).toBe(false);
    expect(verifyAdminSession("")).toBe(false);
    expect(verifyAdminSession("no-dot-in-token")).toBe(false);
    expect(verifyAdminSession("a.b.c")).toBe(false);
  });

  it("revokeAdminSession è no-op (non lancia)", () => {
    const token = createAdminSession();
    expect(() => revokeAdminSession(token)).not.toThrow();
    expect(verifyAdminSession(token)).toBe(true);
  });

  it("countActiveSessions ritorna 0 in versione stateless", () => {
    expect(countActiveSessions()).toBe(0);
  });

  it("buildSessionCookieOptions è invariata", () => {
    vi.stubEnv("NODE_ENV", "development");
    const opts = buildSessionCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("strict");
    expect(opts.path).toBe("/");
    expect(opts.maxAge).toBe(3600);
    expect(opts.secure).toBe(false);
  });

  it("buildSessionCookieOptions.secure in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(buildSessionCookieOptions().secure).toBe(true);
  });

  it("verifyAdminSession false quando la firma è per altro secret", () => {
    const token = createAdminSession();
    vi.stubEnv("ADMIN_SESSION_SECRET", "other-secret-also-long-enough-abc-");
    expect(verifyAdminSession(token)).toBe(false);
  });

  it("createAdminSession throws without ADMIN_SESSION_SECRET", () => {
    // Non usare solo vi.unstubAllEnvs(): ripristina l'env reale del processo; in
    // locale o CI con variabile già presente (shell, dotenv) il secret resta
    // valorizzato e getSecret() non lancia. Forziamo mancante/invalido.
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    expect(() => createAdminSession()).toThrow(/Missing ADMIN_SESSION_SECRET/);
  });
});
