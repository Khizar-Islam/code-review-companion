// Shared markup for the product headline, reused at three points on the
// landing page (opening hero, closing CTA restatement, and the non-3D
// fallback's hero) so the typography treatment — bold weight, tight
// tracking, mono/accent highlight on "real review" — stays in one place
// rather than drifting across copies.
export function Headline({ as: Tag = "h2", className = "" }: { as?: "h1" | "h2"; className?: string }) {
  return (
    <Tag className={`text-3xl font-bold tracking-tight text-foreground sm:text-4xl ${className}`}>
      Paste a link. Get a <span className="font-mono text-accent">real review</span>.
    </Tag>
  );
}
