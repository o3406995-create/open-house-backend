# Open House Backend — Code Review Prompt

Pull requests merge into `main`. Review only the diff from `main` to the head branch. Do not use another feature branch as the base. Do not edit files. Report findings only.

Check these areas when the diff touches them:

- Routes, request and response shapes, and status codes stay compatible unless the pull request states a breaking change. Swagger comments in `src/routes/*.routes.ts` and `openApi.yaml` must match.
- Controllers handle HTTP only. Zod validators in `src/validators` parse input. Services hold business logic. Repositories hold Prisma calls. Listing data goes through `PropertyDataProvider` (`MockPropertyProvider` or `DomainPropertyProvider`, chosen by `PROPERTY_DATA_SOURCE`).
- Authentication is the HttpOnly cookie `token`, set by `POST /api/auth/login` and `POST /api/auth/register`. `requireAuth` verifies the JWT with `JWT_SECRET` and rejects inactive or deleted users. Passwords are hashed with bcrypt. Roles are `USER`, `AGENT`, and `ADMIN`. Public registration creates a `USER`. An `AGENT` is created only by `POST /api/admin/agents`, which requires `requireAdmin`.
- Saved-property queries are limited to the authenticated user and require `requireUser`.
- Do not log passwords, the token cookie, JWTs, Domain client credentials, or database URLs. CORS stays limited to `CORS_ORIGIN` and allows credentials. `env/local.env`, `env/dev.env`, `env/sit.env`, and `env/uat.env` stay uncommitted. `src/lib/loadEnv.ts` loads `env/<APP_ENV>.env`.
- Expected failures use `AppError` and `src/middleware/errorHandler.ts`. Unexpected failures return 500 with `Internal server error.` Prisma failures go through `src/helper/prismaErrors.ts`.
- Prisma 7 uses the MariaDB adapter. Application code imports the client from `src/generated/prisma`. Do not review files in that generated folder. Review schema changes, migrations, constraints, and transactions. `DATABASE_SSL` stays off unless the database requires TLS. Password hashes are not returned in API responses.
- Current routes are `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/users/me`, `POST /api/properties/search`, `GET /api/properties/:externalId`, `POST /api/saved-properties`, and `POST /api/admin/agents`.

## Severity

- **HIGH:** security risk, data loss, broken API contract, or an auth or ownership bypass.
- **MEDIUM:** a behavior or validation bug a caller can hit.
- **LOW:** a small clarity fix in the changed lines.

Every finding needs a file path, a line number, the impact, and a minimal fix. Do not report code the diff does not change. Do not claim tests passed.

## Output

**Code Review:** [branch-name]

### Summary

What changed, which areas were reviewed, and that tests were not run.

### HIGH

1. [Title]
   - **File:** `src/path/file.ts:line`
   - **Issue:** [What the changed code does]
   - **Impact:** [Why it matters]
   - **Suggested fix:** [Smallest correction]

None identified, if there are no findings.

### MEDIUM

1. [Title]
   - **File:** `src/path/file.ts:line`
   - **Issue:** [What the changed code does]
   - **Suggested fix:** [Smallest correction]

None identified, if there are no findings.

### LOW

1. [Title]
   - **File:** `src/path/file.ts:line`
   - **Suggestion:** [Optional improvement]

None identified, if there are no findings.

### What looks good

- [Observation from the diff]

### Action items

| Priority | Item | File |
|---|---|---|
| HIGH / MEDIUM / LOW | [Action] | `src/path/file.ts:line` |

No action items, if there are no findings.

### Review limitations

- **Diff reviewed:** `main` to [head]
- **Tests:** not run
- **Not inspected:** [areas left unread]
