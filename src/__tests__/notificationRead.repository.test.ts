import { describe, it, expect, jest, beforeAll } from "@jest/globals"

// Prisma is replaced with a fake, so these tests check the queries that are sent, not the
// database. The repository is loaded AFTER the fake is registered (see
// savedProperty.service.test.ts for why).
const mockFindFirst = jest.fn<(args: unknown) => Promise<unknown>>()
const mockUpdateMany = jest.fn<(args: unknown) => Promise<{ count: number }>>()
// This would skip the user condition, so it must never be used
const mockUpdate = jest.fn<(args: unknown) => Promise<unknown>>()

let notificationRepository: typeof import("../repositories/notification.repository.js").notificationRepository

beforeAll(async () => {
  jest.doMock("../lib/prisma.js", () => ({
    prisma: {
      notification: {
        findFirst: (args: unknown) => mockFindFirst(args),
        updateMany: (args: unknown) => mockUpdateMany(args),
        update: (args: unknown) => mockUpdate(args),
      },
    },
  }))

  const loaded = await import("../repositories/notification.repository.js")
  notificationRepository = loaded.notificationRepository
})

const MATCHABLE = {
  property: { external_id: { not: null }, source: { not: null } },
  openHouse: { external_id: { not: null } },
}

describe("notificationRepository.findForUser", () => {
  it("only looks at the notification with that id that belongs to the user and can be shown", async () => {
    mockFindFirst.mockResolvedValue(null)

    await notificationRepository.findForUser(7, 4)

    expect(mockFindFirst).toHaveBeenCalledTimes(1)
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { notification_id: 4, user_id: 7, ...MATCHABLE },
      include: { property: true, openHouse: true },
    })
  })
})

describe("notificationRepository.markRead", () => {
  it("changes only the unread notification with that id that belongs to the user, in one statement", async () => {
    mockUpdateMany.mockResolvedValue({ count: 1 })

    await notificationRepository.markRead(7, 4)

    expect(mockUpdateMany).toHaveBeenCalledTimes(1)
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { notification_id: 4, user_id: 7, is_read: false },
      data: { is_read: true },
    })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it("returns how many rows were changed", async () => {
    mockUpdateMany.mockResolvedValueOnce({ count: 1 })
    expect(await notificationRepository.markRead(7, 4)).toBe(1)

    mockUpdateMany.mockResolvedValueOnce({ count: 0 })
    expect(await notificationRepository.markRead(7, 4)).toBe(0)
  })
})
