import { describe, it, expect } from "@jest/globals"
import {
  savePropertySchema,
  listSavedPropertiesSchema,
  savedPropertyIdParamSchema,
} from "../validators/savedProperty.validator.js"

describe("listSavedPropertiesSchema", () => {
  it("fills in the defaults", () => {
    expect(listSavedPropertiesSchema.parse({})).toEqual({ page: 1, pageSize: 20 })
  })

  it("turns query strings into numbers", () => {
    expect(listSavedPropertiesSchema.parse({ page: "2", pageSize: "10" })).toEqual({
      page: 2,
      pageSize: 10,
    })
  })

  it("accepts the largest page size", () => {
    expect(listSavedPropertiesSchema.safeParse({ pageSize: "50" }).success).toBe(true)
  })

  it.each(["0", "-1", "abc", "1.5"])("rejects page %s", (page) => {
    expect(listSavedPropertiesSchema.safeParse({ page }).success).toBe(false)
  })

  it.each(["0", "51", "999", "abc"])("rejects pageSize %s", (pageSize) => {
    expect(listSavedPropertiesSchema.safeParse({ pageSize }).success).toBe(false)
  })
})

describe("savedPropertyIdParamSchema", () => {
  it("turns the path value into a number", () => {
    expect(savedPropertyIdParamSchema.parse({ savedPropertyId: "3" })).toEqual({
      savedPropertyId: 3,
    })
  })

  it("accepts the largest INT value", () => {
    expect(savedPropertyIdParamSchema.safeParse({ savedPropertyId: "2147483647" }).success).toBe(
      true,
    )
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
    expect(savedPropertyIdParamSchema.safeParse({ savedPropertyId: value }).success).toBe(false)
  })
})

describe("savePropertySchema", () => {
  it("accepts a normal external id", () => {
    expect(savePropertySchema.safeParse({ externalId: "mock-1" }).success).toBe(true)
  })

  it("rejects ids with characters outside letters, digits, - and _", () => {
    expect(savePropertySchema.safeParse({ externalId: "a..b" }).success).toBe(false)
  })

  it("rejects an empty, a missing and a too long id", () => {
    expect(savePropertySchema.safeParse({ externalId: "" }).success).toBe(false)
    expect(savePropertySchema.safeParse({}).success).toBe(false)
    expect(savePropertySchema.safeParse({ externalId: "a".repeat(65) }).success).toBe(false)
  })
})
