import { describe, it, expect, jest, beforeAll } from "@jest/globals"

// The repository is replaced with a fake, so these tests never touch the database. The service
// is loaded AFTER the fake is registered (see savedProperty.service.test.ts for why).
const mockListForUser =
  jest.fn<(userId: number, page: number, pageSize: number) => Promise<unknown>>()

let notificationService: typeof import("../services/notification.service.js").notificationService

beforeAll(async () => {
  jest.doMock("../repositories/notification.repository.js", () => ({
    notificationRepository: {
      listForUser: (userId: number, page: number, pageSize: number) =>
        mockListForUser(userId, page, pageSize),
    },
  }))

  const loaded = await import("../services/notification.service.js")
  notificationService = loaded.notificationService
})

function snapshot(source: string) {
  return {
    external_id: "mock-1",
    source,
    address: "12 Example Street, Brisbane",
    suburb: "Brisbane",
    state: "QLD",
    postcode: "4000",
    price: 650000,
    display_price: "$650,000",
    bedrooms: 3,
    bathrooms: 2,
    property_type: "House",
    latitude: -27.4698,
    longitude: 153.0251,
  }
}

function record(id: number, source = "mock") {
  return {
    notification_id: id,
    type: "NEW_OPEN_HOUSE",
    message: "Message " + id,
    is_read: false,
    created_at: new Date("2026-11-24T00:00:00.000Z"),
    property: snapshot(source),
    openHouse: {
      external_id: "mock-1-1",
      start_datetime: new Date("2026-11-26T05:00:00.000Z"),
      end_datetime: new Date("2026-11-26T05:30:00.000Z"),
      status: "SCHEDULED",
    },
  }
}

const PAGE = { page: 2, pageSize: 10 }

describe("notificationService.list", () => {
  it("describes each notification and carries the counts and the page", async () => {
    mockListForUser.mockResolvedValue({ records: [record(1), record(2)], total: 12, unreadCount: 5 })

    const result = await notificationService.list(7, PAGE)

    expect(result).toMatchObject({ total: 12, unreadCount: 5, page: 2, pageSize: 10 })
    expect(result.notifications.map((item) => item.notificationId)).toEqual([1, 2])
    expect(result.notifications[0]).toMatchObject({ message: "Message 1", isRead: false })
  })

  it("asks for the page of the user", async () => {
    mockListForUser.mockResolvedValue({ records: [], total: 0, unreadCount: 0 })

    await notificationService.list(7, PAGE)

    expect(mockListForUser).toHaveBeenCalledWith(7, 2, 10)
  })

  it("leaves out a notification that cannot be matched to a listing", async () => {
    mockListForUser.mockResolvedValue({
      records: [record(1), record(2, "other"), record(3)],
      total: 3,
      unreadCount: 3,
    })

    const { notifications } = await notificationService.list(7, PAGE)

    expect(notifications.map((item) => item.notificationId)).toEqual([1, 3])
  })

  it("answers an empty list", async () => {
    mockListForUser.mockResolvedValue({ records: [], total: 0, unreadCount: 0 })

    expect(await notificationService.list(7, PAGE)).toEqual({
      notifications: [],
      total: 0,
      unreadCount: 0,
      page: 2,
      pageSize: 10,
    })
  })
})
