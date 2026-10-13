/** Shown during Next.js route transitions. No artificial loading delay. */
export default function Loading() {
  return (
    <main className="en-route-loading mx-auto w-full max-w-6xl px-4 py-9 sm:px-6" role="status" aria-label="Loading page">
      <div className="en-skeleton mb-7 h-9 w-48 rounded-2xl" />
      <div className="en-skeleton mb-5 h-44 w-full rounded-[30px]" />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="en-skeleton h-44 rounded-[26px]" />
        <div className="en-skeleton h-44 rounded-[26px]" />
      </div>
      <span className="sr-only">Loading EduNexus content…</span>
    </main>
  );
}
