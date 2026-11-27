import { Router } from "express"
import { trackedPropertyListController } from "../controllers/trackedPropertyList.controller.js"
import { requireAuth } from "../middleware/auth.middleware.js"
import { requireAgent } from "../middleware/requireRole.middleware.js"

const router = Router()

/**
 * @swagger
 * /api/agent/my-properties:
 *   get:
 *     summary: List the properties that the agent tracks
 *     description: >
 *       AGENT accounts only, newest first. Each property is the snapshot that was stored (the data
 *       source is not asked), with the number of users who saved it and the number of users who added
 *       one of its open houses to My Open Houses (all time, each user counted once), and its open houses
 *       that are still to come. Only numbers are returned: never a user, a note or any personal
 *       information. An account that has no agent profile yet answers 409.
 *     tags:
 *       - Agent
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
 *         description: Returned as { trackedProperties, total, page, pageSize }
 *       400:
 *         description: Invalid page or pageSize
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Only AGENT accounts have a watchlist
 *       409:
 *         description: The account has no agent profile yet
 */
router.get("/my-properties", requireAuth, requireAgent, trackedPropertyListController.list)

export default router
