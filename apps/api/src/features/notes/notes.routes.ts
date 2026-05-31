// apps/api/src/features/notes/notes.routes.ts

import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate, getValidatedBody } from "../../middleware/validate.js";
import {
  createNote,
  deleteNote,
  getNote,
  listNotes,
  updateNote,
} from "./notes.service.js";
import {
  createNoteBodySchema,
  listNotesQuerySchema,
  updateNoteBodySchema,
  type CreateNoteBody,
  type UpdateNoteBody,
  type ListNotesQuery,
} from "./notes.schemas.js";

export const notesRouter = Router();

notesRouter.use(requireAuth);

notesRouter.post(
  "/",
  validate("body", createNoteBodySchema),
  (req, res, next) => {
    const userId = req.auth!.userId;
    const body = getValidatedBody<CreateNoteBody>(req);
    createNote(userId, body)
      .then((result) => {
        if (!result.ok) {
          res.status(400).json({ error: result.error.message });
          return;
        }
        res.status(201).json({ note: result.value });
      })
      .catch(next);
  },
);

notesRouter.get(
  "/",
  validate("query", listNotesQuerySchema),
  (req, res, next) => {
    const userId = req.auth!.userId;
    const query = req.validatedQuery as ListNotesQuery;
    listNotes(userId, query)
      .then((result) => {
        if (!result.ok) {
          res.status(500).json({ error: result.error.message });
          return;
        }
        res.status(200).json(result.value);
      })
      .catch(next);
  },
);

notesRouter.get("/:id", (req, res, next) => {
  const userId = req.auth!.userId;
  const noteId = req.params["id"] as string;
  getNote(userId, noteId)
    .then((result) => {
      if (!result.ok) {
        res.status(500).json({ error: result.error.message });
        return;
      }
      if (!result.value) {
        res.status(404).json({ error: "Note not found" });
        return;
      }
      res.status(200).json({ note: result.value });
    })
    .catch(next);
});

notesRouter.patch(
  "/:id",
  validate("body", updateNoteBodySchema),
  (req, res, next) => {
    const userId = req.auth!.userId;
    const noteId = req.params["id"] as string;
    const body = getValidatedBody<UpdateNoteBody>(req);
    updateNote(userId, noteId, body)
      .then((result) => {
        if (!result.ok) {
          res.status(404).json({ error: result.error.message });
          return;
        }
        res.status(200).json({ note: result.value });
      })
      .catch(next);
  },
);

notesRouter.delete("/:id", (req, res, next) => {
  const userId = req.auth!.userId;
  const noteId = req.params["id"] as string;
  deleteNote(userId, noteId)
    .then((result) => {
      if (!result.ok) {
        res.status(404).json({ error: result.error.message });
        return;
      }
      res.status(204).send();
    })
    .catch(next);
});
