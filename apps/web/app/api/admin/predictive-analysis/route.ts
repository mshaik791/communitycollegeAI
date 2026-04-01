import { NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL?.replace("/v1", "") ?? "http://localhost:4000";

export async function POST() {
  const res = await fetch(`${API}/v1/admin/predictive-analysis`, { method: "POST" });
  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
