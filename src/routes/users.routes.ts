import { Router } from "express"
import { authController } from "../controllers/auth.controller.js"
import { requireAuth } from "../middleware/auth.middleware.js"
import { userTimeZoneController } from "../controllers/userTimeZone.controller.js"

const router = Router()

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get the currently authenticated user
 *     description: Returns the current user based on the JWT stored in the HttpOnly "token" cookie.
 *     tags:
 *       - Users
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user returned successfully
 *       401:
 *         description: Not authenticated or session expired
 *       404:
 *         description: User not found
 */
router.get(
  "/me",
  requireAuth,
  authController.getCurrentUser,
)

/**
 * @swagger
 * /api/users/me/time-zone:
 *   put:
 *     summary: Store the time zone of the current user
 *     description: >
 *       Any logged-in account. The browser sends its own IANA time zone name, so that what happens
 *       without a request (the reminder the evening before an open house) is worked out on the user's
 *       own clock. GET /api/users/me returns it as time_zone, null until it was stored.
 *     tags:
 *       - Users
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - timeZone
 *             properties:
 *               timeZone:
 *                 type: string
 *                 maxLength: 64
 *                 example: Australia/Brisbane
 *     responses:
 *       200:
 *         description: Stored, returned as { timeZone }
 *       400:
 *         description: Not a time zone name that the server knows
 *       401:
 *         description: Not authenticated
 */
router.put("/me/time-zone", requireAuth, userTimeZoneController.set)

export default router