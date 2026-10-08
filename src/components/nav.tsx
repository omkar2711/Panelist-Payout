import { Wallet2 } from "lucide-react";
import { SignOutButton } from "./sign-out-button";

export function Nav({ title, userLabel }: { title: string; userLabel: string }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Wallet2 className="h-4.5 w-4.5" strokeWidth={2.25} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="text-xs text-slate-400">{userLabel}</p>
          </div>
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
