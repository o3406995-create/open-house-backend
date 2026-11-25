import { describe, it, expect, jest, beforeAll } from "@jest/globals"
import { NOTIFICATION_ERROR_NOT_FOUND } from "../constants/notification.js"

// The repository is replaced with a fake, so these tests never touch the database. The service
// is loaded AFTER the fake is registered (see savedProperty.service.test.ts for why).
const mockFindForUser = jest.fn<(userId: number, id: number) => Promise<unknown>>()
const mockMarkRead = jest.fn<(userId: number, id: number) => Promise<number>>()

let notificationService: typeof import("../services/notification.service.js").notificationService

beforeAll(async () => {
  jest.doMock("../repositories/notification.repository.js", () => ({
    notificationRepository: {
      listForUser: () => Promise.reject(new Error("not used by these tests")),
      findForUser: (userId: number, id: number) => mockFindForUser(userId, id),
      markRead: (userId: number, id: number) => mockMarkRead(userId, id),
    },
  }))

  const loaded = await import("../services/notification.service.js")
  notificationService = loaded.notificationService
})

function record(id: number, { read = false, source = "mock" } = {}) {
  return {
    notification_id: id,
    type: "NEW_OPEN_HOUSE",
    message: "Message " + id,
    is_read: read,
    created_at: new Date("2026-11-24T00:00:00.000Z"),
    property: {
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
    },
    openHouse: {
      external_id: "mock-1-1",
      start_datetime: new Date("2026-11-26T05:00:00.000Z"),
      end_datetime: new Date("2026-11-26T05:30:00.000Z"),
      status: "SCHEDULED",
    },
  }
}

describe("notificationService.markRead", () => {
  it("marks an unread notification as read and answers with it as listed, now read", async () => {
    mockFindForUser.mockResolvedValue(record(4))
    mockMarkRead.mockResolvedValue(1)

    const item = await notificationService.markRead(7, 4)

    expect(item).toMatchObject({ notificationId: 4, isRead: true, message: "Message 4" })
    expect(mockFindForUser).toHaveBeenCalledWith(7, 4)
    expect(mockMarkRead).toHaveBeenCalledTimes(1)
    expect(mockMarkRead).toHaveBeenCalledWith(7, 4)
  })

  it("answers the same for a notification that is read already, and writes nothing", async () => {
    mockFindForUser.mockResolvedValue(record(4, { read: true }))

    const item = await notificationService.markRead(7, 4)

    expect(item).toMatchObject({ notificationId: 4, isRead: true })
    expect(mockMarkRead).not.toHaveBeenCalled()
  })

  it("answers 404 when it does not exist or is not the user's, and writes nothing", async () => {
    mockFindForUser.mockResolvedValue(null)

    await expect(notificationService.markRead(7, 4)).rejects.toMatchObject({ statusCode: 404 })
    await expect(notificationService.markRead(7, 4)).rejects.toThrow(NOTIFICATION_ERROR_NOT_FOUND)
    expect(mockMarkRead).not.toHaveBeenCalled()
  })

  it("answers 404 when it cannot be shown in the list, and writes nothing", async () => {
    mockFindForUser.mockResolvedValue(record(4, { source: "other" }))

    await expect(notificationService.markRead(7, 4)).rejects.toMatchObject({ statusCode: 404 })
    expect(mockMarkRead).not.toHaveBeenCalled()
  })

  it("passes a repository error on when looking it up", async () => {
    mockFindForUser.mockRejectedValue(new Error("database is down"))

    await expect(notificationService.markRead(7, 4)).rejects.toThrow("database is down")
  })

  it("passes a repository error on when writing", async () => {
    mockFindForUser.mockResolvedValue(record(4))
    mockMarkRead.mockRejectedValue(new Error("database is down"))

    await expect(notificationService.markRead(7, 4)).rejects.toThrow("database is down")
  })
})
