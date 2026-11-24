# Open House backend

REST API for the Open House app: searching property listings, saving properties, planning visits to open houses (My Open Houses) and keeping private notes. Node.js, Express and TypeScript, with Prisma on MySQL (TiDB Cloud when hosted). The frontend is a separate repository.

## Running it locally

1. Install the dependencies: `npm install`.
2. Create a local MySQL database called `openhouse`.
3. Create `env/local.env` (it is not committed) with two lines: `DATABASE_URL=mysql://<user>:<password>@127.0.0.1:3306/openhouse` and `JWT_SECRET=<a long random string>`. Leave the optional variables out rather than empty: an empty value counts as set, so an empty `PORT` makes the server listen on a random port and an empty `CORS_ORIGIN` allows no origin. `.env.example` lists them all. With `PROPERTY_DATA_SOURCE` unset the API serves the built-in mock listings, so no Domain credentials are needed.
4. Create the tables: `npx prisma migrate dev`.
5. Start the API with reload: `npm run dev` (port 3000 unless `PORT` says otherwise).
6. Optional, the first admin: put `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` in `env/local.env` and run `npm run seed:admin`. Users register themselves; an admin creates agent accounts with `POST /api/admin/agents`.

The interactive API documentation is at `http://localhost:3000/api-docs`; the static copy is `openApi.yaml`.

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Starts the API with reload, reading `env/local.env` |
| `npm start` | Starts the API without reload |
| `npm run dev:cloud`, `npm run sit`, `npm run uat` | Start with reload using `env/dev.env`, `env/sit.env` or `env/uat.env`. These can point at hosted databases: do not use them for local work |
| `npm run seed:admin` (and `:dev`, `:sit`, `:uat`) | Creates the first admin account in the matching environment |
| `npm test`, `npm run test:watch`, `npm run test:coverage` | Jest |

## Environment variables

`.env.example` lists every variable without values. `APP_ENV` (default `local`) picks the file `env/<APP_ENV>.env`. The file is not read when `DATABASE_URL` is already set, so a host that supplies the variables itself needs no file.

| Variable | Required | Default | Used for |
|---|---|---|---|
| `DATABASE_URL` | yes | none | MySQL connection string |
| `DATABASE_SSL` | no | off | Set to `true` when the database needs TLS (TiDB Cloud) |
| `JWT_SECRET` | yes | none | Signs and checks the login token |
| `CORS_ORIGIN` | no | a local development origin | The origin(s) allowed to call the API from a browser |
| `PORT` | no | 3000 | Port the server listens on |
| `API_BASE_URL` | no | `http://localhost:<PORT>` | The server address shown in the API documentation |
| `NODE_ENV` | no | none | `production` makes the login cookie `secure` |
| `APP_ENV` | no | `local` | Chooses `env/<APP_ENV>.env` |
| `PROPERTY_DATA_SOURCE` | no | mock | `domain` serves listings from the Domain API; anything else serves the mock listings |
| `DOMAIN_CLIENT_ID`, `DOMAIN_CLIENT_SECRET` | with `domain` | none | Credentials for the Domain API |
| `DOMAIN_AUTH_URL`, `DOMAIN_API_BASE_URL` | no | the public Domain addresses | Override the Domain endpoints |
| `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD` | for `seed:admin` | none | The first admin account |
| `ADMIN_SEED_NAME` | no | `Admin` | Name of that account |

Never commit real values. `.env.example` has names only, and `env/dev.env`, `env/sit.env` and `env/uat.env` are committed with placeholder values only: put real values in a copy outside Git or in the host's settings, never in those files.

## Property data: mock or Domain

All listing data goes through a provider chosen by `PROPERTY_DATA_SOURCE`.

- **mock** (the default): sample listings from `src/mock-data`, with open houses scheduled relative to today so there are always upcoming ones. Nothing external is called.
- **domain**: the Domain API. It needs `DOMAIN_CLIENT_ID` and `DOMAIN_CLIENT_SECRET`. An open house from Domain is identified as `<listing id>-<opening time in seconds>`, so its id stays the same when an earlier one has passed.

Both providers return the same shapes, so nothing else depends on the choice. A saved property and an entry in My Open Houses also keep a snapshot of the listing in the database: My Open Houses answers from the snapshot, and the saved properties list checks the provider and falls back to the snapshot.

## Project structure

    prisma/              schema.prisma and the migrations
    openApi.yaml         static API description
    env/                 env/local.env is yours and never committed; dev.env, sit.env and uat.env hold placeholders only
    src/
      server.ts          app setup and the mounted routes
      routes/            paths, middleware, Swagger comments
      controllers/       read and check the request, choose the status code
      validators/        zod schemas
      services/          the rules
      repositories/      the only place that talks to Prisma
      mappers/           database rows and provider data to response shapes
      providers/         the mock and Domain listing sources
      mock-data/         sample listings
      middleware/        login check, role checks, error handler
      helper/ lib/       small helpers; Prisma client, env loading, errors, Swagger
      constants/         every literal value the code uses
      types/             shared types
      scripts/           seedAdmin
      generated/         the Prisma client (generated, not committed)
      __tests__/         Jest tests

