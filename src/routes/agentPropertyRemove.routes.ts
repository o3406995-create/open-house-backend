import { Router } from "express"
import { trackedPropertyRemoveController } from "../controllers/trackedPropertyRemove.controller.js"
import { requireAuth } from "../middleware/auth.middleware.js"
import { requireAgent } from "../middleware/requireRole.middleware.js"

const router = Router()

/**
 * @swagger
 * /api/agent/my-properties/{trackedId}:
 *   delete:
 *     summary: Stop tracking a property
 *     description: >
 *       AGENT accounts only. Removes one property from the watchlist of the agent. Only the row of the
 *       watchlist is removed: the property and its open houses are not changed. A row that does not
 *       exist and a row of another agent answer the same 404, so ids cannot be probed. An account that
 *       has no agent profile yet answers 409.
 *     tags:
 *       - Agent
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: trackedId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       204:
 *         description: Removed
 *       400:
 *         description: Invalid trackedId
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Only AGENT accounts have a watchlist
 *       404:
 *         description: Tracked property not found
 *       409:
 *         description: The account has no agent profile yet
 */
router.delete("/my-properties/:trackedId", requireAuth, requireAgent, trackedPropertyRemoveController.remove)

export default router
