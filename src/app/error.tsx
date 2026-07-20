"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">
        Something went wrong
      </h1>
      <p className="max-w-md text-sm text-smoke">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <button onClick={reset} className="btn-brass mt-2">
        Try again
      </button>
    </main>
  );
}
