import Link from "next/link";
import Spotlight from "@/components/Spotlight";
import Parallax from "@/components/Parallax";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background layer — moves slower (2-layer parallax) */}
      <Parallax speed={0.3} className="absolute inset-0">
        <div className="placeholder-photo absolute inset-0 opacity-80" />
        {/* vanity-bulb dots */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-10 flex justify-center gap-6 sm:gap-10"
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 rounded-full bg-brass/70 shadow-[0_0_18px_rgba(201,162,75,0.8)]"
            />
          ))}
        </div>
      </Parallax>

      <Spotlight />

      {/* Foreground layer */}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-4 py-20 text-center">
        <p className="reveal reveal-1 text-xs font-semibold uppercase tracking-[0.3em] text-brass">
          Walk in ready
        </p>
        <h1 className="reveal reveal-2 mt-4 font-display text-5xl font-semibold leading-tight sm:text-7xl">
          AppEase
        </h1>
        <p className="reveal reveal-3 mt-4 max-w-md text-base text-smoke sm:text-lg">
          Find a salon. Pick your stylist. Book a real slot — synced with the
          chair, not a phone call.
        </p>
        <div className="reveal reveal-4 mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link href="/signup" className="btn-brass w-full sm:w-auto">
            Get started
          </Link>
          <Link href="/login" className="btn-ghost w-full sm:w-auto">
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
