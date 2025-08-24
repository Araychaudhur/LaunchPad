import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  const token =
    (session as any)?.apiToken ||
    (session as any)?.accessToken ||
    (session as any)?.user?.apiToken ||
    (session as any)?.user?.accessToken;

  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const base = process.env.API_INTERNAL_URL || "http://api-blue:3001";
  const res = await fetch(`${base}/orgs`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });

  const text = await res.text();
  try {
    return NextResponse.json(JSON.parse(text), { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
