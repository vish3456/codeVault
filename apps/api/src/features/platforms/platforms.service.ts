// apps/api/src/features/platforms/platforms.service.ts

import { prisma } from "../../lib/prisma.js";
import { ok, err, type Result } from "../../lib/result.js";

const DEFAULT_PLATFORMS = [
  { name: "LeetCode", slug: "leetcode", baseUrl: "https://leetcode.com" },
  { name: "Codeforces", slug: "codeforces", baseUrl: "https://codeforces.com" },
  { name: "CodeChef", slug: "codechef", baseUrl: "https://www.codechef.com" },
  { name: "AtCoder", slug: "atcoder", baseUrl: "https://atcoder.jp" },
  { name: "HackerRank", slug: "hackerrank", baseUrl: "https://www.hackerrank.com" },
  { name: "Other", slug: "other", baseUrl: null },
] as const;

export interface PlatformDTO {
  id: string;
  name: string;
  slug: string;
  baseUrl: string | null;
}

/**
 * Seeds default platforms if the table is empty.
 */
export async function seedPlatforms(): Promise<void> {
  const count = await prisma.platform.count();
  if (count > 0) return;

  await prisma.platform.createMany({
    data: DEFAULT_PLATFORMS.map((p) => ({
      name: p.name,
      slug: p.slug,
      baseUrl: p.baseUrl,
    })),
    skipDuplicates: true,
  });

  console.info("[codevault-api] Seeded default platforms");
}

/**
 * Returns all platforms.
 */
export async function listPlatforms(): Promise<Result<PlatformDTO[], Error>> {
  try {
    const platforms = await prisma.platform.findMany({
      orderBy: { name: "asc" },
    });
    return ok(platforms);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
