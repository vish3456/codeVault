// apps/api/src/features/problems/problems.service.ts

import type { Prisma, UserProblem } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { ok, err, type Result } from "../../lib/result.js";
import type {
  CreateProblemBody,
  UpdateProblemBody,
  ListProblemsQuery,
} from "./problems.schemas.js";

export interface ProblemDTO {
  id: string;
  platformId: string;
  externalId: string;
  title: string;
  difficulty: string | null;
  url: string | null;
  createdAt: string;
  updatedAt: string;
  userProblem: {
    id: string;
    solveDate: string;
    language: string;
    attempts: number;
    rating: number;
  } | null;
  tags: Array<{ id: string; name: string; slug: string; color: string | null }>;
  platform: { id: string; name: string; slug: string };
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Creates a problem and records the user's solve.
 */
export async function createProblem(
  userId: string,
  body: CreateProblemBody,
): Promise<Result<ProblemDTO, Error>> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Upsert the problem (same platform+externalId = same problem)
      const problem = await tx.problem.upsert({
        where: {
          platformId_externalId: {
            platformId: body.platformId,
            externalId: body.externalId,
          },
        },
        create: {
          platformId: body.platformId,
          externalId: body.externalId,
          title: body.title,
          difficulty: body.difficulty ?? null,
          url: body.url ?? null,
        },
        update: {
          title: body.title,
          ...(body.difficulty !== undefined && { difficulty: body.difficulty }),
          ...(body.url !== undefined && { url: body.url }),
        },
        include: {
          platform: { select: { id: true, name: true, slug: true } },
        },
      });

      // Create user's solve record
      const userProblem = await tx.userProblem.upsert({
        where: {
          userId_problemId: { userId, problemId: problem.id },
        },
        create: {
          userId,
          problemId: problem.id,
          solveDate: body.solveDate ? new Date(body.solveDate) : new Date(),
          language: body.language,
          attempts: body.attempts,
          rating: body.rating,
        },
        update: {
          solveDate: body.solveDate ? new Date(body.solveDate) : new Date(),
          language: body.language,
          attempts: body.attempts,
          rating: body.rating,
        },
      });

      // Attach tags if provided
      if (body.tagIds && body.tagIds.length > 0) {
        await tx.problemTag.deleteMany({
          where: { problemId: problem.id },
        });
        await tx.problemTag.createMany({
          data: body.tagIds.map((tagId) => ({
            problemId: problem.id,
            tagId,
          })),
          skipDuplicates: true,
        });
      }

      // Fetch tags
      const problemTags = await tx.problemTag.findMany({
        where: { problemId: problem.id },
        include: {
          tag: { select: { id: true, name: true, slug: true, color: true } },
        },
      });

      return {
        id: problem.id,
        platformId: problem.platformId,
        externalId: problem.externalId,
        title: problem.title,
        difficulty: problem.difficulty,
        url: problem.url,
        createdAt: problem.createdAt.toISOString(),
        updatedAt: problem.updatedAt.toISOString(),
        userProblem: {
          id: userProblem.id,
          solveDate: userProblem.solveDate.toISOString(),
          language: userProblem.language,
          attempts: userProblem.attempts,
          rating: userProblem.rating,
        },
        tags: problemTags.map((pt) => pt.tag),
        platform: problem.platform,
      };
    });

    return ok(result);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Lists user's solved problems with pagination and filters.
 */
