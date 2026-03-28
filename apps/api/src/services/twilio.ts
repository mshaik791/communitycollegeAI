import twilio from "twilio";

import { env } from "../config/env";

type TwilioResult =
  | { mock: true; sent: false; error?: string }
  | { mock: false; sent: true; sid: string }
  | { mock: false; sent: false; error: string };

const hasCreds =
  !!env.TWILIO_ACCOUNT_SID && !!env.TWILIO_AUTH_TOKEN && !!env.TWILIO_FROM_NUMBER;

const client = hasCreds
  ? twilio(env.TWILIO_ACCOUNT_SID as string, env.TWILIO_AUTH_TOKEN as string)
  : null;

export async function sendCallbackSms(opts: {
  to: string;
  counselorName: string;
}): Promise<TwilioResult> {
  const { to, counselorName } = opts;

  if (!to) {
    return { mock: true, sent: false, error: "Missing destination phone" };
  }

  if (!hasCreds || env.DEMO_MODE) {
    return {
      mock: true,
      sent: false,
      error: env.DEMO_MODE
        ? "DEMO_MODE enabled - mock send"
        : "Twilio credentials not configured",
    };
  }

  try {
    const message = await client!.messages.create({
      to,
      from: env.TWILIO_FROM_NUMBER as string,
      body: `NOCE Support: We received your request. Counselor ${counselorName} will contact you soon. If urgent call 988.`,
    });

    return { mock: false, sent: true, sid: message.sid };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown Twilio error";
    return { mock: false, sent: false, error: errorMessage };
  }
}

