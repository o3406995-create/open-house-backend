import { describe, it, expect } from "@jest/globals"
import { myOpenHouseIdParamSchema } from "../validators/myOpenHouse.validator.js"

describe("myOpenHouseIdParamSchema", () => {
  it("turns the path value into a number", () => {
    expect(myOpenHouseIdParamSchema.parse({ myOpenHouseId: "3" })).toEqual({ myOpenHouseId: 3 })
  })

  it("accepts the smallest and the largest INT value", () => {
    expect(myOpenHouseIdParamSchema.parse({ myOpenHouseId: "1" })).toEqual({ myOpenHouseId: 1 })
    expect(myOpenHouseIdParamSchema.parse({ myOpenHouseId: "2147483647" })).toEqual({
      myOpenHouseId: 2147483647,
    })
  })

  // Number() would accept several of these ("1e2", "0x10", " 3", "3 ", "")
  it.each([
    "",
    "0",
    "-1",
    "+3",
    "03",
    "1.5",
    "1e2",
    "0x10",
    " 3",
    "3 ",
    "abc",
    "2147483648",
    "99999999999",
  ])("rejects %p", (value) => {
    expect(myOpenHouseIdParamSchema.safeParse({ myOpenHouseId: value }).success).toBe(false)
  })

  it("requires the id", () => {
    expect(myOpenHouseIdParamSchema.safeParse({}).success).toBe(false)
  })
})
