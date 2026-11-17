// A first-time concurrent save can lose two races in a row (creating the property row,
// then creating the saved-property row), so the third attempt always finds both rows.
export const SAVE_PROPERTY_MAX_ATTEMPTS = 3

export const PRISMA_UNIQUE_CONSTRAINT_CODE = "P2002"

export const PROPERTY_STATUS_ACTIVE = "ACTIVE" as const