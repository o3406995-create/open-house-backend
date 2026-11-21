import { describe, it, expect, jest } from "@jest/globals"
import { retryOnUniqueConflict } from "../helper/retryOnUniqueConflict.js"

const conflict = () => ({ code: "P2002" })

describe("retryOnUniqueConflict", () => {
  it("returns the result of the first attempt", async () => {
    const action = jest.fn<() => Promise<string>>().mockResolvedValue("done")

    await expect(retryOnUniqueConflict(action, 3)).resolves.toBe("done")
    expect(action).toHaveBeenCalledTimes(1)
  })

  it("runs again after a unique constraint error and returns the later result", async () => {
    const action = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(conflict())
      .mockResolvedValueOnce("done")

    await expect(retryOnUniqueConflict(action, 3)).resolves.toBe("done")
    expect(action).toHaveBeenCalledTimes(2)
  })

  it("throws the conflict once the attempts are used up", async () => {
    const action = jest.fn<() => Promise<string>>().mockRejectedValue(conflict())

    await expect(retryOnUniqueConflict(action, 3)).rejects.toMatchObject({ code: "P2002" })
    expect(action).toHaveBeenCalledTimes(3)
  })

  it("tries only once when a single attempt is allowed", async () => {
    const action = jest.fn<() => Promise<string>>().mockRejectedValue(conflict())

    await expect(retryOnUniqueConflict(action, 1)).rejects.toMatchObject({ code: "P2002" })
    expect(action).toHaveBeenCalledTimes(1)
  })

  it("does not retry other errors", async () => {
    const action = jest.fn<() => Promise<string>>().mockRejectedValue(new Error("database is down"))

    await expect(retryOnUniqueConflict(action, 3)).rejects.toThrow("database is down")
    expect(action).toHaveBeenCalledTimes(1)
  })
})
