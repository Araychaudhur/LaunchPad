import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || "";
  const base = process.env.API_INTERNAL_URL || "http://api-blue:3001";
  const r = await fetch(`${base}/invites/verify?token=${encodeURIComponent(token)}`, {
    cache: "no-store",
  });
  const txt = await r.text();
  try {
    return NextResponse.json(JSON.parse(txt), { status: r.status });
  } catch {
    return new NextResponse(txt, { status: r.status });
  }
}
