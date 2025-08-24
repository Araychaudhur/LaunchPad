export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-slate-400">
        The page you’re looking for doesn’t exist.
      </p>
      <a
        className="mt-4 inline-flex rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
        href="/"
      >
        Go home
      </a>
    </main>
  );
}
