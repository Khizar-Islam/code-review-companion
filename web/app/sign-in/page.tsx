"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

function SignInButton() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/reviews";

  return (
    <motion.button
      onClick={() => signIn("google", { callbackUrl })}
      whileHover={{ opacity: 0.9 }}
      whileTap={{ scale: 0.98 }}
      className="mt-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white"
    >
      Sign in with Google
    </motion.button>
  );
}

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Sign in</h1>
      <p className="max-w-sm text-sm text-muted">Sign in with Google to review pull requests and see your history.</p>

      <Suspense fallback={null}>
        <SignInButton />
      </Suspense>
    </main>
  );
}
