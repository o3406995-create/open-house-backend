import { userRepository } from "../repositories/user.repository.js"

export const userTimeZoneService = {
  // The browser reports its time zone. What happens without a request (the reminder the evening
  // before an open house) is worked out on it, so it is stored with the user.
  set: async (userId: number, timeZone: string) => {
    await userRepository.setTimeZone(userId, timeZone)
    return { timeZone }
  },
}
