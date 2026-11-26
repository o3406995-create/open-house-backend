import { describe, it, expect, jest, beforeAll } from "@jest/globals"

// Prisma is replaced with a fake, so this checks the query that is sent, not the database. The
// repository is loaded AFTER the fake is registered (see savedProperty.service.test.ts for why).
const mockUpdateMany = jest.fn<(args: unknown) => Promise<{ count: number }>>()

let userRepository: typeof import("../repositories/user.repository.js").userRepository

beforeAll(async () => {
  jest.doMock("../lib/prisma.js", () => ({
    prisma: { user: { updateMany: (args: unknown) => mockUpdateMany(args) } },
  }))

  const loaded = await import("../repositories/user.repository.js")
  userRepository = loaded.userRepository
})

describe("userRepository.setTimeZone", () => {
  it("changes the time zone of the user with that id, and never of a deleted account", async () => {
    mockUpdateMany.mockResolvedValue({ count: 1 })

    await userRepository.setTimeZone(7, "Australia/Sydney")

    expect(mockUpdateMany).toHaveBeenCalledTimes(1)
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { user_id: 7, is_deleted: false },
      data: { time_zone: "Australia/Sydney" },
    })
  })

  it("is not an error when nothing changed (the same zone again)", async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 })

    await expect(userRepository.setTimeZone(7, "Australia/Sydney")).resolves.toBeUndefined()
  })
})
