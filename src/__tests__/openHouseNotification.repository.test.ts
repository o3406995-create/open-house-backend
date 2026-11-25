import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals"
import {
  NEW_OPEN_HOUSE_TYPE,
  NOTIFICATION_BATCH_SIZE,
} from "../constants/openHouseNotification.js"

// Prisma is replaced with a fake, so these tests check the queries that are sent, not the
// database. The repository is loaded AFTER the fake is registered (see
// savedProperty.service.test.ts for why). Everything but findSeen has to go through the
// transaction: the fake transaction is a different object from the top level one.
const mockFindUnique = jest.fn<(args: unknown) => Promise<unknown>>()
const mockPropertyUpdate = jest.fn<(args: unknown) => Promise<unknown>>()
const mockOpenHouseCreateMany = jest.fn<(args: unknown) => Promise<{ count: number }>>()
const mockOpenHouseFindMany = jest.fn<(args: unknown) => Promise<unknown[]>>()
const mockSavedFindMany = jest.fn<(args: unknown) => Promise<unknown[]>>()
const mockNotificationCreateMany =
  jest.fn<(args: { data: unknown[]; skipDuplicates: boolean }) => Promise<{ count: number }>>()
// What a user has added to My Open Houses: this must never be touched
const mockUserOpenHouse = jest.fn<(args: unknown) => Promise<unknown>>()

let openHouseNotificationRepository: typeof import("../repositories/openHouseNotification.repository.js").openHouseNotificationRepository

beforeAll(async () => {
  const transaction = {
    property: { update: (args: unknown) => mockPropertyUpdate(args) },
    openHouse: {
      createMany: (args: unknown) => mockOpenHouseCreateMany(args),
      findMany: (args: unknown) => mockOpenHouseFindMany(args),
    },
    savedProperty: { findMany: (args: unknown) => mockSavedFindMany(args) },
    notification: {
      createMany: (args: { data: unknown[]; skipDuplicates: boolean }) =>
        mockNotificationCreateMany(args),
    },
    userOpenHouse: {
      create: (args: unknown) => mockUserOpenHouse(args),
      createMany: (args: unknown) => mockUserOpenHouse(args),
      upsert: (args: unknown) => mockUserOpenHouse(args),
    },
  }

  jest.doMock("../lib/prisma.js", () => ({
    prisma: {
      property: { findUnique: (args: unknown) => mockFindUnique(args) },
      $transaction: (run: (tx: typeof transaction) => Promise<unknown>) => run(transaction),
    },
  }))

  const loaded = await import("../repositories/openHouseNotification.repository.js")
  openHouseNotificationRepository = loaded.openHouseNotificationRepository
})

beforeEach(() => {
  mockPropertyUpdate.mockResolvedValue({})
  mockOpenHouseCreateMany.mockResolvedValue({ count: 1 })
  mockOpenHouseFindMany.mockResolvedValue([])
  mockSavedFindMany.mockResolvedValue([])
  mockNotificationCreateMany.mockResolvedValue({ count: 0 })
})

const NOW = new Date("2026-11-26T00:00:00.000Z")
const MESSAGE = "New open house at 12 Example Street, Brisbane"

const record = (externalId: string) => ({
  external_id: externalId,
  start_datetime: NOW,
  end_datetime: NOW,
  status: "SCHEDULED" as const,
})

const input = (overrides: Record<string, unknown> = {}) => ({
  propertyId: 3,
  records: [record("c")],
  notifyExternalIds: [] as string[],
  message: MESSAGE,
  now: NOW,
  ...overrides,
})

describe("openHouseNotificationRepository.findSeen", () => {
  it("asks for the address, the time of the last recording and the external ids of the property", async () => {
    mockFindUnique.mockResolvedValue(null)

    await openHouseNotificationRepository.findSeen("mock", "mock-1")

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { source_external_id: { source: "mock", external_id: "mock-1" } },
      select: {
        property_id: true,
        address: true,
        open_houses_seen_at: true,
        openHouses: { select: { external_id: true } },
      },
    })
  })
})

