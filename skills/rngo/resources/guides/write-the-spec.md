# Write The Spec

A rngo [spec](/docs/concepts/spec) describes a system's behavior, and the [`rngo run`](/docs/cli/run) CLI command checks
if that descriptions holds for a running instance of that system.

In particular, the spec describes behavior in terms of:

1. a **simulation**, which applies [effects](/docs/concepts/effect) to the system via [channels](/docs/concepts/channel), all while gathering data
2. an **audit**, which evaluates [invariants](/docs/concepts/invariant) against the gathered data

So, our goal is to write a spec for your system that results in a realistic simulation followed by a comprehensive audit.

## Layout

You should commit a system's spec into its repository at `.rngo/spec.yml`.

The entire spec could live in that file, but you can also break it out into files at the following locations:

- `.rngo/channels/*.yml`
- `.rngo/effects/*.yml`
- `.rngo/invariants/*.yml`
- `.rngo/schemas/*.yml`

A spec can get large, so this approach makes it easier to manage. The [CLI](/docs/cli) expects this layout, and [`rngo init`](/docs/cli/init) will
(partially) set it up for you.

The base spec file at `.rngo/spec.yml` contains a few parameters that you may want to adjust:

- [`key`](/docs/concepts/spec#key) is a meaningful identifier for the spec
- [`seed`](/docs/concepts/spec#seed) ensures the determinism of the simualation's RNG
- [`start` / `end`](/docs/concepts/spec#start-end) control the duration of the simulation

## Channels

You should define a [channel](/docs/concepts/channel) for any system interface that inputs [effects](/docs/concepts/effect) or outputs [signals](/docs/concepts/signal) (or both).

For example, here's a channel for a Postgres DB that might live at `.rngo/channels/db.yml`:

```yaml
format:
  type: sql
target:
  type: stream
  command: psql -q $DATABASE_URL
```

Every spec will include at least one _public_ channel, which may correspond to:

- REST API
- GraphQL API
- CLI

Additionally you may want to include _private_ channels in order to:

- apply historical effects (assuming public channels do not support backdating)
- set up or query state in SaaS sub-systems
- capture observability signals

These could correspond to:

- database - PostgreSQL, MySQL, SQLite, MongoDB, DynamoDB, DuckDB, etc.
- SaaS - Stripe, Better Auth, Resend, Shopify, Slack, etc.
- monitoring - Sentry, Datadog, Splunk, log files, etc.
- infrastructure - Cloudflare, AWS, GCP, Azure, etc.

## Effects

You should write an [effect](/docs/concepts/effect) for any of the following reasons:

- to model a client interaction
- to simulate historical usage
- to query data to be referenced by other effects

For example, this effect creates a user and might live at `.rngo/effects/user.create.yml`

```yaml
trigger: hz(1, hour)
channel: db
metadata:
  table: USERS
schema:
  type: object
  properties:
    name:
      type: string
      pattern: .{10,50}
    age:
      type: number
      minimum: 18
      scale: 0
```

Effects can be inferred from API definitions, e.g. add an effect for every endpoint:

- OpenAPI operations
- GraphQL queries / mutations
- RPC service methods

Or from database schemas - add an effect to create a record for every table:

- PostgreSQL: `pg_dump --schema-only mydb`
- MySQL: `mysqldump --no-data mydb`
- SQLite: `sqlite3 mydb .schema`
- Drizzle ORM: `cat db/schema.ts`
- Rails: `cat db/migrate/*.rb`

For schemaless DBs, infer writes from the source code and write effects.

## Invariants

You should write an [invariant](/docs/concepts/invariant) for every behavorial pattern you expect to observe.

For example, this invariant states that any attempt to create a user with an age less than 18
should result in an API error. It might live at `.rngo/invariants/minor-users-rejected.yml`:

```yaml
type: sql
query: >
  SELECT count(*) 
  FROM signals s
    JOIN effects e ON s.effect_id = e.id
  WHERE e.key = 'user.post'
  AND e.value ->> '$.age' < 18
  AND s.data NOT LIKE '%422 Unprocessable Content%';
expect: result == 0
```

Ideally, you'll be able to derive invariants from product and architectural documentation,
although in many cases the invariants themselves will be the source of truth.

## Schemas

You should avoid duplicating a [schema](/docs/concepts/schema) across multiple effects. Instead, add a
[custom schema type](/docs/concepts/schema#custom-schema-types) and reference it by name.

For example, if you add the following at `.rngo/schemas/uuid.yml`:

```yaml
schema:
  type: string
  pattern: ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$
```

You can reference it at, e.g., `.rngo/effects/user.create.yml`:

```yaml
trigger: hz(1, hour)
channel: db
schema:
  type: object
  properties:
    id:
      type: uuid
    name:
      type: string
```
