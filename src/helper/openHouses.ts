import type { OpenHouseDTO } from "../types/property.js"

// Keeps the open houses that have not finished yet, earliest first.
export function upcomingOpenHouses(
  openHouses: OpenHouseDTO[],
  now: Date = new Date(),
): OpenHouseDTO[] {
  return openHouses
    .filter((openHouse) => openHouse.endDatetime.getTime() > now.getTime())
    .sort((a, b) => a.startDatetime.getTime() - b.startDatetime.getTime())
}