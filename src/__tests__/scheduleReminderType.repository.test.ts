import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals"
import {
  NOTIFICATION_BATCH_SIZE,
  OPEN_HOUSE_TODAY_TYPE,
} from "../constants/openHouseNotification.js"

// Prisma is replaced with a fake, so these tests check what is sent, not the database. The repository
// is loaded AFTER the fake is registered (see savedProperty.service.test.ts for why).
const mockCreateMany =
  jest.fn<(args: { data: { type: string }[]; skipDuplicates: boolean }) => Promise<{ count: number }>>()

let scheduleReminderRepository: typeof import("../repositories/scheduleReminder.repository.js").scheduleReminderRepository

beforeAll(async () => {
  jest.doMock("../lib/prisma.js", () => ({
    prisma: {
      notification: {
        createMany: (args: { data: { type: string }[]; skipDuplicates: boolean }) => mockCreateMany(args),
      },
    },
  }))

  const loaded = await import("../repositories/scheduleReminder.repository.js")
  scheduleReminderRepository = loaded.scheduleReminderRepository
})

beforeEach(() => {
  mockCreateMany.mockReset()
  mockCreateMany.mockImplementation(async ({ data }) => ({ count: data.length }))
})

const row = (userId: number) => ({
  user_id: userId,
  property_id: 3,
  openhouse_id: 10,
  message: "Open house today at 12 Example Street, Brisbane",
})

describe("scheduleReminderRepository.createReminders with a type", () => {
  it("writes the type that is asked for", async () => {
    await scheduleReminderRepository.createReminders([row(1), row(2)], OPEN_HOUSE_TODAY_TYPE)

    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [
        { ...row(1), type: OPEN_HOUSE_TODAY_TYPE },
        { ...row(2), type: OPEN_HOUSE_TODAY_TYPE },
      ],
      skipDuplicates: true,
    })
  })

  it("writes that type in every batch", async () => {
    const rows = Array.from({ length: NOTIFICATION_BATCH_SIZE + 1 }, (_value, index) => row(index + 1))

    await scheduleReminderRepository.createReminders(rows, OPEN_HOUSE_TODAY_TYPE)

    expect(mockCreateMany).toHaveBeenCalledTimes(2)
    const types = mockCreateMany.mock.calls.flatMap(([args]) => args.data.map((item) => item.type))
    expect(new Set(types)).toEqual(new Set([OPEN_HOUSE_TODAY_TYPE]))
    expect(types).toHaveLength(NOTIFICATION_BATCH_SIZE + 1)
  })
})
