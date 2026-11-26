import type { Request, Response, NextFunction } from "express"
import { scheduleReminderService } from "../services/scheduleReminder.service.js"

export const jobsController = {
  scheduleReminders: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await scheduleReminderService.generate()
      return res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  },
}
