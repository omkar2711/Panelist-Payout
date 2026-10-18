// Shown instantly while a page's data loads, so a click never looks ignored.
function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/70 ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Block className="h-7 w-56 rounded-lg" />
        <Block className="h-4 w-80 max-w-full rounded-md" />
      </div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Block className="col-span-2 h-32 xl:col-span-1" />
        <Block className="h-32" />
        <Block className="h-32" />
        <Block className="col-span-2 h-32 xl:col-span-1" />
      </div>
      <Block className="h-72" />
      <Block className="h-56" />
    </div>
  );
}
