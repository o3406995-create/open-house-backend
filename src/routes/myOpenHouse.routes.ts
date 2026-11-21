import { Router } from "express"
import { myOpenHouseController } from "../controllers/myOpenHouse.controller.js"
import { requireAuth } from "../middleware/auth.middleware.js"
import { requireUser } from "../middleware/requireRole.middleware.js"

const router = Router()

/**
 * @swagger
 * /api/my-open-houses:
 *   post:
 *     summary: Add an open house to My Open Houses
 *     description: >
 *       USER accounts only. The property and its open houses are looked up through the active
 *       provider (never taken from the request body) and a snapshot is stored locally. Adding
 *       the same open house again is not an error and returns the existing entry.
 *     tags:
 *       - My Open Houses
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - propertyExternalId
 *               - openHouseExternalId
 *             properties:
 *               propertyExternalId:
 *                 type: string
 *                 example: mock-1
 *               openHouseExternalId:
 *                 type: string
 *                 example: mock-1-1
 *     responses:
 *       201:
 *         description: Open house added
 *       200:
 *         description: Open house was already in My Open Houses; the existing entry is returned
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Only USER accounts have My Open Houses
 *       404:
 *         description: Property not found, or the open house does not belong to it
 *       409:
 *         description: The open house was cancelled or has already finished
 */
router.post("/", requireAuth, requireUser, myOpenHouseController.add)

export default router
