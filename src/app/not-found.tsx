import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <h1 className="font-display text-6xl font-semibold text-brass">404</h1>
      <p className="max-w-md text-smoke">
        This page doesn’t exist — or the salon isn’t live yet.
      </p>
      <Link href="/" className="btn-brass mt-2">
        Go home
      </Link>
    </main>
  );
}
