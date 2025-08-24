import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const base = process.env.API_INTERNAL_URL || "http://api-blue:3001";
  const body = await req.text(); // pass-through body
  const r = await fetch(`${base}/invites/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const txt = await r.text();
  try {
    return NextResponse.json(JSON.parse(txt), { status: r.status });
  } catch {
    return new NextResponse(txt, { status: r.status });
  }
}
