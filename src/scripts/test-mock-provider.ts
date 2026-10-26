import { mockPropertyProvider } from "../providers/mockPropertyProvider.js"

async function main() {
  console.log("=== Test: search with no filters ===")
  const all = await mockPropertyProvider.search({
    latitude: -27.47,
    longitude: 153.02,
    radiusMeters: 5000,
  })
  console.log(`Found ${all.length} properties`)
  console.log(all.map((p) => p.address))

  console.log("\n=== Test: search with minBedrooms=3 ===")
  const filtered = await mockPropertyProvider.search({
    latitude: -27.47,
    longitude: 153.02,
    radiusMeters: 5000,
    minBedrooms: 3,
  })
  console.log(`Found ${filtered.length} properties`)
  console.log(filtered.map((p) => `${p.address} (${p.bedrooms} bed)`))

  console.log("\n=== Test: getById (valid id) ===")
  const single = await mockPropertyProvider.getById("mock-1")
  console.log(single)

  console.log("\n=== Test: getById (invalid id) ===")
  const notFound = await mockPropertyProvider.getById("does-not-exist")
  console.log(notFound)
}

main()