import { NextRequest, NextResponse } from "next/server";
import {
  createAdminSession,
  ADMIN_COOKIE_NAME,
  buildSessionCookieOptions,
} from "@/lib/admin-session";

export const runtime = "nodejs";

interface VerifyRequest {
  password?: unknown;
}

export async function POST(req: NextRequest) {
  const expected = process.env.ADMIN_PAGE_PASSWORD;

  if (!expected || expected.trim() === "") {
    return NextResponse.json(
      { error: "Server misconfigured: ADMIN_PAGE_PASSWORD env var missing" },
      { status: 500 }
    );
  }

  let body: VerifyRequest;
  try {
    body = (await req.json()) as VerifyRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (typeof body.password !== "string") {
    return NextResponse.json(
      { error: "'password' must be a string" },
      { status: 400 }
    );
  }

  if (!constantTimeEqual(body.password, expected)) {
    return NextResponse.json(
      { error: "Invalid password" },
      { status: 401 }
    );
  }

  // Password ok → crea sessione admin e setta cookie
  const token = createAdminSession();
  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set(ADMIN_COOKIE_NAME, token, buildSessionCookieOptions());

  return response;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
