/**
 * Sessioni admin stateless basate su cookie firmato HMAC-SHA256.
 *
 * Design:
 * - Nessuno stato server-side (funziona in ogni serverless container)
 * - Cookie value: "<payload_base64url>.<signature_base64url>"
 * - Payload: JSON { exp: <timestamp_ms> }
 * - Signature: HMAC-SHA256(payload_base64url, ADMIN_SESSION_SECRET)
 *
 * Trade-off accettato: impossibile revocare un token prima della sua
 * scadenza naturale (nessuno store server per tracciare "revoked tokens").
 * Per admin panel interno è accettabile: logout lato client basta, il
 * token dimenticato scade in 1h.
 */

import crypto from "crypto";

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 ora
const SIGNATURE_ALGO = "sha256";

export const ADMIN_COOKIE_NAME = "sp_admin_session";

interface SessionPayload {
  exp: number;
}

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.trim() === "") {
    throw new Error("Missing ADMIN_SESSION_SECRET env var");
  }
  return secret;
}

function base64urlEncode(data: string | Buffer): string {
  const buf = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(data: string): string {
  // Ripristina padding standard base64
  const pad = 4 - (data.length % 4);
  const padded = pad < 4 ? data + "=".repeat(pad) : data;
  const b64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64").toString("utf-8");
}

function sign(payloadB64: string, secret: string): string {
  const hmac = crypto.createHmac(SIGNATURE_ALGO, secret);
  hmac.update(payloadB64);
  return base64urlEncode(hmac.digest());
}

/**
 * Crea un token di sessione admin firmato.
 * TTL: 1 ora dall'emissione.
 */
export function createAdminSession(ttlMs: number = SESSION_TTL_MS): string {
  const secret = getSecret();
  const payload: SessionPayload = { exp: Date.now() + ttlMs };
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64urlEncode(payloadJson);
  const signature = sign(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

/**
 * Verifica se un token di sessione è valido.
 * Controlla: firma HMAC corretta + scadenza non superata.
 */
export function verifyAdminSession(token: string | undefined | null): boolean {
  if (!token || typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payloadB64, providedSignature] = parts;
  if (!payloadB64 || !providedSignature) return false;

  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return false;
  }

  const expectedSignature = sign(payloadB64, secret);

  // Confronto tempo-costante per difesa timing attack
  if (!timingSafeEqual(providedSignature, expectedSignature)) {
    return false;
  }

  let payload: SessionPayload;
  try {
    const decoded = base64urlDecode(payloadB64);
    payload = JSON.parse(decoded) as SessionPayload;
  } catch {
    return false;
  }

  if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
    return false;
  }

  if (Date.now() > payload.exp) return false;

  return true;
}

/**
 * Revoca: no-op in questa implementazione stateless.
 * Mantenuta per compatibilità API con chiamanti esistenti.
 * Il logout lato client deve eliminare il cookie (Set-Cookie con Max-Age=0).
 */
export function revokeAdminSession(_token: string | undefined | null): void {
  // no-op: non abbiamo uno stato per revocare
}

/**
 * No-op / stima: nella versione stateless non sappiamo quante sessioni sono attive.
 * Ritorna 0 per compatibilità API.
 */
export function countActiveSessions(): number {
  return 0;
}

/**
 * Config cookie standard.
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

// Helper per confronto stringhe tempo-costante
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return crypto.timingSafeEqual(bufA, bufB);
}
