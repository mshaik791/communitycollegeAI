import { NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL?.replace("/v1", "") ?? "http://localhost:4000";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const res = await fetch(`${API}/v1/session/${params.id}/followup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
