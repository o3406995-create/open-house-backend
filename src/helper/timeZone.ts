const FORMAT_LOCALE = "en-US"
const MILLISECONDS_PER_SECOND = 1000

export function isValidTimeZone(timeZone: string): boolean {
  try {
    // An unknown zone makes the constructor throw a RangeError
    new Intl.DateTimeFormat(FORMAT_LOCALE, { timeZone })
    return true
  } catch {
    return false
  }
}

interface WallClock {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

// The date and time on the wall clock of a time zone at one instant
function wallClock(instant: Date, timeZone: string): WallClock {
  const parts = new Intl.DateTimeFormat(FORMAT_LOCALE, {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(instant)

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  }
}

// How far the wall clock of the zone is ahead of UTC at that instant, in milliseconds
function offsetMs(instant: Date, timeZone: string): number {
  const clock = wallClock(instant, timeZone)
  const wallClockAsUtc = Date.UTC(
    clock.year,
    clock.month - 1,
    clock.day,
    clock.hour,
    clock.minute,
    clock.second,
  )
  const wholeSeconds = Math.floor(instant.getTime() / MILLISECONDS_PER_SECOND) * MILLISECONDS_PER_SECOND
  return wallClockAsUtc - wholeSeconds
}

// The instant at which the next calendar day starts in the time zone. A day is not always
// 24 hours long (daylight saving), so the offset of the zone is looked up at the instant
// itself instead of adding a fixed number of hours.
export function startOfNextDay(now: Date, timeZone: string): Date {
  const today = wallClock(now, timeZone)

  // Midnight at the start of the next day, as if the zone were UTC
  const midnightAsUtc = Date.UTC(today.year, today.month - 1, today.day + 1)

  // The offset can differ between that guess and the real instant when the clocks change
  // in between, so it is applied twice
  const firstGuess = midnightAsUtc - offsetMs(new Date(midnightAsUtc), timeZone)
  return new Date(midnightAsUtc - offsetMs(new Date(firstGuess), timeZone))
}

// The hour (0 to 23) on the wall clock of a time zone at one instant
export function localHour(instant: Date, timeZone: string): number {
  return wallClock(instant, timeZone).hour
}
