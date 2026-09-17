import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// All repo names, PR URLs, and diff content below are fabricated for demo
// purposes only — none of it is fetched from or represents real GitHub PRs.
//
// No blank lines appear within any hunk below: a bare blank context/insert
// line depends on trailing whitespace surviving string literals and file
// writes, which proved unreliable in practice (silently dropped) and threw
// off every line number after it. Diffs stay realistic without them.

const REVALIDATE_TS_PATCH = `@@ -33,7 +33,7 @@ export async function revalidateRoute(entityId: string, region: string) {
   const scope = resolveScope(entityId);
   try {
     await cache.acquireLock(entityId);
-    const key = buildCacheKey(entityId, region);
+    const key = buildCacheKey(entityId, region, scope);
     await cache.delete(key);
     logger.info(\`Invalidated cache for \${entityId} in \${region}\`);
   } catch (err) {
@@ -49,3 +49,12 @@ export async function revalidateRoute(entityId: string, region: string) {
   }
 }
+async function acquireLockWithRetry(key: string) {
+  let attempt = 0;
+  while (true) {
+    const acquired = await tryLock(key);
+    if (acquired) return;
+    attempt++;
+    await sleep(backoffMs(attempt));
+  }
+}
 export async function scheduleRevalidation() {`;

const READ_TS_PATCH = `@@ -14,4 +14,7 @@ export async function readFromCache(entityId: string, region: string) {
 export async function readFromCache(entityId: string, region: string) {
+  if (!entityId) {
+    throw new Error("entityId is required");
+  }
   return cache.get(buildCacheKey(entityId, region));
 }
 export function invalidateOnWrite(entityId: string) {
@@ -28,1 +28,5 @@ export function invalidateOnWrite(entityId: string) {
 }
+function resolveDefaultScope(explicit?: string) {
+  const fallback = getDefaultScope();
+  return explicit || fallback;
+}`;

const POOL_TS_PATCH = `@@ -14,2 +14,11 @@ import { logger } from "../logger";
 import { logger } from "../logger";
+export function createPool(config: PoolConfig) {
+  const pool = new Pool({
+    connectionString: config.connectionString,
+    max: config.maxConnections ?? 10,
+    idleTimeoutMillis: config.idleTimeoutMs ?? 30000,
+  });
+  logger.debug(\`Created pool with connection string: \${config.connectionString}\`);
+  return pool;
+}
@@ -43,1 +43,10 @@
 }
+function parseTimeoutValue(raw: string): number {
+  if (!raw) return DEFAULT_TIMEOUT_MS;
+  const match = raw.match(/^(\\d+)(ms|s)?$/);
+  if (!match) {
+    throw new Error(\`Invalid timeout value: \${raw}\`);
+  }
+  const [, value, unit] = match;
+  return unit === "s" ? Number(value) * 1000 : Number(value);
+}`;

async function main() {
  await prisma.finding.deleteMany();
  await prisma.reviewFile.deleteMany();
  await prisma.review.deleteMany();
  // Upsert (not delete+create) so the user id stays stable across reseeds —
  // the frontend has this id hardcoded (lib/constants.ts) until auth lands.
  const user = await prisma.user.upsert({
    where: { email: "khizarislamrathore@gmail.com" },
    update: {},
    create: {
      email: "khizarislamrathore@gmail.com",
      name: "Khizar Rathore",
    },
  });

  await prisma.review.create({
    data: {
      userId: user.id,
      prUrl: "https://github.com/northwind-labs/edge-platform/pull/482",
      prTitle: "Fix stale cache invalidation on route revalidation",
      repoName: "northwind-labs/edge-platform",
      status: "completed",
      overallSummary:
        "Solid fix for the revalidation race condition, but the new cache key helper isn't used consistently across the two files that build cache keys, which could reintroduce the bug in one path.",
      files: {
        create: [
          {
            filePath: "lib/cache/revalidate.ts",
            status: "modified",
            additions: 11,
            deletions: 1,
            patch: REVALIDATE_TS_PATCH,
          },
          {
            filePath: "lib/cache/read.ts",
            status: "modified",
            additions: 7,
            deletions: 0,
            patch: READ_TS_PATCH,
          },
        ],
      },
      findings: {
        create: [
          {
            filePath: "lib/cache/revalidate.ts",
            lineNumber: 36,
            severity: "critical",
            category: "cross-file",
            message:
              "buildCacheKey() was changed to take a 3rd 'scope' argument here, but lib/cache/read.ts:18 still calls it with 2 arguments — reads will silently use the wrong scope.",
          },
          {
            filePath: "lib/cache/revalidate.ts",
            lineNumber: 54,
            severity: "warning",
            category: "bug",
            message:
              "The retry loop has no upper bound — if the lock never releases this will spin indefinitely instead of failing fast.",
          },
          {
            filePath: "lib/cache/read.ts",
            lineNumber: 18,
            severity: "critical",
            category: "cross-file",
            message:
              "Call site not updated for the new buildCacheKey() signature — missing the 'scope' argument added in revalidate.ts.",
          },
          {
            filePath: "lib/cache/read.ts",
            lineNumber: 31,
            severity: "suggestion",
            category: "style",
            message:
              "Prefer the nullish coalescing operator here over `|| defaultScope` since an empty string scope is technically valid.",
          },
        ],
      },
    },
  });

  await prisma.review.create({
    data: {
      userId: user.id,
      prUrl: "https://github.com/atlas-systems/db-toolkit/pull/128",
      prTitle: "Add connection pool timeout config option",
      repoName: "atlas-systems/db-toolkit",
      status: "completed",
      overallSummary:
        "Clean, well-scoped change. One potential security concern around how the timeout value is logged, plus a minor performance nit in the config parser.",
      files: {
        create: [
          {
            filePath: "src/config/pool.ts",
            status: "modified",
            additions: 19,
            deletions: 0,
            patch: POOL_TS_PATCH,
          },
        ],
      },
      findings: {
        create: [
          {
            filePath: "src/config/pool.ts",
            lineNumber: 21,
            severity: "warning",
            category: "security",
            message:
              "The raw connection string (including credentials) is included in the debug log line here — should be redacted before logging.",
          },
          {
            filePath: "src/config/pool.ts",
            lineNumber: 46,
            severity: "suggestion",
            category: "performance",
            message:
              "parseTimeoutValue() re-compiles the same regex on every call — hoist it to a module-level constant.",
          },
        ],
      },
    },
  });

  await prisma.review.create({
    data: {
      userId: user.id,
      prUrl: "https://github.com/fieldnote/notes-app/pull/57",
      prTitle: "Refactor auth middleware to support multiple providers",
      repoName: "fieldnote/notes-app",
      status: "pending",
      overallSummary: null,
    },
  });

  console.log(`Seeded 1 user and 3 reviews for ${user.email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
