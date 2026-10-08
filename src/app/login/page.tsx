import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";

const ERROR_MESSAGES: Record<string, string> = {
  "no-account":
    "That account isn't set up here yet. Ask the vendor to add you with this email first.",
  oauth: "Google sign-in didn't complete. Please try again.",
  inactive: "Your account has been deactivated. Please contact the vendor.",
};

const OAUTH_REASONS: Record<string, string> = {
  access_denied: "Google sign-in was cancelled.",
  flow_state_not_found:
    "That sign-in link expired or was opened in a different browser. Please try again.",
  flow_state_expired: "That sign-in took too long and expired. Please try again.",
  bad_code_verifier:
    "Sign-in was started in a different browser or tab. Please try again from this one.",
  pkce_code_verifier_not_found:
    "Sign-in was started in a different browser or tab. Please try again from this one.",
  signup_disabled: "New sign-ups are switched off for this app.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { error, reason } = await searchParams;
  let initialError = typeof error === "string" ? (ERROR_MESSAGES[error] ?? "") : "";
  if (error === "oauth" && typeof reason === "string" && /^[a-z0-9_]{1,40}$/.test(reason)) {
    initialError = OAUTH_REASONS[reason] ?? `${ERROR_MESSAGES.oauth} (${reason})`;
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your account to continue.">
      <LoginForm initialError={initialError} />
    </AuthShell>
  );
}
