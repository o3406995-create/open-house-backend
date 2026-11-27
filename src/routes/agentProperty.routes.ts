import { Router } from "express"
import { agentPropertyController } from "../controllers/agentProperty.controller.js"
import { requireAuth } from "../middleware/auth.middleware.js"
import { requireAgent } from "../middleware/requireRole.middleware.js"

const router = Router()

/**
 * @swagger
 * /api/agent/my-properties:
 *   post:
 *     summary: Track a property for analytics
 *     description: >
 *       AGENT accounts only. Adds any property that a search can find to the watchlist of the agent;
 *       it does not have to be the agent's own. The property is looked up through the active provider
 *       by externalId (never taken from the request body) and a snapshot is stored locally. Tracking
 *       the same property again is not an error and returns the existing record. An account that has
 *       no agent profile yet answers 409.
 *     tags:
 *       - Agent
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
 *         description: Property tracked. Returned as { trackedProperty }
 *       200:
 *         description: The agent tracked it already; the existing record is returned
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Only AGENT accounts can track properties
 *       404:
 *         description: Property not found
 *       409:
 *         description: The account has no agent profile yet
 */
router.post("/my-properties", requireAuth, requireAgent, agentPropertyController.add)

export default router
