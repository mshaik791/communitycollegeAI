import { NextResponse } from "next/server";
import { AVATARS } from "@/lib/tavus/personas";

export async function GET() {
  const status = Object.entries(AVATARS).map(([id, persona]) => ({
    id,
    name: persona.name,
    replicaId: persona.replicaId
      ? "✓ " + persona.replicaId.slice(0, 8) + "..."
      : "✗ MISSING",
    personaId: persona.personaId
      ? "✓ " + persona.personaId.slice(0, 8) + "..."
      : "✗ MISSING",
    configured: !!(persona.replicaId && persona.personaId),
  }));

  return NextResponse.json({
    avatars: status,
    allConfigured: status.every((s) => s.configured),
  });
}
