"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function Header() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  return (
    <header className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 pt-8 pb-6 text-sm sm:px-8">
      <Link
        href="/reviews"
        className="min-w-0 shrink truncate font-mono text-base font-semibold tracking-tight text-foreground sm:text-xl"
      >
        <span className="text-accent">AI</span> Code Review Companion
      </Link>
      <div className="flex shrink-0 items-center gap-3 text-muted">
        <span className="hidden truncate sm:inline">{session.user.email}</span>
        <button onClick={() => signOut({ callbackUrl: "/" })} className="shrink-0 hover:text-foreground">
          Sign out
        </button>
      </div>
    </header>
  );
}