export async function listProblems(
  userId: string,
  query: ListProblemsQuery,
): Promise<Result<PaginatedResult<ProblemDTO>, Error>> {
  try {
    const where: Prisma.UserProblemWhereInput = {
      userId,
      ...(query.platformId && { problem: { platformId: query.platformId } }),
      ...(query.difficulty && { problem: { difficulty: query.difficulty } }),
      ...(query.tagId && {
        problem: {
          problemTags: { some: { tagId: query.tagId } },
        },
      }),
      ...(query.search && {
        problem: {
          title: { contains: query.search, mode: "insensitive" as const },
        },
      }),
    };

    const [userProblems, total] = await Promise.all([
      prisma.userProblem.findMany({
        where,
        include: {
          problem: {
            include: {
              platform: { select: { id: true, name: true, slug: true } },
              problemTags: {
                include: {
                  tag: {
                    select: { id: true, name: true, slug: true, color: true },
                  },
                },
              },
            },
          },
        },
        orderBy:
          query.sortBy === "solveDate"
            ? { solveDate: query.sortDir }
            : query.sortBy === "rating"
              ? { rating: query.sortDir }
              : query.sortBy === "title"
                ? { problem: { title: query.sortDir } }
                : { problem: { difficulty: query.sortDir } },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.userProblem.count({ where }),
    ]);

    const items: ProblemDTO[] = userProblems.map((up) => ({
      id: up.problem.id,
      platformId: up.problem.platformId,
      externalId: up.problem.externalId,
      title: up.problem.title,
      difficulty: up.problem.difficulty,
      url: up.problem.url,
      createdAt: up.problem.createdAt.toISOString(),
      updatedAt: up.problem.updatedAt.toISOString(),
      userProblem: {
        id: up.id,
        solveDate: up.solveDate.toISOString(),
        language: up.language,
        attempts: up.attempts,
        rating: up.rating,
      },
      tags: up.problem.problemTags.map((pt) => pt.tag),
      platform: up.problem.platform,
    }));

    return ok({
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Gets a single problem with full details.
 */
export async function getProblem(
  userId: string,
  problemId: string,
): Promise<Result<ProblemDTO | null, Error>> {
  try {
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        platform: { select: { id: true, name: true, slug: true } },
        userProblems: { where: { userId } },
        problemTags: {
          include: {
            tag: {
              select: { id: true, name: true, slug: true, color: true },
            },
          },
        },
        notes: { where: { userId }, orderBy: { createdAt: "desc" } },
        mistakes: { where: { userId }, orderBy: { createdAt: "desc" } },
      },
    });

    if (!problem) {
      return ok(null);
    }

    const userProblem = problem.userProblems[0] ?? null;

    return ok({
      id: problem.id,
      platformId: problem.platformId,
      externalId: problem.externalId,
      title: problem.title,
      difficulty: problem.difficulty,
      url: problem.url,
      createdAt: problem.createdAt.toISOString(),
      updatedAt: problem.updatedAt.toISOString(),
      userProblem: userProblem
        ? {
            id: userProblem.id,
            solveDate: userProblem.solveDate.toISOString(),
            language: userProblem.language,
            attempts: userProblem.attempts,
            rating: userProblem.rating,
          }
        : null,
      tags: problem.problemTags.map((pt) => pt.tag),
      platform: problem.platform,
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Updates a problem and/or the user's solve record.
 */
export async function updateProblem(
  userId: string,
  problemId: string,
  body: UpdateProblemBody,
): Promise<Result<ProblemDTO, Error>> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const problemUpdate: Prisma.ProblemUpdateInput = {};
      if (body.title !== undefined) problemUpdate.title = body.title;
      if (body.difficulty !== undefined) problemUpdate.difficulty = body.difficulty ?? null;
      if (body.url !== undefined) problemUpdate.url = body.url ?? null;

      const problem = await tx.problem.update({
        where: { id: problemId },
        data: problemUpdate,
        include: {
          platform: { select: { id: true, name: true, slug: true } },
          problemTags: {
            include: {
              tag: {
                select: { id: true, name: true, slug: true, color: true },
              },
            },
          },
        },
      });

      // Update user problem if language/rating/attempts changed
      const userProblemUpdate: Prisma.UserProblemUpdateInput = {};
      if (body.language !== undefined) userProblemUpdate.language = body.language;
      if (body.rating !== undefined) userProblemUpdate.rating = body.rating;
      if (body.attempts !== undefined) userProblemUpdate.attempts = body.attempts;

      let userProblem: UserProblem | null = null;
      if (Object.keys(userProblemUpdate).length > 0) {
        userProblem = await tx.userProblem.update({
          where: { userId_problemId: { userId, problemId } },
          data: userProblemUpdate,
        });
      } else {
        userProblem = await tx.userProblem.findUnique({
          where: { userId_problemId: { userId, problemId } },
        });
      }

      return {
        id: problem.id,
        platformId: problem.platformId,
        externalId: problem.externalId,
        title: problem.title,
        difficulty: problem.difficulty,
        url: problem.url,
        createdAt: problem.createdAt.toISOString(),
        updatedAt: problem.updatedAt.toISOString(),
        userProblem: userProblem
          ? {
              id: userProblem.id,
              solveDate: userProblem.solveDate.toISOString(),
              language: userProblem.language,
              attempts: userProblem.attempts,
              rating: userProblem.rating,
            }
          : null,
        tags: problem.problemTags.map((pt) => pt.tag),
        platform: problem.platform,
      };
    });

    return ok(result);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Deletes a user's solve record for a problem.
 */
export async function deleteProblem(
  userId: string,
  problemId: string,
): Promise<Result<void, Error>> {
  try {
    await prisma.userProblem.delete({
      where: { userId_problemId: { userId, problemId } },
    });
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
