import { Info } from "lucide-react";

export function NoticeBanner({ title, body }: { title: string; body: string }) {
  return (
    <div
      role="status"
      className="mb-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm sm:px-5"
    >
      <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-600" strokeWidth={2.25} />
      <p>
        <span className="font-semibold">{title}.</span> {body}
      </p>
    </div>
  );
}
