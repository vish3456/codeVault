// apps/api/src/features/mistakes/mistakes.service.ts

import { prisma } from "../../lib/prisma.js";
import { ok, err, type Result } from "../../lib/result.js";
import type {
  CreateMistakeBody,
  ListMistakesQuery,
} from "./mistakes.schemas.js";

export interface MistakeDTO {
  id: string;
  description: string;
  category: string;
  problemId: string | null;
  problem: { id: string; title: string } | null;
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function createMistake(
  userId: string,
  body: CreateMistakeBody,
): Promise<Result<MistakeDTO, Error>> {
  try {
    const mistake = await prisma.mistake.create({
      data: {
        userId,
        description: body.description,
        category: body.category,
        problemId: body.problemId ?? null,
        userProblemId: body.userProblemId ?? null,
      },
      include: {
        problem: { select: { id: true, title: true } },
      },
    });
    return ok({
      id: mistake.id,
      description: mistake.description,
      category: mistake.category,
      problemId: mistake.problemId,
      problem: mistake.problem,
      createdAt: mistake.createdAt.toISOString(),
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function listMistakes(
  userId: string,
  query: ListMistakesQuery,
): Promise<Result<PaginatedResult<MistakeDTO>, Error>> {
  try {
    const where = {
      userId,
      ...(query.category && { category: query.category }),
      ...(query.problemId && { problemId: query.problemId }),
    };

    const [mistakes, total] = await Promise.all([
      prisma.mistake.findMany({
        where,
        include: {
          problem: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.mistake.count({ where }),
    ]);

    return ok({
      items: mistakes.map((m) => ({
        id: m.id,
        description: m.description,
        category: m.category,
        problemId: m.problemId,
        problem: m.problem,
        createdAt: m.createdAt.toISOString(),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function deleteMistake(
  userId: string,
  mistakeId: string,
): Promise<Result<void, Error>> {
  try {
    const existing = await prisma.mistake.findFirst({
      where: { id: mistakeId, userId },
    });
    if (!existing) {
      return err(new Error("Mistake not found"));
    }
    await prisma.mistake.delete({ where: { id: mistakeId } });
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
