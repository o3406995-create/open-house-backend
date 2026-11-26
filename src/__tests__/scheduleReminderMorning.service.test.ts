import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals"

// The repository is replaced with a fake, so these tests never touch the database. The service is
// loaded AFTER the fake is registered (see savedProperty.service.test.ts for why). Unlike the fake of
// the evening tests, this one hands on the type too, so the type that is written is checked.
const mockFindDueCandidates = jest.fn<(from: Date, to: Date) => Promise<unknown>>()
const mockCreateReminders = jest.fn<(rows: unknown[], type: string) => Promise<number>>()

let scheduleReminderService: typeof import("../services/scheduleReminder.service.js").scheduleReminderService

beforeAll(async () => {
  jest.doMock("../repositories/scheduleReminder.repository.js", () => ({
    scheduleReminderRepository: {
      findDueCandidates: (from: Date, to: Date) => mockFindDueCandidates(from, to),
      createReminders: (rows: unknown[], type: string) => mockCreateReminders(rows, type),
    },
  }))

  const loaded = await import("../services/scheduleReminder.service.js")
  scheduleReminderService = loaded.scheduleReminderService
})

beforeEach(() => {
  jest.spyOn(console, "info").mockImplementation(() => undefined)
  mockFindDueCandidates.mockReset()
  mockCreateReminders.mockReset()
  mockCreateReminders.mockImplementation(async (rows) => rows.length)
})

const ADDRESS = "12 Example Street, Brisbane"

// Thursday 26 November in Brisbane. Today there ends at 2026-11-26T14:00Z.
const MORNING = new Date("2026-11-25T21:00:00.000Z") // 07:00
const BEFORE_SIX = new Date("2026-11-25T19:59:00.000Z") // 05:59
const SIX = new Date("2026-11-25T20:00:00.000Z") // 06:00
const EVENING = new Date("2026-11-26T09:00:00.000Z") // 19:00

const TODAY_10AM = "2026-11-26T00:00:00.000Z"
const TOMORROW_10AM = "2026-11-27T00:00:00.000Z"

function candidate(userId: number, openHouseId: number, startsAt: string, timeZone: string | null = null) {
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

const usersWritten = () => (mockCreateReminders.mock.calls[0]?.[0] as { user_id: number }[]).map((row) => row.user_id)

describe("scheduleReminderService.generateMorning", () => {
  it("writes the reminder of the morning with its own type and the address, without a time", async () => {
    mockFindDueCandidates.mockResolvedValue([candidate(1, 10, TODAY_10AM)])

    await scheduleReminderService.generateMorning(MORNING)

    expect(mockCreateReminders).toHaveBeenCalledWith(
      [{ user_id: 1, property_id: 3, openhouse_id: 10, message: "Open house today at 12 Example Street, Brisbane" }],
      "OPEN_HOUSE_TODAY",
    )
  })

  it("answers how many entries were looked at, were due and were written", async () => {
    mockFindDueCandidates.mockResolvedValue([candidate(1, 10, TODAY_10AM), candidate(2, 10, TOMORROW_10AM)])

    await expect(scheduleReminderService.generateMorning(MORNING)).resolves.toEqual({
      candidates: 2,
      due: 1,
      created: 1,
    })
  })

  it("does nothing before it is 06:00 on the clock of the user", async () => {
    mockFindDueCandidates.mockResolvedValue([candidate(1, 10, TODAY_10AM)])

    const result = await scheduleReminderService.generateMorning(BEFORE_SIX)

    expect(result.due).toBe(0)
    expect(mockCreateReminders).not.toHaveBeenCalled()
  })

  it("writes the reminder at 06:00 sharp", async () => {
    mockFindDueCandidates.mockResolvedValue([candidate(1, 10, TODAY_10AM)])

    const result = await scheduleReminderService.generateMorning(SIX)

    expect(result.due).toBe(1)
  })

  it("includes an open house later today", async () => {
    mockFindDueCandidates.mockResolvedValue([candidate(1, 10, "2026-11-26T07:00:00.000Z")])

    const result = await scheduleReminderService.generateMorning(MORNING)

    expect(result.due).toBe(1)
  })

  it("leaves out an open house that has started already", async () => {
    mockFindDueCandidates.mockResolvedValue([candidate(1, 10, "2026-11-25T20:30:00.000Z")])

    const result = await scheduleReminderService.generateMorning(MORNING)

    expect(result.due).toBe(0)
  })

  it("leaves out an open house tomorrow", async () => {
    mockFindDueCandidates.mockResolvedValue([candidate(1, 10, TOMORROW_10AM)])

    const result = await scheduleReminderService.generateMorning(MORNING)

    expect(result.due).toBe(0)
  })

  it("includes the last minute of today and leaves out the first moment of tomorrow", async () => {
    mockFindDueCandidates.mockResolvedValue([
      candidate(1, 10, "2026-11-26T13:59:00.000Z"),
      candidate(2, 11, "2026-11-26T14:00:00.000Z"),
    ])

    await scheduleReminderService.generateMorning(MORNING)

    expect(usersWritten()).toEqual([1])
  })

  it("works out today on the clock of each user", async () => {
    // 05:00Z on Thursday: 15:00 today in Brisbane, but tomorrow for a user in UTC (it is Wednesday 21:00 there)
    mockFindDueCandidates.mockResolvedValue([
      candidate(1, 10, "2026-11-26T05:00:00.000Z", "UTC"),
      candidate(2, 10, "2026-11-26T05:00:00.000Z", null),
    ])

    await scheduleReminderService.generateMorning(MORNING)

    expect(usersWritten()).toEqual([2])
  })

  it("does nothing for a user for whom it is not 06:00 yet", async () => {
    // 01:00 in Dubai (UTC+4), 07:00 in Brisbane
    mockFindDueCandidates.mockResolvedValue([
      candidate(1, 10, "2026-11-26T05:00:00.000Z", "Asia/Dubai"),
      candidate(2, 10, "2026-11-26T05:00:00.000Z", null),
    ])

    await scheduleReminderService.generateMorning(MORNING)

    expect(usersWritten()).toEqual([2])
  })

  it("passes a repository error on when looking for entries", async () => {
    mockFindDueCandidates.mockRejectedValue(new Error("database is down"))

    await expect(scheduleReminderService.generateMorning(MORNING)).rejects.toThrow("database is down")
  })

  it("passes a repository error on when writing", async () => {
    mockFindDueCandidates.mockResolvedValue([candidate(1, 10, TODAY_10AM)])
    mockCreateReminders.mockRejectedValue(new Error("database is down"))

    await expect(scheduleReminderService.generateMorning(MORNING)).rejects.toThrow("database is down")
  })
})

describe("scheduleReminderService.generate (the evening before)", () => {
  it("still writes its own type and its own message", async () => {
    mockFindDueCandidates.mockResolvedValue([candidate(1, 10, TOMORROW_10AM)])

    await scheduleReminderService.generate(EVENING)

    expect(mockCreateReminders).toHaveBeenCalledWith(
      [{ user_id: 1, property_id: 3, openhouse_id: 10, message: "Open house tomorrow at 12 Example Street, Brisbane" }],
      "OPEN_HOUSE_REMINDER",
    )
  })
})
