/**
 * Grey shapes shown while a page loads on a slow connection, so a tap gets an answer at once.
 * Same layout as the real page; hidden from screen readers (they hear "loading" instead).
 * Only on pages that never answer "not found" (a loading screen would turn a real 404 into a 200).
 */
const B = ({ className = "" }: { className?: string }) => <span aria-hidden className={`block animate-pulse rounded-xl bg-surface-2/80 ${className}`} />;

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" className="container-page py-6 sm:py-10">
      <span className="sr-only">…</span>
      {children}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-surface/80 p-2.5 sm:p-3">
      <B className="aspect-[4/3] w-full" />
      <B className="mt-3 h-4 w-3/4" />
      <B className="mt-2 h-3 w-1/2" />
      <div className="mt-4 flex items-end justify-between gap-2">
        <B className="h-5 w-16" />
        <B className="h-9 w-16" />
      </div>
    </div>
  );
}

export function StoreSkeleton() {
  return (
    <Wrap>
      <B className="h-24 w-full rounded-3xl sm:h-36" />
      <B className="mt-4 h-13 w-full rounded-2xl" />
      <div className="mt-4 flex gap-2">
        {[0, 1, 2, 3].map((i) => <B key={i} className="h-11 w-24 shrink-0 rounded-full" />)}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {[0, 1, 2, 3, 4, 5].map((i) => <CardSkeleton key={i} />)}
      </div>
    </Wrap>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Wrap>
      <B className="h-8 w-48" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-surface/80 p-3">
            <B className="size-14 shrink-0" />
            <div className="flex-1 space-y-2">
              <B className="h-4 w-2/3" />
              <B className="h-3 w-1/3" />
            </div>
            <B className="h-5 w-16" />
          </div>
        ))}
      </div>
    </Wrap>
  );
}