describe("openHouseNotificationRepository.recordAndNotify", () => {
  it("stores the new open houses for the property and skips a duplicate", async () => {
    await openHouseNotificationRepository.recordAndNotify(
      input({ records: [record("c"), record("d")] }),
    )

    expect(mockOpenHouseCreateMany).toHaveBeenCalledWith({
      data: [
        { ...record("c"), property_id: 3 },
        { ...record("d"), property_id: 3 },
      ],
      skipDuplicates: true,
    })
  })

  it("notes the time on the property", async () => {
    await openHouseNotificationRepository.recordAndNotify(input())

    expect(mockPropertyUpdate).toHaveBeenCalledWith({
      where: { property_id: 3 },
      data: { open_houses_seen_at: NOW },
    })
  })

  it("stores nothing but still notes the time when there is nothing new", async () => {
    await openHouseNotificationRepository.recordAndNotify(input({ records: [] }))

    expect(mockOpenHouseCreateMany).not.toHaveBeenCalled()
    expect(mockPropertyUpdate).toHaveBeenCalledTimes(1)
  })

  it("tells nobody when there is nobody to tell about", async () => {
    const result = await openHouseNotificationRepository.recordAndNotify(input())

    expect(result).toEqual({ notified: 0 })
    expect(mockSavedFindMany).not.toHaveBeenCalled()
    expect(mockNotificationCreateMany).not.toHaveBeenCalled()
  })

  it("writes a notification for every user who saved the property and every open house to tell about", async () => {
    mockSavedFindMany.mockResolvedValue([{ user_id: 1 }, { user_id: 2 }])
    mockOpenHouseFindMany.mockResolvedValue([{ openhouse_id: 10 }, { openhouse_id: 11 }])
    mockNotificationCreateMany.mockResolvedValue({ count: 4 })

    const result = await openHouseNotificationRepository.recordAndNotify(
      input({ records: [record("c"), record("d")], notifyExternalIds: ["c", "d"] }),
    )

    expect(result).toEqual({ notified: 4 })
    expect(mockNotificationCreateMany).toHaveBeenCalledTimes(1)
    const row = (user_id: number, openhouse_id: number) => ({
      user_id,
      property_id: 3,
      openhouse_id,
      type: NEW_OPEN_HOUSE_TYPE,
      message: MESSAGE,
    })
    expect(mockNotificationCreateMany).toHaveBeenCalledWith({
      data: [row(1, 10), row(1, 11), row(2, 10), row(2, 11)],
      skipDuplicates: true,
    })
  })

  it("looks only at the users who saved this property and at the open houses of this property that it tells about", async () => {
    mockSavedFindMany.mockResolvedValue([{ user_id: 1 }])
    mockOpenHouseFindMany.mockResolvedValue([{ openhouse_id: 10 }])

    await openHouseNotificationRepository.recordAndNotify(input({ notifyExternalIds: ["c"] }))

    expect(mockSavedFindMany).toHaveBeenCalledWith({
      where: { property_id: 3 },
      select: { user_id: true },
    })
    expect(mockOpenHouseFindMany).toHaveBeenCalledWith({
      where: { property_id: 3, external_id: { in: ["c"] } },
      select: { openhouse_id: true },
    })
  })

  it("writes no notification when nobody saved the property, and still notes the time", async () => {
    mockSavedFindMany.mockResolvedValue([])
    mockOpenHouseFindMany.mockResolvedValue([{ openhouse_id: 10 }])

    const result = await openHouseNotificationRepository.recordAndNotify(
      input({ notifyExternalIds: ["c"] }),
    )

    expect(result).toEqual({ notified: 0 })
    expect(mockNotificationCreateMany).not.toHaveBeenCalled()
    expect(mockPropertyUpdate).toHaveBeenCalledTimes(1)
  })

  it("writes the notifications in batches and adds up how many were written", async () => {
    const savers = Array.from({ length: NOTIFICATION_BATCH_SIZE + 1 }, (_value, index) => ({
      user_id: index + 1,
    }))
    mockSavedFindMany.mockResolvedValue(savers)
    mockOpenHouseFindMany.mockResolvedValue([{ openhouse_id: 10 }])
    mockNotificationCreateMany.mockImplementation(async ({ data }) => ({ count: data.length }))

    const result = await openHouseNotificationRepository.recordAndNotify(
      input({ notifyExternalIds: ["c"] }),
    )

    const sizes = mockNotificationCreateMany.mock.calls.map(([args]) => args.data.length)
    expect(sizes).toEqual([NOTIFICATION_BATCH_SIZE, 1])
    expect(result).toEqual({ notified: NOTIFICATION_BATCH_SIZE + 1 })
  })

  it("never touches what a user has added to My Open Houses", async () => {
    mockSavedFindMany.mockResolvedValue([{ user_id: 1 }])
    mockOpenHouseFindMany.mockResolvedValue([{ openhouse_id: 10 }])

    await openHouseNotificationRepository.recordAndNotify(input({ notifyExternalIds: ["c"] }))

    expect(mockUserOpenHouse).not.toHaveBeenCalled()
  })
})
