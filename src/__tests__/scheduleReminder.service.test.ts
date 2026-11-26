import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals"
import { REMINDER_WINDOW_HOURS } from "../constants/openHouseNotification.js"

// The repository is replaced with a fake, so these tests never touch the database. The service is
// loaded AFTER the fake is registered (see savedProperty.service.test.ts for why).
const mockFindDueCandidates = jest.fn<(from: Date, to: Date) => Promise<unknown>>()
const mockCreateReminders = jest.fn<(rows: unknown[]) => Promise<number>>()

let scheduleReminderService: typeof import("../services/scheduleReminder.service.js").scheduleReminderService

beforeAll(async () => {
  jest.doMock("../repositories/scheduleReminder.repository.js", () => ({
    scheduleReminderRepository: {
      findDueCandidates: (from: Date, to: Date) => mockFindDueCandidates(from, to),
      createReminders: (rows: unknown[]) => mockCreateReminders(rows),
    },
  }))

  const loaded = await import("../services/scheduleReminder.service.js")
  scheduleReminderService = loaded.scheduleReminderService
})

beforeEach(() => {
  // The service writes one line each time it runs
  jest.spyOn(console, "info").mockImplementation(() => undefined)
  mockCreateReminders.mockImplementation(async (rows) => rows.length)
})

// 19:00 on Thursday in Brisbane (UTC+10, no daylight saving): tomorrow there is Friday, from
// 2026-11-26T14:00Z until 2026-11-27T14:00Z
const EVENING = new Date("2026-11-26T09:00:00.000Z")
const MORNING = new Date("2026-11-26T01:00:00.000Z")
const ADDRESS = "12 Example Street, Brisbane"

function candidate(
  userId: number,
  openHouseId: number,
  startsAt: string,
  timeZone: string | null = null,
) {
  return {
    user_id: userId,
    openhouse_id: openHouseId,
    user: { time_zone: timeZone },
    openHouse: {
      property_id: 3,
      start_datetime: new Date(startsAt),
      property: { address: ADDRESS },
    },
  }
}

const TOMORROW_10AM = "2026-11-27T00:00:00.000Z"

