import { isUniqueConstraintError } from "./prismaErrors.js"

// The unique indexes are the final guard against duplicates. When two requests race and one
// loses (unique constraint error), running the action again finds the rows the winner
// committed, so the loser ends up with a normal "already exists" result. Any other error,
// and a conflict on the last attempt, is thrown as it is.
export async function retryOnUniqueConflict<T>(
  action: () => Promise<T>,
  maxAttempts: number,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await action()
    } catch (err) {
      if (!isUniqueConstraintError(err) || attempt >= maxAttempts) {
        throw err
      }
    }
  }
}
