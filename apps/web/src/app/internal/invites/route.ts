import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const token =
    (session as any)?.apiToken ||
    (session as any)?.accessToken ||
    (session as any)?.user?.apiToken ||
    (session as any)?.user?.accessToken;

  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const base = process.env.API_INTERNAL_URL || "http://api-blue:3001";

  const res = await fetch(`${base}/invites`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  const text = await res.text();
  try {
    return NextResponse.json(JSON.parse(text), { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
