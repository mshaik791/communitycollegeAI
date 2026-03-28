import { NextResponse } from "next/server";
import { AVATARS, type AvatarId } from "@/lib/tavus/personas";

// Maps our language codes to the full names Tavus expects in properties.language
// "multilingual" enables Tavus smart auto-detection — recommended default
const TAVUS_LANGUAGE_MAP: Record<string, string> = {
  multilingual: "multilingual",
  en: "english",
  es: "spanish",
  vi: "vietnamese",
  ar: "arabic",
  tl: "tagalog",
  ko: "korean",
  zh: "chinese",
  fa: "farsi",
  uk: "ukrainian",
  fr: "french",
  de: "german",
  pt: "portuguese",
  ja: "japanese",
  hi: "hindi",
  it: "italian",
  ru: "russian",
  tr: "turkish",
};

export async function POST(req: Request) {
  const { sessionId, avatarId, language } = await req.json() as {
    sessionId: string;
    avatarId?: string;
    language?: string;
  };

  const apiKey = process.env.TAVUS_API_KEY;
  if (!apiKey) {
    console.error("Tavus: TAVUS_API_KEY is not set");
    return NextResponse.json({ error: "Tavus API key not configured" }, { status: 500 });
  }

  const persona = AVATARS[avatarId as AvatarId] ?? AVATARS["sofi"];

  if (!persona.replicaId || !persona.personaId) {
    console.error(`Tavus: avatar '${avatarId}' has no replicaId or personaId configured`);
    return NextResponse.json(
      { error: `Avatar '${persona.name}' is not fully configured` },
      { status: 400 },
    );
  }

  // Unknown codes fall back to multilingual (auto-detect)
  const tavusLanguage = language
    ? (TAVUS_LANGUAGE_MAP[language] ?? "multilingual")
    : "multilingual";

  const languageInstruction = tavusLanguage !== "multilingual"
    ? `IMPORTANT: This student speaks ${tavusLanguage}. Respond ONLY in ${tavusLanguage}.`
    : "Respond in whatever language the student speaks.";

  const res = await fetch("https://tavusapi.com/v2/conversations", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      replica_id: persona.replicaId,
      persona_id: persona.personaId,
      callback_url: process.env.TAVUS_WEBHOOK_URL ?? "",
      properties: {
        language: tavusLanguage,
      },
      conversational_context: `You are ${persona.name}, a ${persona.role} at NOCE community college. Session ID: ${sessionId}. ${languageInstruction}`,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Tavus error for avatar '${persona.name}' (${res.status}):`, text);
    return NextResponse.json({ error: "Failed to start Tavus session" }, { status: 500 });
  }

  const json = await res.json() as { conversation_url: string };
  console.log(`Tavus session started | avatar: ${persona.name} | lang: ${tavusLanguage} | URL: ${json.conversation_url}`);
  return NextResponse.json({ tavusSessionUrl: json.conversation_url });
}
