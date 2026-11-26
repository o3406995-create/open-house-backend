import { Router } from "express"
import { jobsController } from "../controllers/jobs.controller.js"
import { requireJobSecret } from "../middleware/jobSecret.middleware.js"

const router = Router()

/**
 * @swagger
 * /api/internal/jobs/schedule-reminders:
 *   post:
 *     summary: Write the reminders for the open houses that start tomorrow (scheduler only)
 *     description: >
 *       Called by a scheduler every hour, not by a user. It needs the secret in the x-job-secret header.
 *       Without a JOB_SECRET on the server the path answers 404. For every user whose clock is past
 *       18:00 it writes one OPEN_HOUSE_REMINDER for each open house they added that starts tomorrow
 *       on their own clock. Running it again writes nothing twice.
 *     tags:
 *       - Internal
 *     security:
 *       - jobSecret: []
 *     responses:
 *       200:
 *         description: Returned as { candidates, due, created }
 *       401:
 *         description: Wrong or missing secret
 *       404:
 *         description: The jobs are switched off (no JOB_SECRET on the server)
 */
router.post("/schedule-reminders", requireJobSecret, jobsController.scheduleReminders)

export default router
