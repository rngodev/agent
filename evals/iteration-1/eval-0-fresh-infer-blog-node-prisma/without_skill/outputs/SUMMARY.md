# rngo setup — scribble (Express + Prisma + Postgres blog API)

## What the repo is

`scribble` (see `package.json`) is a tiny blogging API: Express + Prisma Client + Postgres. Source
of truth read to build this spec:

- `prisma/schema.prisma` — 3 models: `User`, `Post` (`status` enum DRAFT/PUBLISHED/ARCHIVED, optional
  `body`, `authorId` FK), `Comment` (`postId`/`authorId` FKs). IDs are `String @default(uuid())`.
- `src/index.ts` — the only mutating routes are `POST /posts` (title/body/authorId → `Post`) and
  `POST /posts/:id/comments` (body/authorId → `Comment`). There is **no** route to create a `User`.
- `docker-compose.yml` / `.env.example` — local Postgres on `localhost:5432`, credentials
  `scribble:scribble`, `DATABASE_URL=postgresql://scribble:scribble@localhost:5432/scribble`.

## What was set up

Ran `rngo init` then hand-wrote the spec under `.rngo/`:

- **`spec.yml`** — `key: scribble`, `start: now - days(60)`, `end: now + minutes(5)` (60 days of
  backdated history plus a few minutes of live traffic).
- **`channels/db.yml`** — private channel, `sql` format, streams into `psql -q $DATABASE_URL`.
- **`channels/api.yml`** — public channel, `exec` target templating a `curl` call against
  `${API_BASE_URL:-http://localhost:3000}` (Express's hardcoded listen port).
- **`effects/users.create.yml`** — routed to `db` only, spanning the whole simulation window, because
  there is no API endpoint that creates users.
- **`effects/posts.create.history.yml`** / **`effects/comments.create.history.yml`** — routed to `db`,
  `end: now`. Insert rows directly (with app-shaped UUIDs and a realistic `status` mix for posts)
  so they can carry backdated `createdAt` values and known ids.
- **`effects/posts.create.yml`** / **`effects/comments.create.yml`** — routed to `api`, `start: now`,
  hitting the real `POST /posts` and `POST /posts/:id/comments` endpoints with only the fields the
  handlers actually read (`title`/`body`/`authorId`, and `body`/`authorId` respectively).

Table names in `metadata.table` (`User`, `Post`, `Comment`) match Prisma's default (unmapped, so the
table name is the model name verbatim — no `@@map` in the schema).

## Notable decisions

- **No custom schema type for the id pattern.** The general rngo guidance recommends factoring the
  uuid pattern into `.rngo/schemas/uuid.yml` and referencing it as `type: uuid`. I tried exactly that
  (and the docs' own example verbatim, both via the directory-merge mechanism and inlined into one
  spec file) and it reliably failed with `error: failed to parse: 'no schema parser matched'` against
  the installed CLI (`rngo 0.29.0`). Inspecting the binary's embedded struct info confirmed its
  top-level `Simulation` struct has no `schemas` field at all, so this build doesn't implement custom
  named schema types. I fell back to repeating the literal uuid pattern
  (`[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}`, i.e. UUIDv4
  shape, matching Prisma's `@default(uuid())`) inline in the three effects that need one.
- **Comments only attach to backdated posts.** `posts.create.yml` (the live `POST /posts` effect)
  never learns the id Prisma assigns server-side — the handler doesn't accept a client-supplied id and
  the response is never captured as a `reference`-able effect value. So `postId` in both comment
  effects (and the URL path in `comments.create.yml`) reference `posts.create.history` instead, since
  those rows are inserted with an id the simulation itself controls and is guaranteed to exist.
  Consequence: comment traffic never lands on a post created during the "live" window — a reasonable
  approximation (most comment activity in a blog lands on already-existing posts) but worth knowing.
  Also `authorId` on posts/comments always resolves back to `users.create`, mirroring that users can
  only be seeded via `db`.
- **`posts.create.yml`'s `status` is never sent.** The real handler ignores any client-supplied
  `status` (Prisma defaults it to `DRAFT`), so the live-traffic effect schema omits `id`/`status`/
  `createdAt`/`updatedAt` entirely — only `title`/`body`/`authorId` are sent, matching what the route
  actually destructures from `req.body`.
- **CEL: no `.toString()` method syntax.** `local + '-' + suffix.toString() + '@example.com'` parsed
  fine but silently produced zero events for `users.create` — every emission failed CEL evaluation and
  got dropped, with no error surfaced anywhere (not even a non-zero exit code). Found this only by
  bisecting effect-by-effect with `rngo run --stdout`. Switched to CEL's `string()` conversion
  function: `string(suffix)`.
- **Free-text fields need an explicit character class, not bare `.`.** Using `.{50,2000}` (as several
  doc examples do) generated valid-but-garbled output — the regex engine's `.` matches arbitrary
  Unicode codepoints, not printable ASCII, so `title`/`body`/comment `body` came out full of
  private-use-area glyphs. Switched those to an explicit `[a-zA-Z0-9 .,!?'"-]{...}` class for legible
  fake text.

## Validation

Ran `rngo run --stdout` (backgrounded, killed after a few seconds) repeatedly while bisecting the two
issues above, then once more on the final spec: exits cleanly, all 5 effects emit plausible events
(`users.create`, `posts.create.history`, `comments.create.history` fire many times over the 60-day
history window; `posts.create`/`comments.create` fire 0–1 times, expected given their low hz over a
5-minute live window), and cross-effect `reference`/`function` wiring resolves correctly — e.g. a
`comments.create` event's `path` was `/posts/EE828d0A-6f4F-4779-Bcab-dAEdf1a52c57/comments`, matching a
real id emitted earlier by `posts.create.history`, and every `authorId` matched a real `users.create` id.

No invariants were written — none were requested and nothing in the repo (comments, CLAUDE.md,
obvious unique-index-style constraint) implied a specific behavioral guarantee to check.
