import { Router } from "express"
import { savedPropertyController } from "../controllers/savedProperty.controller.js"
import { requireAuth } from "../middleware/auth.middleware.js"
import { requireUser } from "../middleware/requireRole.middleware.js"

const router = Router()

/**
 * @swagger
 * /api/saved-properties:
 *   post:
 *     summary: Save a property
 *     description: >
 *       USER accounts only. The property is looked up through the active provider by
 *       externalId (never taken from the request body) and a snapshot is stored locally.
 *       Saving the same property again is not an error and returns the existing record.
 *     tags:
 *       - Saved Properties
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - externalId
 *             properties:
 *               externalId:
 *                 type: string
 *                 example: mock-1
 *     responses:
 *       201:
 *         description: Property saved
 *       200:
 *         description: Property was already saved; the existing record is returned
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Only USER accounts can save properties
 *       404:
 *         description: Property not found
 *   get:
 *     summary: List the saved properties of the current user
 *     description: >
 *       USER accounts only, newest first. Each property is checked against the active data
 *       source; listingStatus tells whether the data is fresh (AVAILABLE), the listing is gone
 *       (REMOVED) or could not be checked (UNKNOWN). The latter two show the stored snapshot.
 *       Only open houses that have not finished are returned.
 *     tags:
 *       - Saved Properties
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *     responses:
 *       200:
 *         description: Saved properties, returned as { savedProperties, total, page, pageSize }. Each saved property has a note ({ noteId, content, updatedAt }), or null when it has none
 *       400:
 *         description: Invalid page or pageSize
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Only USER accounts have saved properties
 */
router.post("/", requireAuth, requireUser, savedPropertyController.save)
router.get("/", requireAuth, requireUser, savedPropertyController.list)

/**
 * @swagger
 * /api/saved-properties/{savedPropertyId}:
 *   delete:
 *     summary: Remove a saved property
 *     description: >
 *       USER accounts only. Removes one of the current user's saved properties. A saved
 *       property that does not exist, or that belongs to another user, returns 404.
 *       The stored listing snapshot is kept because other users may have saved it too.
 *     tags:
 *       - Saved Properties
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: savedPropertyId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       204:
 *         description: Removed
 *       400:
 *         description: Invalid id
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Only USER accounts have saved properties
 *       404:
 *         description: Saved property not found
 */
router.delete("/:savedPropertyId", requireAuth, requireUser, savedPropertyController.remove)

export default router