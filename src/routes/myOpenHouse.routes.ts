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
 *   get:
 *     summary: List My Open Houses
 *     description: >
 *       USER accounts only. The open houses the user added, grouped into today, upcoming,
 *       attended and expired. Today is the calendar day in the time zone given by timeZone
 *       (the browser's time zone; Australia/Brisbane when it is not sent). Attended is what the
 *       user confirmed; expired is an open house that has finished without being attended.
 *       Each entry carries the property snapshot stored when it was added; it is not checked
 *       against the data source again.
 *     tags:
 *       - My Open Houses
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: timeZone
 *         description: IANA time zone name (URL encoded)
 *         schema:
 *           type: string
 *           default: Australia/Brisbane
 *         example: Australia/Brisbane
 *     responses:
 *       200:
 *         description: Returned as { timeZone, counts, myOpenHouses } with the groups today, upcoming, attended and expired
 *       400:
 *         description: Unknown time zone
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Only USER accounts have My Open Houses
 */
router.post("/", requireAuth, requireUser, myOpenHouseController.add)
router.get("/", requireAuth, requireUser, myOpenHouseController.list)

export default router
