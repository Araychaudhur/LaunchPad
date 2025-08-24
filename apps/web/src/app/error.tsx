"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="p-6">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        {error?.digest && (
          <p className="text-slate-400">Digest: {error.digest}</p>
        )}
        <button
          onClick={() => reset()}
          className="mt-4 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
