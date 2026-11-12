// Shapes shown while a page streams in, so a slow connection shows the layout at once.

export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
      <div className="skeleton aspect-square rounded-none" />
      <div className="space-y-2.5 p-4">
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton mt-3 h-5 w-24" />
        <div className="skeleton h-10 w-full rounded-full" />
      </div>
    </div>
  );
}

export function ListingSkeleton() {
  return (
    <div className="wrap pt-5 pb-4" aria-busy="true" aria-label="Loading products">
      <div className="skeleton h-4 w-40" />
      <div className="skeleton mt-4 h-9 w-56" />
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="skeleton hidden h-[480px] lg:block" />
        <div>
          <div className="mb-4 flex justify-between">
            <div className="skeleton h-5 w-44" />
            <div className="skeleton h-10 w-36 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
