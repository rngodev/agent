---
name: rngo
description: Write and update a project's rngo spec (the .rngo/ directory) — infers channels and effects from whatever the codebase actually contains (any language, ORM, API framework, or datastore), and authors invariants and custom schema types. Use this whenever the user asks to set up, infer, add to, fix, or regenerate anything under .rngo/, or mentions rngo channels, effects, invariants, schemas, or simulations, or asks to model/simulate an app's database or API traffic. Also use it after schema or API changes (new table, new column, new endpoint) to keep the spec in sync, even if the user just says something like "the spec is out of date" or "add rngo coverage for the new table."
---

# rngo Spec

rngo simulates realistic usage against a system and checks that the results hold up. It does that by
running a **spec**: a description of the traffic to generate (**effects**), the interfaces that traffic
flows through (**channels**), and the behavioral guarantees to check afterward (**invariants**). Your
job is to make `.rngo/` an accurate, useful spec for whatever project you're currently in — never assume
the stack; read the code to find out.

Read `resources/overview.md` first if you haven't worked with rngo before — it's a two-minute orientation.
Everything else in `resources/` is reference material to open as needed; don't read it all up front:

- `resources/guides/write-the-spec.md` — the general authoring methodology and file layout. Skim before
  writing your first channel or effect in a session.
- `resources/concepts/{spec,channel,effect,schema,invariant,signal}.md` — go deeper on any one concept.
- `resources/schema/primitive/*.md` — every field of the 9 schema primitives (`array`, `constant`,
  `context`, `function`, `number`, `object`, `reference`, `select`, `string`). Open the relevant one
  whenever you're unsure what a field is called or does — don't guess.
- `resources/cli/*.md` — the `rngo` CLI itself.

If you encounter other rngo material (older docs, other skills, memory of a past project) that calls
things `system` instead of `channel`, or `format` instead of `metadata` on effects, it's stale — the CLI
was renamed. Trust `resources/` in this skill over anything else, including your own training data.

## Where things live

```
.rngo/
├── spec.yml              # key, seed, start, end
├── channels/*.yml         # one file per channel
├── effects/*.yml          # one file per effect
├── invariants/*.yml       # one file per invariant
└── schemas/*.yml          # named custom schema types, shared across effects
```

If `.rngo/` doesn't exist yet, run `rngo init` to scaffold `spec.yml` and gitignore `.rngo/runs`. It will
also offer to install agent skills — decline, since you already have this one.

## Step 1: Find every system-under-test

A **channel** is only worth defining for something the app actually persists to or communicates through.
Before writing anything, go find these, since they differ completely project to project:

- **Datastores** — grep for connection strings / env vars (`DATABASE_URL`, `REDIS_URL`, ...), ORM config
  (Drizzle, Prisma, TypeORM, SQLAlchemy, ActiveRecord, Django models, Ecto, GORM, ...), migration or
  schema files, `docker-compose.yml` service definitions. The schema/migration files are what you'll
  later read to infer effects — locate them now.
- **APIs** — route definitions (Express/Hono/FastAPI/Rails/Django/Flask routers), an OpenAPI/Swagger spec,
  a GraphQL SDL file, RPC/protobuf service definitions.
- **External services** — SDK imports or API calls to SaaS (Stripe, Resend, Slack, Sentry, S3, ...) that
  the app writes to or reads from.
- **Observability sinks** worth asserting against — log files, a local log aggregator, anything an
  invariant might later query.

For each one, figure out how to reach it *locally* rather than guessing — check `.env.example`,
`CLAUDE.md`/`README`, `docker-compose.yml`, or existing dev-server scripts for the actual connection
command. A wrong hostname or port makes the whole channel useless.

## Step 2: Define channels

One channel per interface found above, at `.rngo/channels/{name}.yml`. Two decisions per channel:

- **`target.type`** — `stream` for something you pipe a long-lived connection into (a DB client, `tail -f`
  a log file); `exec` for a one-shot command per effect (a `curl` template hitting an API).
- **`format.type`** — `sql` if the target accepts SQL insert statements (most relational DBs); `json`
  (or omit — `json` is the default no-op) for anything else, including document stores and APIs.

Read `resources/concepts/channel.md` for the full field reference and worked examples (Postgres, cURL,
log tailing) before writing one from scratch.

## Step 3: Define effects

