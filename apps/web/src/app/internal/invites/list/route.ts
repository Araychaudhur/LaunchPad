import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  const token =
    (session as any)?.apiToken ||
    (session as any)?.accessToken ||
    (session as any)?.user?.apiToken ||
    (session as any)?.user?.accessToken;

  // If there’s no session token, just return an empty list (don’t leak status to UI).
  if (!token) return NextResponse.json([], { status: 200 });

  const base = process.env.API_INTERNAL_URL || "http://api-blue:3001";
  const res = await fetch(`${base}/invites`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });

  // If RBAC blocks (401/403), also return an empty list (UI will stay neutral).
  if (res.status === 401 || res.status === 403) {
    return NextResponse.json([], { status: 200 });
  }

  const text = await res.text();
  try {
    return NextResponse.json(JSON.parse(text), { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
