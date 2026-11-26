import { timingSafeEqual } from "node:crypto"
import type { Request, Response, NextFunction } from "express"
import {
  JOB_ERROR_NOT_FOUND,
  JOB_ERROR_UNAUTHORIZED,
  JOB_SECRET_ENV,
  JOB_SECRET_HEADER,
  JOB_SECRET_MIN_LENGTH,
} from "../constants/jobs.js"

// Compared in constant time, so the time it takes does not tell how much of a guess was right
function matches(given: string, expected: string): boolean {
  const givenBytes = Buffer.from(given)
  const expectedBytes = Buffer.from(expected)
  return givenBytes.length === expectedBytes.length && timingSafeEqual(givenBytes, expectedBytes)
}

// The jobs are called by a scheduler, not by a user, so there is no login: the caller shows a secret.
// Without a secret (or with one that is too short) the jobs are switched off and the path answers
// as if it did not exist.
export function requireJobSecret(req: Request, res: Response, next: NextFunction) {
  const expected = process.env[JOB_SECRET_ENV]

  if (!expected || expected.length < JOB_SECRET_MIN_LENGTH) {
    return res.status(404).json({ message: JOB_ERROR_NOT_FOUND })
  }

  const given = req.header(JOB_SECRET_HEADER)

  if (!given || !matches(given, expected)) {
    return res.status(401).json({ message: JOB_ERROR_UNAUTHORIZED })
  }

  return next()
}
