import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-foreground">AI Code Review Companion</h1>
      <p className="max-w-md text-sm text-muted">
        The real landing page comes once the core app works end to end. For now, here&apos;s the
        review history.
      </p>
      <Link
        href="/reviews"
        className="mt-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        View review history
      </Link>
    </main>
  );
}
