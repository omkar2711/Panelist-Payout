import { LoginForm } from "@/components/login-form";

const ERROR_MESSAGES: Record<string, string> = {
  "no-account":
    "That Google account isn't set up here yet. Ask the vendor to add you with this email first.",
  oauth: "Google sign-in didn't complete. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { error } = await searchParams;
  const initialError = typeof error === "string" ? (ERROR_MESSAGES[error] ?? "") : "";

  return <LoginForm initialError={initialError} />;
}
