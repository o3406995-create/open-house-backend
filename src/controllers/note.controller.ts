import type { Response, NextFunction } from "express"
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js"
import { noteService } from "../services/note.service.js"
import {
  createNoteSchema,
  noteIdParamSchema,
  updateNoteSchema,
} from "../validators/note.validator.js"
import { VALIDATION_ERROR_MESSAGE } from "../constants/property.js"

export const noteController = {
  create: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = createNoteSchema.safeParse(req.body)

      if (!parsed.success) {
        return res.status(400).json({
          message: VALIDATION_ERROR_MESSAGE,
          errors: parsed.error.flatten().fieldErrors,
        })
      }

      const note = await noteService.create(Number(req.userId), parsed.data)
      return res.status(201).json({ note })
    } catch (err) {
      next(err)
    }
  },

  update: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const params = noteIdParamSchema.safeParse(req.params)

      if (!params.success) {
        return res.status(400).json({
          message: VALIDATION_ERROR_MESSAGE,
          errors: params.error.flatten().fieldErrors,
        })
      }

      const body = updateNoteSchema.safeParse(req.body)

      if (!body.success) {
        return res.status(400).json({
          message: VALIDATION_ERROR_MESSAGE,
          errors: body.error.flatten().fieldErrors,
        })
      }

      const note = await noteService.update(Number(req.userId), params.data.noteId, body.data.content)
      return res.status(200).json({ note })
    } catch (err) {
      next(err)
    }
  },

  remove: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = noteIdParamSchema.safeParse(req.params)

      if (!parsed.success) {
        return res.status(400).json({
          message: VALIDATION_ERROR_MESSAGE,
          errors: parsed.error.flatten().fieldErrors,
        })
      }

      await noteService.remove(Number(req.userId), parsed.data.noteId)
      return res.status(204).send()
    } catch (err) {
      next(err)
    }
  },
}
