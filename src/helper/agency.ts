export interface AgencyName {
  agency_id: number
  name: string
}

// The name of an agency as it is compared: no space at the ends, runs of white space as one space,
// no difference between capitals and small letters
export function normalizeAgencyName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase()
}

// The agency in the list that has the same name as the given one (compared as above); when there
// are several, the one that was made first. Done here and not in the database, because whether
// "Riverside" and "riverside" are equal there depends on the collation (the local MySQL says yes,
// TiDB says no).
export function findSameAgency<T extends AgencyName>(candidates: T[], name: string): T | null {
  const wanted = normalizeAgencyName(name)
  let best: T | null = null

  for (const candidate of candidates) {
    if (normalizeAgencyName(candidate.name) !== wanted) continue
    if (best === null || candidate.agency_id < best.agency_id) best = candidate
  }

  return best
}
