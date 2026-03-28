import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z
    .string()
    .transform((val) => Number(val))
    .pipe(z.number().int().positive())
    .default("4000" as unknown as number),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  DEMO_MODE: z
    .string()
    .optional()
    .transform((val) => (val ?? "true").toLowerCase())
    .transform((val) => val === "true" || val === "1"),
});

const parsed = envSchema.safeParse({
  PORT: process.env.PORT ?? "4000",
  DATABASE_URL: process.env.DATABASE_URL,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_FROM_NUMBER: process.env.TWILIO_FROM_NUMBER,
  DEMO_MODE: process.env.DEMO_MODE,
});

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  // Fail fast on invalid configuration
  process.exit(1);
}

export const env = parsed.data;

