// apps/api/src/features/tags/tags.service.ts

import { prisma } from "../../lib/prisma.js";
import { ok, err, type Result } from "../../lib/result.js";
import type { CreateTagBody, UpdateTagBody } from "./tags.schemas.js";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface TagDTO {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  createdAt: string;
}

export async function createTag(
  userId: string,
  body: CreateTagBody,
): Promise<Result<TagDTO, Error>> {
  try {
    const slug = slugify(body.name);
    const tag = await prisma.tag.create({
      data: {
        userId,
        name: body.name,
        slug,
        color: body.color ?? null,
      },
    });
    return ok({ ...tag, createdAt: tag.createdAt.toISOString() });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function listTags(
  userId: string,
): Promise<Result<TagDTO[], Error>> {
  try {
    const tags = await prisma.tag.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });
    return ok(tags.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })));
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function updateTag(
  userId: string,
  tagId: string,
  body: UpdateTagBody,
): Promise<Result<TagDTO, Error>> {
  try {
    const existing = await prisma.tag.findFirst({
      where: { id: tagId, userId },
    });
    if (!existing) {
      return err(new Error("Tag not found"));
    }

    const data: { name?: string; slug?: string; color?: string | null } = {};
    if (body.name !== undefined) {
      data.name = body.name;
      data.slug = slugify(body.name);
    }
    if (body.color !== undefined) {
      data.color = body.color ?? null;
    }

    const tag = await prisma.tag.update({
      where: { id: tagId },
      data,
    });
    return ok({ ...tag, createdAt: tag.createdAt.toISOString() });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function deleteTag(
  userId: string,
  tagId: string,
): Promise<Result<void, Error>> {
  try {
    const existing = await prisma.tag.findFirst({
      where: { id: tagId, userId },
    });
    if (!existing) {
      return err(new Error("Tag not found"));
    }
    await prisma.tag.delete({ where: { id: tagId } });
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function attachTagsToProblem(
  problemId: string,
  tagIds: string[],
): Promise<Result<void, Error>> {
  try {
    await prisma.problemTag.createMany({
      data: tagIds.map((tagId) => ({ problemId, tagId })),
      skipDuplicates: true,
    });
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function detachTagFromProblem(
  problemId: string,
  tagId: string,
): Promise<Result<void, Error>> {
  try {
    await prisma.problemTag.delete({
      where: { problemId_tagId: { problemId, tagId } },
    });
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
