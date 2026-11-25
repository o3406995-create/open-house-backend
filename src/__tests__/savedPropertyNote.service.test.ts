import { describe, it, expect, jest, beforeAll } from "@jest/globals"

// The repository and the property service are replaced with fakes, so these tests never touch
// the database or the data source. The service is loaded AFTER the fakes are registered (see
// savedProperty.service.test.ts for why).
const mockListForUser =
  jest.fn<(userId: number, page: number, pageSize: number) => Promise<unknown>>()

let savedPropertyService: typeof import("../services/savedProperty.service.js").savedPropertyService

beforeAll(async () => {
  jest.doMock("../repositories/savedProperty.repository.js", () => ({
    savedPropertyRepository: {
      saveForUser: () => Promise.reject(new Error("not used by these tests")),
      deleteForUser: () => Promise.reject(new Error("not used by these tests")),
      listForUser: (userId: number, page: number, pageSize: number) =>
        mockListForUser(userId, page, pageSize),
    },
  }))

  jest.doMock("../services/property.service.js", () => ({
    propertyService: {
      // Another source than the one the listings came from: nothing is looked up again
      getActiveSource: () => "domain",
      findById: () => Promise.reject(new Error("not used by these tests")),
      getById: () => Promise.reject(new Error("not used by these tests")),
    },
  }))

  const loaded = await import("../services/savedProperty.service.js")
  savedPropertyService = loaded.savedPropertyService
})

const UPDATED = new Date("2026-11-24T01:00:00.000Z")

function snapshot(id: string) {
  return {
    external_id: id,
    source: "mock",
    address: id + " Example Street",
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

function record(id: number, note: unknown) {
  return {
    saved_property_id: id,
    saved_at: new Date("2026-11-20T00:00:00.000Z"),
    property: snapshot("mock-" + id),
    note,
  }
}

const PAGE = { page: 1, pageSize: 10 }

describe("savedPropertyService.list: the note of each saved property", () => {
  it("carries the note of the saved property", async () => {
    mockListForUser.mockResolvedValue({
      records: [record(1, { note_id: 5, content: "Call the agent", updated_at: UPDATED })],
      total: 1,
    })

    const { savedProperties } = await savedPropertyService.list(7, PAGE)

    expect(savedProperties[0]).toMatchObject({
      savedPropertyId: 1,
      note: { noteId: 5, content: "Call the agent", updatedAt: UPDATED },
    })
  })

  it("has a null note for a saved property without one", async () => {
    mockListForUser.mockResolvedValue({ records: [record(1, null)], total: 1 })

    const { savedProperties } = await savedPropertyService.list(7, PAGE)

    expect(savedProperties[0]?.note).toBeNull()
  })

  it("keeps each note with its own saved property", async () => {
    mockListForUser.mockResolvedValue({
      records: [
        record(1, { note_id: 5, content: "First", updated_at: UPDATED }),
        record(2, null),
        record(3, { note_id: 6, content: "Third", updated_at: UPDATED }),
      ],
      total: 3,
    })

    const { savedProperties } = await savedPropertyService.list(7, PAGE)

    expect(savedProperties.map((item) => [item.savedPropertyId, item.note?.content ?? null])).toEqual([
      [1, "First"],
      [2, null],
      [3, "Third"],
    ])
  })
})
