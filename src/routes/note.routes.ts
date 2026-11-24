import { Router } from "express"
import { noteController } from "../controllers/note.controller.js"
import { requireAuth } from "../middleware/auth.middleware.js"
import { requireUser } from "../middleware/requireRole.middleware.js"

const router = Router()

/**
 * @swagger
 * /api/notes:
 *   post:
 *     summary: Create a private note
 *     description: >
 *       USER accounts only. Writes a private note on one of the user's own saved properties or
 *       entries in My Open Houses: give exactly one of savedPropertyId and userOpenHouseId.
 *       Each saved property and each entry has at most one note, so a second note is a 409 (update
 *       the first one). Something that does not exist, or that belongs to another user, is a 404.
 *       The note is removed together with the saved property or the entry it belongs to.
 *     tags:
 *       - Notes
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               savedPropertyId:
 *                 type: integer
 *                 minimum: 1
 *               userOpenHouseId:
 *                 type: integer
 *                 minimum: 1
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *     responses:
 *       201:
 *         description: Note created, returned as { note }
 *       400:
 *         description: Validation failed (not exactly one target, or the content is empty or too long)
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Only USER accounts have notes
 *       404:
 *         description: Saved property or open house not found
 *       409:
 *         description: This item already has a note
 */
router.post("/", requireAuth, requireUser, noteController.create)

/**
 * @swagger
 * /api/notes/{noteId}:
 *   put:
 *     summary: Change the text of a note
 *     description: USER accounts only. A note that does not exist, or that belongs to another user, is a 404.
 *     tags:
 *       - Notes
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *     responses:
 *       200:
 *         description: Note updated, returned as { note }
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Only USER accounts have notes
 *       404:
 *         description: Note not found
 *   delete:
 *     summary: Delete a note
 *     description: USER accounts only. A note that does not exist, or that belongs to another user, is a 404.
 *     tags:
 *       - Notes
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       204:
 *         description: Deleted
 *       400:
 *         description: Invalid id
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Only USER accounts have notes
 *       404:
 *         description: Note not found
 */
router.put("/:noteId", requireAuth, requireUser, noteController.update)
router.delete("/:noteId", requireAuth, requireUser, noteController.remove)

export default router
