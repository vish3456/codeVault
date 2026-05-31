// apps/api/src/features/tags/tags.routes.ts

import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { validate, getValidatedBody } from "../../middleware/validate.js";
import {
  createTag,
  listTags,
  updateTag,
  deleteTag,
  attachTagsToProblem,
  detachTagFromProblem,
} from "./tags.service.js";
import {
  createTagBodySchema,
  updateTagBodySchema,
  attachTagsBodySchema,
  type CreateTagBody,
  type UpdateTagBody,
  type AttachTagsBody,
} from "./tags.schemas.js";

export const tagsRouter = Router();

tagsRouter.use(requireAuth);

// Tag CRUD
tagsRouter.post(
  "/",
  validate("body", createTagBodySchema),
  (req, res, next) => {
    const userId = req.auth!.userId;
    const body = getValidatedBody<CreateTagBody>(req);
    createTag(userId, body)
      .then((result) => {
        if (!result.ok) {
          res.status(400).json({ error: result.error.message });
          return;
        }
        res.status(201).json({ tag: result.value });
      })
      .catch(next);
  },
);

tagsRouter.get("/", (req, res, next) => {
  const userId = req.auth!.userId;
  listTags(userId)
    .then((result) => {
      if (!result.ok) {
        res.status(500).json({ error: result.error.message });
        return;
      }
      res.status(200).json({ tags: result.value });
    })
    .catch(next);
});

tagsRouter.patch(
  "/:id",
  validate("body", updateTagBodySchema),
  (req, res, next) => {
    const userId = req.auth!.userId;
    const tagId = req.params["id"] as string;
    const body = getValidatedBody<UpdateTagBody>(req);
    updateTag(userId, tagId, body)
      .then((result) => {
        if (!result.ok) {
          res.status(404).json({ error: result.error.message });
          return;
        }
        res.status(200).json({ tag: result.value });
      })
      .catch(next);
  },
);

tagsRouter.delete("/:id", (req, res, next) => {
  const userId = req.auth!.userId;
  const tagId = req.params["id"] as string;
  deleteTag(userId, tagId)
    .then((result) => {
      if (!result.ok) {
        res.status(404).json({ error: result.error.message });
        return;
      }
      res.status(204).send();
    })
    .catch(next);
});

// Problem-tag attachment
tagsRouter.post(
  "/problems/:problemId",
  validate("body", attachTagsBodySchema),
  (req, res, next) => {
    const problemId = req.params["problemId"] as string;
    const body = getValidatedBody<AttachTagsBody>(req);
    attachTagsToProblem(problemId, body.tagIds)
      .then((result) => {
        if (!result.ok) {
          res.status(400).json({ error: result.error.message });
          return;
        }
        res.status(200).json({ ok: true });
      })
      .catch(next);
  },
);

tagsRouter.delete("/problems/:problemId/:tagId", (req, res, next) => {
  const problemId = req.params["problemId"] as string;
  const tagId = req.params["tagId"] as string;
  detachTagFromProblem(problemId, tagId)
    .then((result) => {
      if (!result.ok) {
        res.status(404).json({ error: result.error.message });
        return;
      }
      res.status(204).send();
    })
    .catch(next);
});
