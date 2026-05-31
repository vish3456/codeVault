// apps/api/src/features/notes/notes.service.ts

import { prisma } from "../../lib/prisma.js";
import { ok, err, type Result } from "../../lib/result.js";
import type {
  CreateNoteBody,
  UpdateNoteBody,
  ListNotesQuery,
} from "./notes.schemas.js";

export interface NoteDTO {
  id: string;
  title: string;
  content: string;
  problemId: string | null;
  problem: { id: string; title: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function toDTO(note: {
  id: string;
  title: string;
  content: string;
  problemId: string | null;
  problem?: { id: string; title: string } | null;
  createdAt: Date;
  updatedAt: Date;
}): NoteDTO {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    problemId: note.problemId,
    problem: note.problem ?? null,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

export async function createNote(
  userId: string,
  body: CreateNoteBody,
): Promise<Result<NoteDTO, Error>> {
  try {
    const note = await prisma.note.create({
      data: {
        userId,
        title: body.title,
        content: body.content,
        problemId: body.problemId ?? null,
      },
      include: {
        problem: { select: { id: true, title: true } },
      },
    });
    return ok(toDTO(note));
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function listNotes(
  userId: string,
  query: ListNotesQuery,
): Promise<Result<PaginatedResult<NoteDTO>, Error>> {
  try {
    const where = {
      userId,
      ...(query.problemId && { problemId: query.problemId }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: "insensitive" as const } },
          { content: { contains: query.search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where,
        include: {
          problem: { select: { id: true, title: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.note.count({ where }),
    ]);

    return ok({
      items: notes.map(toDTO),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getNote(
  userId: string,
  noteId: string,
): Promise<Result<NoteDTO | null, Error>> {
  try {
    const note = await prisma.note.findFirst({
      where: { id: noteId, userId },
      include: {
        problem: { select: { id: true, title: true } },
      },
    });
    return ok(note ? toDTO(note) : null);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function updateNote(
  userId: string,
  noteId: string,
  body: UpdateNoteBody,
): Promise<Result<NoteDTO, Error>> {
  try {
    const existing = await prisma.note.findFirst({
      where: { id: noteId, userId },
    });
    if (!existing) {
      return err(new Error("Note not found"));
    }
    const note = await prisma.note.update({
      where: { id: noteId },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.content !== undefined && { content: body.content }),
      },
      include: {
        problem: { select: { id: true, title: true } },
      },
    });
    return ok(toDTO(note));
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function deleteNote(
  userId: string,
  noteId: string,
): Promise<Result<void, Error>> {
  try {
    const existing = await prisma.note.findFirst({
      where: { id: noteId, userId },
    });
    if (!existing) {
      return err(new Error("Note not found"));
    }
    await prisma.note.delete({ where: { id: noteId } });
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
