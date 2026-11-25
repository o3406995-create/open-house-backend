import { Router } from "express"
import { notificationController } from "../controllers/notification.controller.js"
import { requireAuth } from "../middleware/auth.middleware.js"
import { requireUser } from "../middleware/requireRole.middleware.js"

const router = Router()

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: List the notifications of the current user
 *     description: >
 *       USER accounts only, newest first. Each notification names the property and the open
 *       house it is about, taken from the snapshot stored in the database (no data source is
 *       called). total and unreadCount only count notifications that can be matched to a
 *       listing, and unreadCount covers all pages.
 *     tags:
 *       - Notifications
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
 *         description: Notifications, returned as { notifications, total, unreadCount, page, pageSize }
 *       400:
 *         description: Invalid page or pageSize
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Only USER accounts have notifications
 */
router.get("/", requireAuth, requireUser, notificationController.list)

export default router
