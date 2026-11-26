import {
  scheduleReminderRepository,
  type NewReminderRow,
} from "../repositories/scheduleReminder.repository.js"
import { isValidTimeZone, localHour, startOfNextDay } from "../helper/timeZone.js"
import { DEFAULT_TIME_ZONE } from "../constants/myOpenHouse.js"
import {
  OPEN_HOUSE_REMINDER_TYPE,
  OPEN_HOUSE_TODAY_TYPE,
  REMINDER_FROM_HOUR,
  REMINDER_MORNING_FROM_HOUR,
  REMINDER_WINDOW_HOURS,
  reminderMessage,
  todayMessage,
  type ReminderType,
} from "../constants/openHouseNotification.js"

const HOUR_MS = 60 * 60 * 1000

interface Day {
  from: Date
  to: Date
}

// One kind of reminder: the type it is written as, what it says, and the part of the day of a user
// that it is about (null while it is not time for it yet on the clock of the user)
interface Kind {
  type: ReminderType
  message: (address: string) => string
  dayFor: (now: Date, timeZone: string) => Day | null
}

// Tomorrow on the clock of a time zone, or null while it is not evening there yet
function tomorrowIfEvening(now: Date, timeZone: string): Day | null {
  if (localHour(now, timeZone) < REMINDER_FROM_HOUR) return null

  const from = startOfNextDay(now, timeZone)
  return { from, to: startOfNextDay(from, timeZone) }
}

// What is left of today on the clock of a time zone once it is morning there, or null before. An
// open house that has started already is not part of it.
function todayIfMorning(now: Date, timeZone: string): Day | null {
  if (localHour(now, timeZone) < REMINDER_MORNING_FROM_HOUR) return null

  return { from: now, to: startOfNextDay(now, timeZone) }
}

const EVENING: Kind = {
  type: OPEN_HOUSE_REMINDER_TYPE,
  message: reminderMessage,
  dayFor: tomorrowIfEvening,
}

const MORNING: Kind = {
  type: OPEN_HOUSE_TODAY_TYPE,
  message: todayMessage,
  dayFor: todayIfMorning,
}

// Writes a reminder for every open house that a user added and that falls in the part of the day
// of the kind, on the user's own clock. A user without a stored time zone (or with one that is not
// known) is on the default one. It can run as often as it likes: a reminder is never written
// twice. Nothing here touches what a user has added to My Open Houses.
async function run(kind: Kind, now: Date) {
  const candidates = await scheduleReminderRepository.findDueCandidates(
    now,
    new Date(now.getTime() + REMINDER_WINDOW_HOURS * HOUR_MS),
  )

  // Worked out once per time zone, not once per entry
  const days = new Map<string, Day | null>()
  const dayFor = (stored: string | null): Day | null => {
    const timeZone = stored !== null && isValidTimeZone(stored) ? stored : DEFAULT_TIME_ZONE
    if (!days.has(timeZone)) days.set(timeZone, kind.dayFor(now, timeZone))
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
      message: kind.message(candidate.openHouse.property.address),
    })
  }

  const created =
    rows.length === 0 ? 0 : await scheduleReminderRepository.createReminders(rows, kind.type)
  const result = { candidates: candidates.length, due: rows.length, created }

  console.info("schedule reminders", JSON.stringify({ type: kind.type, ...result }))
  return result
}

export const scheduleReminderService = {
  // The reminder the evening before: open houses that start tomorrow
  generate: (now: Date = new Date()) => run(EVENING, now),

  // The reminder on the morning of the day: open houses that start later today
  generateMorning: (now: Date = new Date()) => run(MORNING, now),
}
