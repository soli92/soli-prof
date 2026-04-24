/**
 * In-memory store per token di sessione admin.
 *
 * I token si perdono al restart del server — accettabile perché:
 * - L'admin panel è usato raramente
 * - Al restart basta rifare login
 * - Evita dependency da DB / Redis per questo caso d'uso semplice
 *
 * Security model:
 * - Token 32-byte random hex (cryptographically secure)
 * - Scadenza 1 ora
 * - Cookie httpOnly, Secure in prod, SameSite=Strict
 */

import crypto from "crypto";

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

interface SessionEntry {
  expiresAt: number;
}

// Modulo-level Map: persistente per l'istanza server, resettata al restart.
const sessions = new Map<string, SessionEntry>();

export const ADMIN_COOKIE_NAME = "sp_admin_session";

/**
 * Crea una nuova sessione admin e ritorna il token.
 * Il chiamante deve settare il cookie nella response.
 */
export function createAdminSession(): string {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(token, { expiresAt });

  // Garbage collection opportunistica: pulisci le sessioni scadute quando ne creiamo una nuova
  purgeExpired();

  return token;
}

/**
 * Verifica se un token è valido (esiste e non è scaduto).
 * Se è scaduto, lo rimuove.
 */
export function verifyAdminSession(token: string | undefined | null): boolean {
  if (!token) return false;
  const entry = sessions.get(token);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    sessions.delete(token);
    return false;
  }
  return true;
}

/**
 * Revoca una sessione esplicitamente (logout).
 */
export function revokeAdminSession(token: string | undefined | null): void {
  if (!token) return;
  sessions.delete(token);
}

/**
 * Utility: numero di sessioni attive (per debug / health check futuro).
 */
export function countActiveSessions(): number {
  purgeExpired();
  return sessions.size;
}

function purgeExpired(): void {
  const now = Date.now();
  for (const [token, entry] of sessions.entries()) {
    if (now > entry.expiresAt) {
      sessions.delete(token);
    }
  }
}

/**
 * Config cookie standard per admin session.
 * In prod (NODE_ENV=production) il flag Secure viene aggiunto.
 */
export function buildSessionCookieOptions(maxAgeSeconds: number = 3600) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
