import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals"
import type { PropertyDetailDTO } from "../types/property.js"
import { PROPERTY_DATA_SOURCE_ENV } from "../constants/property.js"

// The providers and the notification service are replaced with fakes, so these tests never touch
// the database or a data source. The service is loaded AFTER the fakes are registered (see
// savedProperty.service.test.ts for why).
const mockProviderGetById = jest.fn<(externalId: string) => Promise<PropertyDetailDTO | null>>()
const mockRecordOpenHouses = jest.fn<(listing: unknown, openHouses: unknown) => Promise<unknown>>()

let propertyService: typeof import("../services/property.service.js").propertyService

beforeAll(async () => {
  const provider = {
    search: () => Promise.reject(new Error("not used by these tests")),
    getById: (externalId: string) => mockProviderGetById(externalId),
  }
  jest.doMock("../providers/mockPropertyProvider.js", () => ({ mockPropertyProvider: provider }))
  jest.doMock("../providers/domainPropertyProvider.js", () => ({
    domainPropertyProvider: { ...provider },
  }))
  jest.doMock("../services/openHouseNotification.service.js", () => ({
    openHouseNotificationService: {
      recordOpenHouses: (listing: unknown, openHouses: unknown) =>
        mockRecordOpenHouses(listing, openHouses),
    },
  }))

  const loaded = await import("../services/property.service.js")
  propertyService = loaded.propertyService
})

beforeEach(() => {
  // The mock provider is the one that is used unless the variable says "domain"
  delete process.env[PROPERTY_DATA_SOURCE_ENV]
  mockRecordOpenHouses.mockResolvedValue(undefined)
  jest.spyOn(console, "error").mockImplementation(() => undefined)
})

const HOUR = 60 * 60 * 1000
const PROPERTY: PropertyDetailDTO = {
  externalId: "mock-1",
  source: "mock",
  address: "12 Example Street, Brisbane",
  suburb: "Brisbane",
  state: "QLD",
  postcode: "4000",
  price: 650000,
  displayPrice: "$650,000",
  bedrooms: 3,
  bathrooms: 2,
  carSpaces: 2,
  propertyType: "House",
  latitude: -27.4698,
  longitude: 153.0251,
  thumbnailUrl: null,
  openHouses: [
    {
      externalId: "mock-1-0",
      startDatetime: new Date(Date.now() + 24 * HOUR),
      endDatetime: new Date(Date.now() + 25 * HOUR),
      status: "SCHEDULED",
    },
  ],
  landSizeSqm: null,
  description: null,
  listingUrl: null,
  images: [],
  agent: null,
}

describe("propertyService.getById", () => {
  it("answers the property and records its open houses by source and external id", async () => {
    mockProviderGetById.mockResolvedValue(PROPERTY)

    const result = await propertyService.getById("mock-1")

    expect(result).toBe(PROPERTY)
    expect(mockRecordOpenHouses).toHaveBeenCalledTimes(1)
    expect(mockRecordOpenHouses).toHaveBeenCalledWith(
      { source: "mock", externalId: "mock-1" },
      PROPERTY.openHouses,
    )
  })

  it("still answers the property when recording fails, and logs it", async () => {
    mockProviderGetById.mockResolvedValue(PROPERTY)
    mockRecordOpenHouses.mockRejectedValue(new Error("database is down"))

    await expect(propertyService.getById("mock-1")).resolves.toBe(PROPERTY)
    expect(console.error).toHaveBeenCalled()
  })

  it("answers 404 and records nothing when the listing does not exist", async () => {
    mockProviderGetById.mockResolvedValue(null)

    await expect(propertyService.getById("mock-1")).rejects.toMatchObject({ statusCode: 404 })
    expect(mockRecordOpenHouses).not.toHaveBeenCalled()
  })
})

describe("propertyService.findById", () => {
  it("answers the property and records its open houses by source and external id", async () => {
    mockProviderGetById.mockResolvedValue(PROPERTY)

    const result = await propertyService.findById("mock-1")

    expect(result).toBe(PROPERTY)
    expect(mockRecordOpenHouses).toHaveBeenCalledWith(
      { source: "mock", externalId: "mock-1" },
      PROPERTY.openHouses,
    )
  })

  it("answers null and records nothing when the listing does not exist", async () => {
    mockProviderGetById.mockResolvedValue(null)

    await expect(propertyService.findById("mock-1")).resolves.toBeNull()
    expect(mockRecordOpenHouses).not.toHaveBeenCalled()
  })

  it("still answers the property when recording fails", async () => {
    mockProviderGetById.mockResolvedValue(PROPERTY)
    mockRecordOpenHouses.mockRejectedValue(new Error("database is down"))

    await expect(propertyService.findById("mock-1")).resolves.toBe(PROPERTY)
  })
})
