export default function AdminApplicationReviewLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading application review">
      <div className="h-8 w-72 animate-pulse rounded bg-gray-200" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="h-96 animate-pulse rounded-lg border border-gray-200 bg-white" />
        <div className="h-72 animate-pulse rounded-lg border border-gray-200 bg-white" />
      </div>
    </div>
  );
}
