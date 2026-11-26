import { describe, it, expect, jest, beforeAll } from "@jest/globals"

// The repository is replaced with a fake, so these tests never touch the database. The service is
// loaded AFTER the fake is registered (see savedProperty.service.test.ts for why).
const mockSetTimeZone = jest.fn<(userId: number, timeZone: string) => Promise<void>>()

let userTimeZoneService: typeof import("../services/userTimeZone.service.js").userTimeZoneService

beforeAll(async () => {
  jest.doMock("../repositories/user.repository.js", () => ({
    userRepository: {
      setTimeZone: (userId: number, timeZone: string) => mockSetTimeZone(userId, timeZone),
    },
  }))

  const loaded = await import("../services/userTimeZone.service.js")
  userTimeZoneService = loaded.userTimeZoneService
})

describe("userTimeZoneService.set", () => {
  it("stores the time zone for the user and answers it", async () => {
    mockSetTimeZone.mockResolvedValue(undefined)

    const result = await userTimeZoneService.set(7, "Australia/Sydney")

    expect(result).toEqual({ timeZone: "Australia/Sydney" })
    expect(mockSetTimeZone).toHaveBeenCalledWith(7, "Australia/Sydney")
  })

  it("passes a repository error on", async () => {
    mockSetTimeZone.mockRejectedValue(new Error("database is down"))

    await expect(userTimeZoneService.set(7, "UTC")).rejects.toThrow("database is down")
  })
})
