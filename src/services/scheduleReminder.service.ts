import {
  scheduleReminderRepository,
  type NewReminderRow,
} from "../repositories/scheduleReminder.repository.js"
import { isValidTimeZone, localHour, startOfNextDay } from "../helper/timeZone.js"
import { DEFAULT_TIME_ZONE } from "../constants/myOpenHouse.js"
import {
  REMINDER_FROM_HOUR,
  REMINDER_WINDOW_HOURS,
  reminderMessage,
} from "../constants/openHouseNotification.js"

const HOUR_MS = 60 * 60 * 1000

interface Day {
  from: Date
  to: Date
}

// Tomorrow on the clock of a time zone, or null while it is not evening there yet
function tomorrowIfEvening(now: Date, timeZone: string): Day | null {
  if (localHour(now, timeZone) < REMINDER_FROM_HOUR) return null

  const from = startOfNextDay(now, timeZone)
  return { from, to: startOfNextDay(from, timeZone) }
}

export const scheduleReminderService = {
  // Writes a reminder for every open house that a user added and that starts tomorrow on the user's
  // own clock, once it is evening there. A user without a stored time zone (or with one that is not
  // known) is on the default one. It can run as often as it likes: a reminder is never written
  // twice. Nothing here touches what a user has added to My Open Houses.
  generate: async (now: Date = new Date()) => {
    const candidates = await scheduleReminderRepository.findDueCandidates(
      now,
      new Date(now.getTime() + REMINDER_WINDOW_HOURS * HOUR_MS),
    )

    // Worked out once per time zone, not once per entry
    const days = new Map<string, Day | null>()
    const dayFor = (stored: string | null): Day | null => {
      const timeZone = stored !== null && isValidTimeZone(stored) ? stored : DEFAULT_TIME_ZONE
      if (!days.has(timeZone)) days.set(timeZone, tomorrowIfEvening(now, timeZone))
      return days.get(timeZone) ?? null
    }

    const rows: NewReminderRow[] = []

    for (const candidate of candidates) {
      const day = dayFor(candidate.user.time_zone)
      if (!day) continue

      const startsAt = candidate.openHouse.start_datetime.getTime()
      if (startsAt < day.from.getTime() || startsAt >= day.to.getTime()) continue

      rows.push({
        user_id: candidate.user_id,
        property_id: candidate.openHouse.property_id,
        openhouse_id: candidate.openhouse_id,
        message: reminderMessage(candidate.openHouse.property.address),
      })
    }

    const created = rows.length === 0 ? 0 : await scheduleReminderRepository.createReminders(rows)
    const result = { candidates: candidates.length, due: rows.length, created }

    console.info("schedule reminders", JSON.stringify(result))
    return result
  },
}