One effect per meaningful write path — usually one per table/collection, plus one per API mutation worth
simulating in real time. Read the actual schema/migration/model file you located in Step 1; don't infer
column shapes from memory or convention. For each field, translate its real type and constraints — there
are only 9 schema primitives, so everything else is composed:

| What the field is | How to express it |
|---|---|
| free-form text | `string` with a `pattern` sized to something realistic for that field |
| id / uuid | `string` with a `pattern` matching the app's *actual* id format — grep how ids are generated (uuid, nanoid, cuid, auto-increment...); don't guess the length or alphabet |
| integer / decimal, with bounds | `number`, using `minimum`/`maximum`/`scale`/`step` as appropriate |
| boolean | `select` between `{type: constant, value: true}` and `{type: constant, value: false}` — weight it if the real-world split is skewed |
| enum | `select` of `constant` options, one per allowed value |
| nullable / optional field | `select` between the real schema and `{type: constant, value: null}` |
| foreign key / relation | `reference` to the referenced effect, usually wrapped in `function` to pull a specific field (e.g. `.id`) |
| timestamp defaulting to "now" | `context` with `path: ["clock", "now"]` |
| composed value (email, full name, money) | `function` combining `select`/`constant`/`string`/`number` variables — see `resources/concepts/schema.md`'s email example |

`string` patterns match against the whole value already — never add `^`/`$` anchors. The CLI rejects them
(`invalid pattern: anchor is not supported`) even though you may see anchored examples elsewhere. Write
`pattern: "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-..."`, not `^[0-9a-fA-F]{8}-...$`.

Also avoid a bare `.` in patterns (e.g. `.{10,50}`), even though it shows up throughout the docs — it
generates unreadable garbage (private-use-area/surrogate codepoints), not plausible text. Use an explicit
character class instead, e.g. `[A-Za-z0-9 ]{10,50}` for a name or `[a-z]{5,10}` for an email local part.

In `function` expressions, use CEL's function-call form for conversions (`string(n)`) — never the
method-call form (`n.toString()`). The method form doesn't error, it just silently makes the effect emit
zero events, which is easy to miss unless you're watching event counts during validation.

Set `trigger` to reflect realistic *relative* volume across effects (some tables churn far faster than
others) — see `resources/concepts/effect.md#trigger` for the `hz()` helper and the growth-over-time
pattern via `offset`. Effects that reference other effects need those to make sense as a dependency (file
order in `.rngo/effects/` doesn't matter, but a `posts.create` referencing `users.create` should exist
sensibly relative to it).

## Step 4: Factor out repeated shapes

`resources/concepts/schema.md#custom-schema-types` describes defining a shape once under
`.rngo/schemas/{name}.yml` (or inline under a top-level `schemas:` key) and referencing it by name to
avoid repeating it across effects. As of the currently installed CLI, referencing a custom type this way
fails with `no schema parser matched` — confirmed directly, not just in docs. Until that's fixed, when the
same shape (an id pattern, a timestamp, a money amount, an email) shows up across multiple effects, inline
it in each effect rather than factoring it out. If you hit that error yourself, that's this — it's not
something wrong with what you wrote.

## Step 5: Invariants (only when asked, or clearly implied)

Write an invariant when the user describes a behavioral guarantee, or when it's clearly documented in the
codebase (a comment, a `CLAUDE.md`, an obvious constraint like a unique index). Each invariant is a SQL
query over the simulation's `effects`/`signals`/`errors` tables plus a CEL `expect` over `result` — see
`resources/concepts/invariant.md` for the exact schema and worked examples. Don't invent invariants
nobody asked for and that aren't grounded in something real — a spec asserting the wrong things is worse
than one asserting nothing, because it fails, or worse, silently passes, for reasons that don't matter.

## Step 6: Validate before calling it done

Run `rngo run --stdout` briefly (a few seconds is plenty — you can kill it early) to confirm the spec
parses and the generated events look like plausible real rows. A parse error looks like
`error: failed to parse: 'missing field ...'` and points at what's malformed. `--stdout` skips channel
routing entirely, so it's safe to run even against real infrastructure, before or after channels exist.

## When updating an existing spec

Prefer editing the specific file that owns whatever changed (one effect file per table) over regenerating
everything from scratch. If a schema gained a column, add that property to the existing effect file
rather than rewriting it. Check `.rngo/` before writing anything new — duplicated or conflicting
definitions across files are worse than pausing to ask.
