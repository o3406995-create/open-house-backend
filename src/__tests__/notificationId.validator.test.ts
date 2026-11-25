import { describe, it, expect } from "@jest/globals"
import { notificationIdParamSchema } from "../validators/notification.validator.js"

describe("notificationIdParamSchema", () => {
  it("turns the path value into a number", () => {
    expect(notificationIdParamSchema.parse({ notificationId: "5" })).toEqual({ notificationId: 5 })
  })

  it.each(["", "0", "-1", "1.5", "1e2", "0x10", " 3", "abc", "2147483648"])("rejects %p", (value) => {
    expect(notificationIdParamSchema.safeParse({ notificationId: value }).success).toBe(false)
  })
})
