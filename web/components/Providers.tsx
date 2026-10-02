"use client";

import { SessionProvider } from "next-auth/react";
import { LayoutGroup } from "framer-motion";

// LayoutGroup scopes Framer Motion's layoutId matching across separate
// component trees (a history card unmounting on one route, a summary card
// mounting on another) so the shared-element morph between them still works
// across a route change, not just within a single render tree.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LayoutGroup>{children}</LayoutGroup>
    </SessionProvider>
  );
}
