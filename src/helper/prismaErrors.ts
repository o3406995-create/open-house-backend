import {
  PRISMA_UNIQUE_CONSTRAINT_CODE,
  PRISMA_TRANSACTION_CONFLICT_CODE,
} from "../constants/savedProperty.js"

function hasPrismaCode(err: unknown, code: string): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === code
}

export function isUniqueConstraintError(err: unknown): boolean {
  return hasPrismaCode(err, PRISMA_UNIQUE_CONSTRAINT_CODE)
}

// A deadlock or a write conflict between two concurrent transactions. The database aborted
// the transaction and nothing was written, so running it again is safe.
export function isTransactionConflictError(err: unknown): boolean {
  return hasPrismaCode(err, PRISMA_TRANSACTION_CONFLICT_CODE)
}
