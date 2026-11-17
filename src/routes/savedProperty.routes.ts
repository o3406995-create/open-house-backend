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
 */
router.post("/", requireAuth, requireUser, savedPropertyController.save)

export default router