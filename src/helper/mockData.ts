export function daysFromNow(days: number, hour: number, minute = 0): Date {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, minute, 0, 0)
  return date
}

export function mockImages(seed: string, count: number): string[] {
  return Array.from(
    { length: count },
    (_, index) => `https://picsum.photos/seed/${seed}-${index + 1}/1200/800`,
  )
}