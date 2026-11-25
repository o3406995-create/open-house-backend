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
 *         description: Returned as { timeZone, counts, myOpenHouses } with the groups today, upcoming, attended and expired. Each entry has a note ({ noteId, content, updatedAt }), or null when it has none
 *       400:
 *         description: Unknown time zone
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Only USER accounts have My Open Houses
 */
router.post("/", requireAuth, requireUser, myOpenHouseController.add)
router.get("/", requireAuth, requireUser, myOpenHouseController.list)

/**
 * @swagger
 * /api/my-open-houses/{myOpenHouseId}:
 *   delete:
 *     summary: Remove an open house from My Open Houses
 *     description: >
 *       USER accounts only. Removes one of the current user's entries. An entry that does not
 *       exist, or that belongs to another user, returns 404. The stored open house and property
 *       are kept because other users may have added them too.
 *     tags:
 *       - My Open Houses
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: myOpenHouseId
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
 *         description: Only USER accounts have My Open Houses
 *       404:
 *         description: My open house not found
 */
router.delete("/:myOpenHouseId", requireAuth, requireUser, myOpenHouseController.remove)

/**
 * @swagger
 * /api/my-open-houses/{myOpenHouseId}/attended:
 *   patch:
 *     summary: Confirm that the user attended an open house
 *     description: >
 *       USER accounts only. Marks one of the current user's entries as attended. It is allowed
 *       once the open house has started, also after it has finished; before that the answer is
 *       409. Marking an entry that is already attended is not an error and returns it again.
 *       An entry that does not exist, or that belongs to another user, returns 404.
 *     tags:
 *       - My Open Houses
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: myOpenHouseId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     responses:
 *       200:
 *         description: Returned as { myOpenHouse } with the entry as it is listed under attended, including its note
 *       400:
 *         description: Invalid id
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Only USER accounts have My Open Houses
 *       404:
 *         description: My open house not found
 *       409:
 *         description: The open house has not started yet
 */
router.patch(
  "/:myOpenHouseId/attended",
  requireAuth,
  requireUser,
  myOpenHouseController.markAttended,
)

export default router
