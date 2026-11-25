import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals"
import type { OpenHouseDTO } from "../types/property.js"

// The repository is replaced with a fake, so these tests never touch the database. The service is
// loaded AFTER the fake is registered (see savedProperty.service.test.ts for why).
const mockFindSeen = jest.fn<(source: string, externalId: string) => Promise<unknown>>()
const mockRecordAndNotify = jest.fn<(input: unknown) => Promise<{ notified: number }>>()

let openHouseNotificationService: typeof import("../services/openHouseNotification.service.js").openHouseNotificationService

beforeAll(async () => {
  jest.doMock("../repositories/openHouseNotification.repository.js", () => ({
    openHouseNotificationRepository: {
      findSeen: (source: string, externalId: string) => mockFindSeen(source, externalId),
      recordAndNotify: (input: unknown) => mockRecordAndNotify(input),
    },
  }))

  const loaded = await import("../services/openHouseNotification.service.js")
  openHouseNotificationService = loaded.openHouseNotificationService
})

beforeEach(() => {
  // The service writes one line when it records something
  jest.spyOn(console, "info").mockImplementation(() => undefined)
})

const NOW = new Date("2026-11-26T00:00:00.000Z")
const HOUR = 60 * 60 * 1000
const ADDRESS = "12 Example Street, Brisbane"
const SEEN = new Date("2026-11-20T00:00:00.000Z")
const LISTING = { source: "mock", externalId: "mock-1" }

function openHouse(
  externalId: string,
  options: { status?: OpenHouseDTO["status"]; startsInHours?: number; endsInHours?: number } = {},
): OpenHouseDTO {
  const { status = "SCHEDULED", startsInHours = 24, endsInHours = 25 } = options

  return {
    externalId,
    startDatetime: new Date(NOW.getTime() + startsInHours * HOUR),
    endDatetime: new Date(NOW.getTime() + endsInHours * HOUR),
    status,
  }
}

function known(seenAt: Date | null, ids: (string | null)[]) {
  return {
    property_id: 3,
    address: ADDRESS,
    open_houses_seen_at: seenAt,
    openHouses: ids.map((external_id) => ({ external_id })),
  }
}

interface SentInput {
  propertyId: number
  records: { external_id: string }[]
  notifyExternalIds: string[]
  message: string
  now: Date
}

const sent = () => mockRecordAndNotify.mock.calls[0]?.[0] as SentInput

