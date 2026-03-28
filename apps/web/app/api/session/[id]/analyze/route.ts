import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = await req.json();
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL?.replace("/v1", "") ?? "http://localhost:4000";

  const res = await fetch(`${apiUrl}/v1/session/${params.id}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json() as {
    success?: boolean;
    error?: string;
    analysis?: {
      riskScore: number;
      riskLabel: string;
      studentLanguage: string;
      caseSummary: string;
      emotionalInsight: string;
      barriers: { code: string; severity: string; notes: string }[];
      nextSteps: string[];
      urgency: string;
      strengths: string;
      recommendedAvatar: string;
      perceptionHighlights: string;
    };
    sessionId?: string;
  };

  return NextResponse.json(
    { success: data.success, analysis: data.analysis, sessionId: params.id, error: data.error },
    { status: res.ok ? 200 : res.status },
  );
}
