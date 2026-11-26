export const NEW_OPEN_HOUSE_TYPE = "NEW_OPEN_HOUSE" as const

// A popular property can be saved by many people, so their notifications are written in batches
export const NOTIFICATION_BATCH_SIZE = 500

export const newOpenHouseMessage = (address: string) => `New open house at ${address}`

// The reminder the evening before an open house
export const OPEN_HOUSE_REMINDER_TYPE = "OPEN_HOUSE_REMINDER" as const

// A reminder is made once it is this hour or later on the clock of the user
export const REMINDER_FROM_HOUR = 18

// The evening of any time zone is followed by a day that ends less than two days from now; the
// extra hours cover a day that is 25 hours long
export const REMINDER_WINDOW_HOURS = 50

export const UPCOMING_ENTRY_STATUS = "UPCOMING" as const
export const REMINDER_ROLE = "USER" as const

export const reminderMessage = (address: string) => `Open house tomorrow at ${address}`

// The reminder on the morning of an open house. It needs a type of its own: a notification is
// unique per user, open house and type, so it could not share the type of the evening reminder.
export const OPEN_HOUSE_TODAY_TYPE = "OPEN_HOUSE_TODAY" as const

// The morning reminder is made once it is this hour or later on the clock of the user
export const REMINDER_MORNING_FROM_HOUR = 6

export const todayMessage = (address: string) => `Open house today at ${address}`

export type ReminderType = typeof OPEN_HOUSE_REMINDER_TYPE | typeof OPEN_HOUSE_TODAY_TYPE
