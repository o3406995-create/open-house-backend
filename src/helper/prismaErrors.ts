import { PRISMA_UNIQUE_CONSTRAINT_CODE } from "../constants/savedProperty.js"

export function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    err.code === PRISMA_UNIQUE_CONSTRAINT_CODE
  )
}