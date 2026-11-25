import { describe, it, expect, jest, beforeAll } from "@jest/globals"

// Prisma is replaced with a fake, so these tests check the queries that are sent, not the
// database. The repository is loaded AFTER the fake is registered (see
// savedProperty.service.test.ts for why).
const mockFindMany = jest.fn<(args: unknown) => Promise<unknown[]>>()
const mockCount = jest.fn<(args: unknown) => Promise<number>>()

let notificationRepository: typeof import("../repositories/notification.repository.js").notificationRepository

beforeAll(async () => {
  jest.doMock("../lib/prisma.js", () => ({
    prisma: {
      $transaction: (queries: Promise<unknown>[]) => Promise.all(queries),
      notification: {
        findMany: (args: unknown) => mockFindMany(args),
        count: (args: unknown) => mockCount(args),
      },
    },
  }))

  const loaded = await import("../repositories/notification.repository.js")
  notificationRepository = loaded.notificationRepository
})

// Only notifications about a listing and an open house that have an external id
const MATCHABLE = {
  property: { external_id: { not: null }, source: { not: null } },
  openHouse: { external_id: { not: null } },
}

describe("notificationRepository.listForUser", () => {
  it("asks for one page of the user's own notifications, newest first, with the property and the open house", async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)

    await notificationRepository.listForUser(7, 2, 10)

    expect(mockFindMany).toHaveBeenCalledTimes(1)
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { user_id: 7, ...MATCHABLE },
      include: { property: true, openHouse: true },
      orderBy: [{ created_at: "desc" }, { notification_id: "desc" }],
      skip: 10,
      take: 10,
    })
  })

  it("counts all of them and the unread ones with the same conditions", async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)

    await notificationRepository.listForUser(7, 1, 20)

    expect(mockCount).toHaveBeenCalledTimes(2)
    expect(mockCount).toHaveBeenNthCalledWith(1, { where: { user_id: 7, ...MATCHABLE } })
    expect(mockCount).toHaveBeenNthCalledWith(2, {
      where: { user_id: 7, ...MATCHABLE, is_read: false },
    })
  })

  it("returns the records, the total and the unread count", async () => {
    mockFindMany.mockResolvedValue([{ id: 1 }])
    mockCount.mockResolvedValueOnce(11).mockResolvedValueOnce(3)

    expect(await notificationRepository.listForUser(7, 1, 10)).toEqual({
      records: [{ id: 1 }],
      total: 11,
      unreadCount: 3,
    })
  })
})