describe("openHouseNotificationService.recordOpenHouses", () => {
  it("does nothing for a property that is not stored", async () => {
    mockFindSeen.mockResolvedValue(null)

    const result = await openHouseNotificationService.recordOpenHouses(LISTING, [openHouse("a")], NOW)

    expect(result).toEqual({ baseline: false, recorded: 0, notified: 0 })
    expect(mockRecordAndNotify).not.toHaveBeenCalled()
  })

  it("stores what is listed the first time and tells nobody", async () => {
    mockFindSeen.mockResolvedValue(known(null, []))
    mockRecordAndNotify.mockResolvedValue({ notified: 0 })

    const result = await openHouseNotificationService.recordOpenHouses(LISTING, [openHouse("a"), openHouse("b")],
      NOW,
    )

    expect(result).toEqual({ baseline: true, recorded: 2, notified: 0 })
    expect(sent().records.map((record) => record.external_id)).toEqual(["a", "b"])
    expect(sent().notifyExternalIds).toEqual([])
  })

  it("still notes the time the first time when the data source lists nothing", async () => {
    mockFindSeen.mockResolvedValue(known(null, []))
    mockRecordAndNotify.mockResolvedValue({ notified: 0 })

    const result = await openHouseNotificationService.recordOpenHouses(LISTING, [], NOW)

    expect(result).toEqual({ baseline: true, recorded: 0, notified: 0 })
    expect(mockRecordAndNotify).toHaveBeenCalledTimes(1)
    expect(sent().records).toEqual([])
  })

  it("writes nothing when every open house has been seen", async () => {
    mockFindSeen.mockResolvedValue(known(SEEN, ["a", "b"]))

    const result = await openHouseNotificationService.recordOpenHouses(LISTING, [openHouse("a"), openHouse("b")],
      NOW,
    )

    expect(result).toEqual({ baseline: false, recorded: 0, notified: 0 })
    expect(mockRecordAndNotify).not.toHaveBeenCalled()
  })

  it("ignores a stored open house that has no external id", async () => {
    mockFindSeen.mockResolvedValue(known(SEEN, [null, "a"]))

    await openHouseNotificationService.recordOpenHouses(LISTING, [openHouse("a")], NOW)

    expect(mockRecordAndNotify).not.toHaveBeenCalled()
  })

  it("stores and tells about a new open house that is still to come", async () => {
    mockFindSeen.mockResolvedValue(known(SEEN, ["a", "b"]))
    mockRecordAndNotify.mockResolvedValue({ notified: 3 })

    const result = await openHouseNotificationService.recordOpenHouses(LISTING, [openHouse("a"), openHouse("b"), openHouse("c")],
      NOW,
    )

    expect(result).toEqual({ baseline: false, recorded: 1, notified: 3 })
    expect(sent()).toMatchObject({
      propertyId: 3,
      notifyExternalIds: ["c"],
      message: "New open house at 12 Example Street, Brisbane",
      now: NOW,
    })
  })

  it("stores only the open houses it has not seen", async () => {
    mockFindSeen.mockResolvedValue(known(SEEN, ["a", "b"]))
    mockRecordAndNotify.mockResolvedValue({ notified: 0 })

    await openHouseNotificationService.recordOpenHouses(LISTING, [openHouse("a"), openHouse("b"), openHouse("c")],
      NOW,
    )

    expect(sent().records.map((record) => record.external_id)).toEqual(["c"])
  })

  it("stores a new open house that was cancelled but tells nobody about it", async () => {
    mockFindSeen.mockResolvedValue(known(SEEN, ["a"]))
    mockRecordAndNotify.mockResolvedValue({ notified: 0 })

    await openHouseNotificationService.recordOpenHouses(LISTING, [openHouse("a"), openHouse("b", { status: "CANCELLED" })],
      NOW,
    )

    expect(sent().records.map((record) => record.external_id)).toEqual(["b"])
    expect(sent().notifyExternalIds).toEqual([])
  })

  it("stores a new open house that is over but tells nobody about it", async () => {
    mockFindSeen.mockResolvedValue(known(SEEN, ["a"]))
    mockRecordAndNotify.mockResolvedValue({ notified: 0 })

    await openHouseNotificationService.recordOpenHouses(LISTING, [openHouse("a"), openHouse("b", { startsInHours: -3, endsInHours: -2 })],
      NOW,
    )

    expect(sent().records.map((record) => record.external_id)).toEqual(["b"])
    expect(sent().notifyExternalIds).toEqual([])
  })

  it("tells only about the new open houses that are still to come", async () => {
    mockFindSeen.mockResolvedValue(known(SEEN, ["a"]))
    mockRecordAndNotify.mockResolvedValue({ notified: 1 })

    await openHouseNotificationService.recordOpenHouses(LISTING, [
        openHouse("a"),
        openHouse("d"),
        openHouse("e", { status: "CANCELLED" }),
        openHouse("f", { startsInHours: -3, endsInHours: -2 }),
      ],
      NOW,
    )

    expect(sent().records.map((record) => record.external_id)).toEqual(["d", "e", "f"])
    expect(sent().notifyExternalIds).toEqual(["d"])
  })

  it("passes a repository error on when looking the property up", async () => {
    mockFindSeen.mockRejectedValue(new Error("database is down"))

    await expect(
      openHouseNotificationService.recordOpenHouses(LISTING, [openHouse("a")], NOW),
    ).rejects.toThrow("database is down")
  })

  it("passes a repository error on when writing", async () => {
    mockFindSeen.mockResolvedValue(known(SEEN, []))
    mockRecordAndNotify.mockRejectedValue(new Error("database is down"))

    await expect(
      openHouseNotificationService.recordOpenHouses(LISTING, [openHouse("a")], NOW),
    ).rejects.toThrow("database is down")
  })
})

describe("openHouseNotificationService.recordOpenHouses: the property it works on", () => {
  it("looks the property up by its source and external id", async () => {
    mockFindSeen.mockResolvedValue(null)

    await openHouseNotificationService.recordOpenHouses(LISTING, [openHouse("a")], NOW)

    expect(mockFindSeen).toHaveBeenCalledWith("mock", "mock-1")
  })

  it("writes for the property it found", async () => {
    mockFindSeen.mockResolvedValue({ ...known(SEEN, []), property_id: 9 })
    mockRecordAndNotify.mockResolvedValue({ notified: 0 })

    await openHouseNotificationService.recordOpenHouses(LISTING, [openHouse("a")], NOW)

    expect(sent().propertyId).toBe(9)
  })
})
