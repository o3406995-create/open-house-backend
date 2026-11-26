import type { Request, Response, NextFunction } from "express"
import { scheduleReminderService } from "../services/scheduleReminder.service.js"

export const jobsController = {
  // Both reminders are asked for even when one of them fails, so a problem with one does not hold the
  // other back. A failure of either still answers with an error, so the scheduler sees it, and
  // running both again is safe: a reminder is never written twice.
  scheduleReminders: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [evening, morning] = await Promise.allSettled([
        scheduleReminderService.generate(),
        scheduleReminderService.generateMorning(),
      ])

      if (evening.status === "rejected") throw evening.reason
      if (morning.status === "rejected") throw morning.reason

      return res.status(200).json({ evening: evening.value, morning: morning.value })
    } catch (err) {
      next(err)
    }
  },
}
