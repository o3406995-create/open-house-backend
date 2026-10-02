import { Router } from "express"
import { authController } from "../controllers/auth.controller.js"
import { requireAuth } from "../middleware/auth.middleware.js"

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

export default router