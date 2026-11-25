export const NEW_OPEN_HOUSE_TYPE = "NEW_OPEN_HOUSE" as const

// A popular property can be saved by many people, so their notifications are written in batches
export const NOTIFICATION_BATCH_SIZE = 500

export const newOpenHouseMessage = (address: string) => `New open house at ${address}`
