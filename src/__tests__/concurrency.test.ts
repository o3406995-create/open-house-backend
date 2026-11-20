import { describe, it, expect } from "@jest/globals"
import { mapWithConcurrency } from "../helper/concurrency.js"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe("mapWithConcurrency", () => {
  it("keeps the input order even when later items finish first", async () => {
    const delays = [20, 1, 10]

    const results = await mapWithConcurrency(delays, 3, async (ms) => {
      await sleep(ms)
      return ms
    })

    expect(results).toEqual([20, 1, 10])
  })

  it("never runs more than `limit` calls at the same time", async () => {
    let active = 0
    let peak = 0

    const results = await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (n) => {
      active++
      peak = Math.max(peak, active)
      await sleep(5)
      active--
      return n * 2
    })

    expect(peak).toBe(2)
    expect(results).toEqual([2, 4, 6, 8, 10, 12])
  })

  it("handles an empty list", async () => {
    expect(await mapWithConcurrency([], 5, async (n: number) => n)).toEqual([])
  })

  it("works when the limit is larger than the number of items", async () => {
    expect(await mapWithConcurrency([1, 2], 10, async (n) => n + 1)).toEqual([2, 3])
  })
})