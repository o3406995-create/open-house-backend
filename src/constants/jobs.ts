export const JOB_SECRET_ENV = "JOB_SECRET"
export const JOB_SECRET_HEADER = "x-job-secret"

// A shorter secret is taken for a mistake: the jobs stay switched off
export const JOB_SECRET_MIN_LENGTH = 16

export const JOB_ERROR_NOT_FOUND = "Not found."
export const JOB_ERROR_UNAUTHORIZED = "Invalid job secret."
