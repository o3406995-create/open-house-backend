import { describe, it, expect, jest } from "@jest/globals"
import { retryOnConflict } from "../helper/retryOnConflict.js"

const uniqueConflict = () => ({ code: "P2002" })
const deadlock = () => ({ code: "P2034" })

describe("retryOnConflict", () => {
  it("returns the result of the first attempt", async () => {
    const action = jest.fn<() => Promise<string>>().mockResolvedValue("done")

    await expect(retryOnConflict(action, 3)).resolves.toBe("done")
    expect(action).toHaveBeenCalledTimes(1)
  })

  it("runs again after a unique constraint error and returns the later result", async () => {
    const action = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(uniqueConflict())
      .mockResolvedValueOnce("done")

    await expect(retryOnConflict(action, 3)).resolves.toBe("done")
    expect(action).toHaveBeenCalledTimes(2)
  })

  it("runs again after a deadlock or write conflict", async () => {
    const action = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(deadlock())
      .mockResolvedValueOnce("done")

    await expect(retryOnConflict(action, 3)).resolves.toBe("done")
    expect(action).toHaveBeenCalledTimes(2)
  })

  it("handles a mix of both kinds of conflict", async () => {
    const action = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(deadlock())
      .mockRejectedValueOnce(uniqueConflict())
      .mockResolvedValueOnce("done")

    await expect(retryOnConflict(action, 3)).resolves.toBe("done")
    expect(action).toHaveBeenCalledTimes(3)
  })

  it.each([
    ["a unique constraint conflict", uniqueConflict],
    ["a deadlock", deadlock],
  ])("throws %s once the attempts are used up", async (_label, makeError) => {
    const action = jest.fn<() => Promise<string>>().mockRejectedValue(makeError())

    await expect(retryOnConflict(action, 3)).rejects.toMatchObject(makeError())
    expect(action).toHaveBeenCalledTimes(3)
  })

  it("tries only once when a single attempt is allowed", async () => {
    const action = jest.fn<() => Promise<string>>().mockRejectedValue(deadlock())

    await expect(retryOnConflict(action, 1)).rejects.toMatchObject({ code: "P2034" })
    expect(action).toHaveBeenCalledTimes(1)
  })

  it("does not retry other errors", async () => {
    const action = jest.fn<() => Promise<string>>().mockRejectedValue(new Error("database is down"))

    await expect(retryOnConflict(action, 3)).rejects.toThrow("database is down")
    expect(action).toHaveBeenCalledTimes(1)
  })

  it("does not retry other Prisma errors", async () => {
    const action = jest.fn<() => Promise<string>>().mockRejectedValue({ code: "P2025" })

    await expect(retryOnConflict(action, 3)).rejects.toMatchObject({ code: "P2025" })
    expect(action).toHaveBeenCalledTimes(1)
  })
})
