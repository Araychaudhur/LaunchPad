import { NextResponse } from "next/server";

// Simple baseline marker. Safe: does not affect existing pages.
export async function GET() {
  return new NextResponse("ok - baseline 8f96c54", {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
