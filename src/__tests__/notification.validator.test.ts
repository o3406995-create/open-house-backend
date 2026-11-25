import { describe, it, expect } from "@jest/globals"
import { listNotificationsSchema } from "../validators/notification.validator.js"
import {
  NOTIFICATION_DEFAULT_PAGE,
  NOTIFICATION_DEFAULT_PAGE_SIZE,
  NOTIFICATION_MAX_PAGE_SIZE,
} from "../constants/notification.js"

describe("listNotificationsSchema", () => {
  it("uses the defaults when nothing is given", () => {
    expect(listNotificationsSchema.parse({})).toEqual({
      page: NOTIFICATION_DEFAULT_PAGE,
      pageSize: NOTIFICATION_DEFAULT_PAGE_SIZE,
    })
  })

  it("turns the query strings into numbers", () => {
    expect(listNotificationsSchema.parse({ page: "2", pageSize: "10" })).toEqual({
      page: 2,
      pageSize: 10,
    })
  })

  it("accepts the largest page size", () => {
    const pageSize = String(NOTIFICATION_MAX_PAGE_SIZE)

    expect(listNotificationsSchema.parse({ pageSize }).pageSize).toBe(NOTIFICATION_MAX_PAGE_SIZE)
  })

  it.each([
    ["page 0", { page: "0" }],
    ["a negative page", { page: "-1" }],
    ["a decimal page", { page: "1.5" }],
    ["a page that is not a number", { page: "abc" }],
    ["an empty page", { page: "" }],
    ["page size 0", { pageSize: "0" }],
    ["a page size above the limit", { pageSize: String(NOTIFICATION_MAX_PAGE_SIZE + 1) }],
    ["a decimal page size", { pageSize: "1.5" }],
    ["a page size that is not a number", { pageSize: "abc" }],
  ])("rejects %s", (_label, query) => {
    expect(listNotificationsSchema.safeParse(query).success).toBe(false)
  })
})
