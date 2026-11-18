import { registerOTel } from "@vercel/otel";

// Sends server traces (page renders, Supabase fetches) to Vercel Observability.
export function register() {
  registerOTel({ serviceName: "panelist-payout" });
}
