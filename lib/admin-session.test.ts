import { describe, it, expect, vi, beforeEach } from "vitest";

describe("admin-session", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("exports ADMIN_COOKIE_NAME", async () => {
    const m = await import("./admin-session");
    expect(m.ADMIN_COOKIE_NAME).toBe("sp_admin_session");
  });

  it("createAdminSession returns 64-char lowercase hex", async () => {
    const m = await import("./admin-session");
    const token = m.createAdminSession();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("verifyAdminSession is false for missing or unknown token", async () => {
    const m = await import("./admin-session");
    expect(m.verifyAdminSession(undefined)).toBe(false);
    expect(m.verifyAdminSession(null)).toBe(false);
    expect(m.verifyAdminSession("")).toBe(false);
    expect(m.verifyAdminSession("not-a-valid-session-token")).toBe(false);
  });

  it("create → verify → revoke lifecycle", async () => {
    const m = await import("./admin-session");
    const token = m.createAdminSession();
    expect(m.verifyAdminSession(token)).toBe(true);
    m.revokeAdminSession(token);
    expect(m.verifyAdminSession(token)).toBe(false);
  });

  it("countActiveSessions tracks created sessions", async () => {
    const m = await import("./admin-session");
    expect(m.countActiveSessions()).toBe(0);
    m.createAdminSession();
    expect(m.countActiveSessions()).toBe(1);
    m.createAdminSession();
    expect(m.countActiveSessions()).toBe(2);
  });

  it("verifyAdminSession removes expired token", async () => {
    vi.useFakeTimers();
    const m = await import("./admin-session");
    const token = m.createAdminSession();
    expect(m.verifyAdminSession(token)).toBe(true);
    vi.advanceTimersByTime(61 * 60 * 1000);
    expect(m.verifyAdminSession(token)).toBe(false);
    expect(m.verifyAdminSession(token)).toBe(false);
    vi.useRealTimers();
  });

  it("buildSessionCookieOptions sets cookie flags", async () => {
    const m = await import("./admin-session");
    vi.stubEnv("NODE_ENV", "development");
    const devOpts = m.buildSessionCookieOptions(1800);
    expect(devOpts.httpOnly).toBe(true);
    expect(devOpts.sameSite).toBe("strict");
    expect(devOpts.path).toBe("/");
    expect(devOpts.maxAge).toBe(1800);
    expect(devOpts.secure).toBe(false);

    vi.stubEnv("NODE_ENV", "production");
    expect(m.buildSessionCookieOptions().secure).toBe(true);
    vi.unstubAllEnvs();
  });
});