## API groups

Everything is under `/api`. The login token is an HttpOnly cookie named `token`.

| Group | Path | Who can use it | Routes |
|---|---|---|---|
| Authentication | `/api/auth` | anyone | `POST /register`, `POST /login`, `POST /logout` |
| Current user | `/api/users` | logged in | `GET /me` |
| Properties | `/api/properties` | logged in | `POST /search`, `GET /:externalId` |
| Saved properties | `/api/saved-properties` | USER | `POST /`, `GET /` (`page`, `pageSize` up to 50), `DELETE /:savedPropertyId` |
| My Open Houses | `/api/my-open-houses` | USER | `POST /`, `GET /` (`timeZone`), `DELETE /:myOpenHouseId`, `PATCH /:myOpenHouseId/attended` |
| Notes | `/api/notes` | USER | `POST /`, `PUT /:noteId`, `DELETE /:noteId` |
| Admin | `/api/admin` | ADMIN | `POST /agents` |

The roles are `USER`, `AGENT` and `ADMIN`. The same answers are used everywhere: 400 for a request that fails validation (`{ message, errors }`), 401 when not logged in, 403 for the wrong role, 404 when something does not exist **or belongs to another user** (so ids of other users cannot be probed), 409 for a conflict (a second note on the same item, an open house that is over, one that has not started yet). Details and examples are in `openApi.yaml`.

Notes cannot be read yet: the text is returned when a note is created or changed.

## Main user journeys

1. **Sign up and log in.** `POST /api/auth/register`, then `POST /api/auth/login`; the token comes back as a cookie. Agents are created by an admin.
2. **Find open houses.** `POST /api/properties/search` with a place, a radius and optional filters, then `GET /api/properties/:externalId` for one listing and its open houses.
3. **Save a property.** `POST /api/saved-properties`; the list shows each one as `AVAILABLE`, `REMOVED` (the data source no longer has it) or `UNKNOWN` (it could not be checked).
4. **Plan a visit.** `POST /api/my-open-houses` with the property and the open house. Adding the same one twice returns the existing entry.
5. **Follow the visits.** `GET /api/my-open-houses?timeZone=<the browser's time zone>` groups them into today, upcoming, attended and expired. Once an open house has started the user confirms attendance with `PATCH /:myOpenHouseId/attended`, or removes the entry with `DELETE`.
6. **Keep a note.** `POST /api/notes` on a saved property or on an entry in My Open Houses (one note each), then `PUT` and `DELETE`. A note goes away with the saved property or the entry it belongs to.
7. **Admin.** The first admin comes from `npm run seed:admin`; an admin creates agent accounts with `POST /api/admin/agents`.

## Database migrations

The schema changes are Prisma migrations in `prisma/migrations`. Locally the backend reads `env/local.env` (start it with `npm run dev`). The hosted database is TiDB Cloud.

### Locally

- Create and apply a migration with `npx prisma migrate dev --name <what_changed>`, then `npx prisma generate`.
- Read the generated `migration.sql` before committing it. A migration that drops or renames something needs a plan of its own.
- Edit `prisma/schema.prisma` by hand. Do not run `npx prisma format`: the file is not in Prisma's own style, so it would realign unrelated models and make the diff and merge conflicts bigger. Use `npx prisma generate` to check that the schema is valid.

### The hosted database

Apply a migration to TiDB from a **new terminal tab**, and close the tab when it is done. Never run `migrate dev` in a tab that has the hosted variables loaded.

```bash
set -a
source <your-cloud-env-file>   # a file outside the repository that sets DATABASE_URL
set +a
npx prisma migrate status      # read the "Datasource" line: the host must be the TiDB one
npx prisma migrate deploy
npx prisma migrate status      # "Database schema is up to date!"
```

- `set -a` matters. With a plain `source` the variables are set in the shell but not exported, so Prisma does not see them, falls back to `env/local.env` and migrates the **local** database while still reporting success. The host in the `Datasource` line is the only thing that tells the two apart, so check it before `deploy`.
- Apply a migration before the deploy of the code that needs it. A migration that only adds nullable columns, indexes and foreign keys is safe to apply first: the running code does not read them.
- After adding a foreign key with `ON DELETE CASCADE`, check on the hosted database that the cascade really happens. A foreign key that was created is not necessarily one that is enforced (it depends on the TiDB version).

## Tests and checks

There is no `lint` script. Before a pull request:

    npm test
    npx tsc --noEmit
    npx --yes @redocly/cli lint openApi.yaml

The tests are in `src/__tests__` (Jest with `@swc/jest`). That transform does not hoist `jest.mock`, so the tests of services, controllers and repositories register their fakes with `jest.doMock` in `beforeAll` and load the module under test afterwards with a dynamic `import()`.

A new test is worth little until it has been seen to fail: change the code it protects on purpose, check that the test fails, then put the code back.

## Hosted environment

The hosted copy runs on Render with a TiDB Cloud database and is deployed automatically when something is merged into `main`. A migration that the new code needs must be applied to the hosted database before the merge (see "Database migrations").
