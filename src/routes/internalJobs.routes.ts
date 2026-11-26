import { Router } from "express"
import { jobsController } from "../controllers/jobs.controller.js"
import { requireJobSecret } from "../middleware/jobSecret.middleware.js"

const router = Router()

/**
 * @swagger
 * /api/internal/jobs/schedule-reminders:
 *   post:
 *     summary: Write the reminders for the open houses of tomorrow and of today (scheduler only)
 *     description: >
 *       Called by a scheduler every hour, not by a user. It needs the secret in the x-job-secret header.
 *       Without a JOB_SECRET on the server the path answers 404. On the clock of each user it writes
 *       one OPEN_HOUSE_REMINDER for every open house they added that starts tomorrow, once it is 18:00
 *       or later, and one OPEN_HOUSE_TODAY for every one that starts later the same day, once it is
 *       06:00 or later. Running it again writes nothing twice.
 *     tags:
 *       - Internal
 *     security:
 *       - jobSecret: []
 *     responses:
 *       200:
 *         description: Returned as { evening, morning }, each with { candidates, due, created }
 *       401:
 *         description: Wrong or missing secret
 *       404:
 *         description: The jobs are switched off (no JOB_SECRET on the server)
 */
router.post("/schedule-reminders", requireJobSecret, jobsController.scheduleReminders)

export default router
