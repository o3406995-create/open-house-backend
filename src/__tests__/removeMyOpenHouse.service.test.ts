import { describe, it, expect, jest, beforeAll } from "@jest/globals"
import { AppError } from "../lib/AppError.js"
import { MY_OPEN_HOUSE_ERROR_ENTRY_NOT_FOUND } from "../constants/myOpenHouse.js"

// The repository and the property service are replaced with fakes, so these tests never
// touch the database. The service is loaded AFTER the fakes are registered (see
// savedProperty.service.test.ts for why). Only deleteForUser may be called by remove.
const mockDeleteForUser = jest.fn<(userId: number, id: number) => Promise<number>>()

let myOpenHouseService: typeof import("../services/myOpenHouse.service.js").myOpenHouseService

beforeAll(async () => {
  jest.doMock("../repositories/myOpenHouse.repository.js", () => ({
    myOpenHouseRepository: {
      addForUser: () => Promise.reject(new Error("remove must not add")),
      listForUser: () => Promise.reject(new Error("remove must not list")),
      deleteForUser: (userId: number, id: number) => mockDeleteForUser(userId, id),
    },
  }))

  jest.doMock("../services/property.service.js", () => ({
    propertyService: { getById: () => Promise.reject(new Error("remove must not ask the provider")) },
  }))

  const loaded = await import("../services/myOpenHouse.service.js")
  myOpenHouseService = loaded.myOpenHouseService
})

describe("myOpenHouseService.remove", () => {
  it("removes the user's own entry", async () => {
    mockDeleteForUser.mockResolvedValue(1)

    await expect(myOpenHouseService.remove(7, 3)).resolves.toBeUndefined()
    expect(mockDeleteForUser).toHaveBeenCalledWith(7, 3)
  })

  it("answers 404 when nothing was deleted", async () => {
    mockDeleteForUser.mockResolvedValue(0)

    await expect(myOpenHouseService.remove(7, 3)).rejects.toMatchObject({ statusCode: 404 })
    await expect(myOpenHouseService.remove(7, 3)).rejects.toThrow(MY_OPEN_HOUSE_ERROR_ENTRY_NOT_FOUND)
    await expect(myOpenHouseService.remove(7, 3)).rejects.toBeInstanceOf(AppError)
  })

  it("passes a repository error on", async () => {
    mockDeleteForUser.mockRejectedValue(new Error("database is down"))

    await expect(myOpenHouseService.remove(7, 3)).rejects.toThrow("database is down")
  })
})
