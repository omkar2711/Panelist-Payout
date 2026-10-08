import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Set a new password" subtitle="Choose a password you don't use elsewhere.">
      <ResetPasswordForm />
    </AuthShell>
  );
}
