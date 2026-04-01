import { NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL?.replace("/v1", "") ?? "http://localhost:4000";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const res = await fetch(`${API}/v1/followup/${params.id}/complete`, { method: "PATCH" });
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
