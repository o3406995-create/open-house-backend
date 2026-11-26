import { describe, it, expect, jest, beforeAll } from "@jest/globals"
import {
  NOTIFICATION_BATCH_SIZE,
  OPEN_HOUSE_REMINDER_TYPE,
} from "../constants/openHouseNotification.js"

// Prisma is replaced with a fake, so these tests check the queries that are sent, not the database.
// The repository is loaded AFTER the fake is registered (see savedProperty.service.test.ts for why).
const mockFindMany = jest.fn<(args: unknown) => Promise<unknown[]>>()
const mockCreateMany =
  jest.fn<(args: { data: unknown[]; skipDuplicates: boolean }) => Promise<{ count: number }>>()
// What a user has added to My Open Houses: the job must never write to it
const mockEntryWrite = jest.fn<(args: unknown) => Promise<unknown>>()

let scheduleReminderRepository: typeof import("../repositories/scheduleReminder.repository.js").scheduleReminderRepository

beforeAll(async () => {
  jest.doMock("../lib/prisma.js", () => ({
    prisma: {
      userOpenHouse: {
        findMany: (args: unknown) => mockFindMany(args),
        create: (args: unknown) => mockEntryWrite(args),
        createMany: (args: unknown) => mockEntryWrite(args),
        update: (args: unknown) => mockEntryWrite(args),
        updateMany: (args: unknown) => mockEntryWrite(args),
        upsert: (args: unknown) => mockEntryWrite(args),
        delete: (args: unknown) => mockEntryWrite(args),
        deleteMany: (args: unknown) => mockEntryWrite(args),
      },
      notification: { createMany: (args: { data: unknown[]; skipDuplicates: boolean }) => mockCreateMany(args) },
    },
  }))

  const loaded = await import("../repositories/scheduleReminder.repository.js")
  scheduleReminderRepository = loaded.scheduleReminderRepository
})

const FROM = new Date("2026-11-26T09:00:00.000Z")
const TO = new Date("2026-11-28T11:00:00.000Z")

const row = (userId: number) => ({
  user_id: userId,
  property_id: 3,
  openhouse_id: 10,
  message: "Open house tomorrow at 12 Example Street, Brisbane",
})

describe("scheduleReminderRepository.findDueCandidates", () => {
  it("asks only for entries that are upcoming, of users who are not deleted and are USER accounts, for open houses that are scheduled, start in the window and can be shown", async () => {
    mockFindMany.mockResolvedValue([])

    await scheduleReminderRepository.findDueCandidates(FROM, TO)

    expect(mockFindMany).toHaveBeenCalledTimes(1)
    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        status: "UPCOMING",
        user: { is_deleted: false, role: "USER" },
        openHouse: {
          status: "SCHEDULED",
          external_id: { not: null },
          start_datetime: { gte: FROM, lt: TO },
          property: { external_id: { not: null }, source: { not: null } },
        },
      },
      select: {
        user_id: true,
        openhouse_id: true,
        user: { select: { time_zone: true } },
        openHouse: {
          select: {
            property_id: true,
            start_datetime: true,
            property: { select: { address: true } },
          },
        },
      },
    })
  })

  it("returns what was found", async () => {
    mockFindMany.mockResolvedValue([{ user_id: 1 }])

    await expect(scheduleReminderRepository.findDueCandidates(FROM, TO)).resolves.toEqual([
      { user_id: 1 },
    ])
  })
})

describe("scheduleReminderRepository.createReminders", () => {
  it("writes the reminders with their type and skips one that exists already", async () => {
    mockCreateMany.mockResolvedValue({ count: 2 })

    await scheduleReminderRepository.createReminders([row(1), row(2)])

    expect(mockCreateMany).toHaveBeenCalledTimes(1)
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [
        { ...row(1), type: OPEN_HOUSE_REMINDER_TYPE },
        { ...row(2), type: OPEN_HOUSE_REMINDER_TYPE },
      ],
      skipDuplicates: true,
    })
  })

  it("writes in batches and adds up how many were written", async () => {
    mockCreateMany.mockImplementation(async ({ data }) => ({ count: data.length }))
    const rows = Array.from({ length: NOTIFICATION_BATCH_SIZE + 1 }, (_value, index) => row(index + 1))

    const created = await scheduleReminderRepository.createReminders(rows)

    const sizes = mockCreateMany.mock.calls.map(([args]) => args.data.length)
    expect(sizes).toEqual([NOTIFICATION_BATCH_SIZE, 1])
    expect(created).toBe(NOTIFICATION_BATCH_SIZE + 1)
  })

  it("writes nothing for no reminders", async () => {
    mockCreateMany.mockClear()

    const created = await scheduleReminderRepository.createReminders([])

    expect(created).toBe(0)
    expect(mockCreateMany).not.toHaveBeenCalled()
  })

  it("answers how many were written, which can be fewer than were asked for", async () => {
    mockCreateMany.mockResolvedValue({ count: 1 })

    await expect(scheduleReminderRepository.createReminders([row(1), row(2)])).resolves.toBe(1)
  })

  it("never writes to what a user has added to My Open Houses", async () => {
    mockCreateMany.mockResolvedValue({ count: 1 })

    await scheduleReminderRepository.createReminders([row(1)])

    expect(mockEntryWrite).not.toHaveBeenCalled()
  })
})
