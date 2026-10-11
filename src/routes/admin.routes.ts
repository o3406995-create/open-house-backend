import { Router } from "express"
import { adminController } from "../controllers/admin.controller.js"
import { requireAuth } from "../middleware/auth.middleware.js"
import { requireAdmin } from "../middleware/requireRole.middleware.js"

const router = Router()

/**
 * @swagger
 * /api/admin/agents:
 *   post:
 *     summary: Create a new AGENT account
 *     description: Admin-only. This is the only way to create an AGENT account; public registration always assigns USER.
 *     tags:
 *       - Admin
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       "201":
 *         description: Agent account created successfully
 *       "400":
 *         description: Validation failed
 *       "401":
 *         description: Not authenticated
 *       "403":
 *         description: Not an admin
 *       "409":
 *         description: Email already registered
 */
router.post("/agents", requireAuth, requireAdmin, adminController.createAgent)

export default router