describe("scheduleReminderService.generate", () => {
  it("asks for the entries that start within the window", async () => {
    mockFindDueCandidates.mockResolvedValue([])

    await scheduleReminderService.generate(EVENING)

    expect(mockFindDueCandidates).toHaveBeenCalledWith(
      EVENING,
      new Date(EVENING.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000),
    )
  })

  it("writes nothing when there is nothing to remind of", async () => {
    mockFindDueCandidates.mockResolvedValue([])

    const result = await scheduleReminderService.generate(EVENING)

    expect(result).toEqual({ candidates: 0, due: 0, created: 0 })
    expect(mockCreateReminders).not.toHaveBeenCalled()
  })

  it("reminds of an open house tomorrow once it is evening, with the address and no time", async () => {
    mockFindDueCandidates.mockResolvedValue([candidate(1, 10, TOMORROW_10AM)])

    const result = await scheduleReminderService.generate(EVENING)

    expect(result).toEqual({ candidates: 1, due: 1, created: 1 })
    expect(mockCreateReminders).toHaveBeenCalledWith([
      {
        user_id: 1,
        property_id: 3,
        openhouse_id: 10,
        message: "Open house tomorrow at 12 Example Street, Brisbane",
      },
    ])
  })

  it("does not remind before it is evening", async () => {
    mockFindDueCandidates.mockResolvedValue([candidate(1, 10, TOMORROW_10AM)])

    const result = await scheduleReminderService.generate(MORNING)

    expect(result).toEqual({ candidates: 1, due: 0, created: 0 })
    expect(mockCreateReminders).not.toHaveBeenCalled()
  })

  it("does not remind of an open house that is later today", async () => {
    mockFindDueCandidates.mockResolvedValue([candidate(1, 10, "2026-11-26T12:00:00.000Z")])

    const result = await scheduleReminderService.generate(EVENING)

    expect(result.due).toBe(0)
  })

  it("does not remind of an open house the day after tomorrow", async () => {
    mockFindDueCandidates.mockResolvedValue([candidate(1, 10, "2026-11-27T20:00:00.000Z")])

    const result = await scheduleReminderService.generate(EVENING)

    expect(result.due).toBe(0)
  })

  it("includes the first moment of tomorrow and leaves out the first moment of the day after", async () => {
    mockFindDueCandidates.mockResolvedValue([
      candidate(1, 10, "2026-11-26T14:00:00.000Z"),
      candidate(2, 11, "2026-11-27T14:00:00.000Z"),
    ])

    await scheduleReminderService.generate(EVENING)

    const rows = mockCreateReminders.mock.calls[0]?.[0] as { user_id: number }[]
    expect(rows.map((row) => row.user_id)).toEqual([1])
  })

  it("works out tomorrow on the clock of each user", async () => {
    // 00:30 on Friday in Sydney (UTC+11), still 23:30 on Thursday in Brisbane. It is 20:00 in Sydney.
    const startsAt = "2026-11-26T13:30:00.000Z"
    mockFindDueCandidates.mockResolvedValue([
      candidate(1, 10, startsAt, "Australia/Sydney"),
      candidate(2, 10, startsAt, null),
    ])

    await scheduleReminderService.generate(EVENING)

    const rows = mockCreateReminders.mock.calls[0]?.[0] as { user_id: number }[]
    expect(rows.map((row) => row.user_id)).toEqual([1])
  })

  it("does not remind a user for whom it is not evening yet", async () => {
    // It is 09:00 in UTC, and 19:00 in Brisbane
    mockFindDueCandidates.mockResolvedValue([
      candidate(1, 10, "2026-11-27T10:00:00.000Z", "UTC"),
      candidate(2, 11, TOMORROW_10AM, null),
    ])

    await scheduleReminderService.generate(EVENING)

    const rows = mockCreateReminders.mock.calls[0]?.[0] as { user_id: number }[]
    expect(rows.map((row) => row.user_id)).toEqual([2])
  })

  it("uses the default time zone when the stored one is not a time zone", async () => {
    mockFindDueCandidates.mockResolvedValue([candidate(1, 10, TOMORROW_10AM, "Mars/Olympus")])

    const result = await scheduleReminderService.generate(EVENING)

    expect(result.due).toBe(1)
  })

  it("writes one reminder for every user and open house that is due", async () => {
    mockFindDueCandidates.mockResolvedValue([
      candidate(1, 10, TOMORROW_10AM),
      candidate(1, 11, "2026-11-27T05:00:00.000Z"),
      candidate(2, 10, TOMORROW_10AM),
    ])

    await scheduleReminderService.generate(EVENING)

    const rows = mockCreateReminders.mock.calls[0]?.[0] as { user_id: number; openhouse_id: number }[]
    expect(rows.map((row) => [row.user_id, row.openhouse_id])).toEqual([
      [1, 10],
      [1, 11],
      [2, 10],
    ])
  })

  it("answers how many were written, which can be fewer than were due", async () => {
    mockFindDueCandidates.mockResolvedValue([candidate(1, 10, TOMORROW_10AM), candidate(2, 10, TOMORROW_10AM)])
    mockCreateReminders.mockResolvedValue(1)

    const result = await scheduleReminderService.generate(EVENING)

    expect(result).toEqual({ candidates: 2, due: 2, created: 1 })
  })

  it("passes a repository error on when looking for entries", async () => {
    mockFindDueCandidates.mockRejectedValue(new Error("database is down"))

    await expect(scheduleReminderService.generate(EVENING)).rejects.toThrow("database is down")
  })

  it("passes a repository error on when writing", async () => {
    mockFindDueCandidates.mockResolvedValue([candidate(1, 10, TOMORROW_10AM)])
    mockCreateReminders.mockRejectedValue(new Error("database is down"))

    await expect(scheduleReminderService.generate(EVENING)).rejects.toThrow("database is down")
  })
})
