import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative isolate flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden px-6 py-24 text-center sm:px-8">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-80"
        aria-hidden="true"
      >
        <div className="hero-bg h-full w-full" />
      </div>
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 rounded-3xl border border-border/80 bg-white/90 p-10 shadow-xl backdrop-blur md:p-14">
        <span className="inline-flex items-center justify-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
          Lost in the arena
        </span>
        <div className="space-y-5">
          <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
            The play you&apos;re looking for isn&apos;t on the board
          </h1>
          <p className="text-base leading-7 text-gray-600 sm:text-lg">
            We couldn&apos;t find the page you requested. Double-check the URL
            or head back to the home page to explore our AI-powered sports
            career tools.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-primary/40"
          >
            Return home
          </Link>
          <Link
            href="/#tools"
            className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/85 px-6 py-3 text-sm font-semibold text-gray-700 backdrop-blur transition-colors duration-200 hover:text-gray-900"
          >
            Browse tools
          </Link>
        </div>
      </div>
      <div
        className="pointer-events-none absolute left-1/2 top-12 -z-10 h-56 w-152 -translate-x-1/2 rounded-full bg-linear-to-r from-primary/35 via-primary/15 to-transparent blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-6 left-1/2 -z-10 h-72 w-2xl -translate-x-1/2 rounded-full bg-linear-to-tr from-primary/25 via-purple-300/30 to-transparent blur-3xl"
        aria-hidden="true"
      />
    </div>
  );
}
