"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function Header() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  return (
    <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 pt-6 text-sm">
      <Link href="/reviews" className="font-medium text-foreground">
        AI Code Review Companion
      </Link>
      <div className="flex items-center gap-3 text-muted">
        <span>{session.user.email}</span>
        <button onClick={() => signOut({ callbackUrl: "/" })} className="hover:text-foreground">
          Sign out
        </button>
      </div>
    </header>
  );
}
