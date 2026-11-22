import { isTransactionConflictError, isUniqueConstraintError } from "./prismaErrors.js"

// The unique indexes are the final guard against duplicates. When two requests race, the
// loser either gets a unique constraint error (the winner created the row first) or the
// database aborts one of the two overlapping transactions (deadlock or write conflict).
// Running the action again finds the rows the winner committed, so the loser ends up with
// a normal "already exists" result. Any other error, and a conflict on the last attempt,
// is thrown as it is.
export async function retryOnConflict<T>(
  action: () => Promise<T>,
  maxAttempts: number,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await action()
    } catch (err) {
      const conflict = isUniqueConstraintError(err) || isTransactionConflictError(err)
      if (!conflict || attempt >= maxAttempts) {
        throw err
      }
    }
  }
}
