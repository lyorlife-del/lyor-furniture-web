import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { demoCookie, demoEnabled, demoIdentity } from "@/lib/demo-session";
async function handler(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params,
    jar = await cookies();
  const expectedOrigin = process.env.WEB_ORIGIN ?? "http://127.0.0.1:3000";
  if (
    request.method !== "GET" &&
    request.headers.get("origin") !== expectedOrigin
  )
    return NextResponse.json(
      { message: "Same-origin request required" },
      { status: 403 },
    );
  if (path.join("/") === "session") {
    if (request.method === "GET") {
      return NextResponse.json(demoIdentity(jar.get(demoCookie)?.value), {
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (!demoEnabled())
      return NextResponse.json(
        { message: "Local demo identity is disabled" },
        { status: 403 },
      );
    if (request.method === "DELETE") {
      jar.delete(demoCookie);
      return NextResponse.json({ signedOut: true });
    }
    const body = await request.json().catch(() => null);
    const selected =
      typeof body?.identity === "string" ? demoIdentity(body.identity) : null;
    if (request.method !== "POST" || !selected)
      return NextResponse.json(
        { message: "Choose a demo identity" },
        { status: 400 },
      );
    jar.set(demoCookie, body.identity, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: 3600,
      secure: request.nextUrl.protocol === "https:",
    });
    return NextResponse.json(selected);
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const identity = jar.get(demoCookie)?.value;
  if (demoIdentity(identity)) headers.authorization = "Bearer " + identity;
  const key = request.headers.get("idempotency-key");
  if (key) headers["Idempotency-Key"] = key;
  try {
    const target =
      (process.env.API_URL ?? "http://127.0.0.1:4000/api/v1") +
      "/" +
      path.map(encodeURIComponent).join("/") +
      request.nextUrl.search;
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method)
        ? undefined
        : await request.text(),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(12000),
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      {
        message:
          "The marketplace API is unavailable. Please try again shortly.",
      },
      { status: 503 },
    );
  }
}
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
