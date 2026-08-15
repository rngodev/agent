# Spec

A **spec** is a description of a system's behavior, which is verified by the [`rngo run`](/docs/cli/run) CLI command. Here's an example:

```yaml
key: my-service
seed: 41
start: now - years(5)
end: now + minutes(3)
channels:
  sqlite:
    format:
      type: sql
    target:
      command: sqlite3 db.sqlite
effects:
  user.create:
    channel: sqlite
    metadata:
      table: USER
    schema:
      type: object
      properties:
        id:
          type: myId
        name:
          type: string
          pattern: .{0,36}
schemas:
  myId:
    schema:
      type: number
      minimum: 1
      scale: 0
      step: 1
invariants:
  no-errors:
    type: sql
    query: >
      select count(*) from signals
      where level = 'error';
    expect: result == 0
```

## Key

`key` is a unique, meaningful identifier for the spec. `rngo init` will set this to the name of the project's directory by default.

## Seed

`seed` is used to make the simulation's random number generator deterministic. It must be a positive integer, and defaults to `1`.

Changing `seed` lets you get a fresh set of data for an otherwise identical simulation.

## Start / End

`start` and `end` define the duration of the simulation.

Normally they are specified as relative [CEL](https://github.com/google/cel-spec), which may include the following variables and functions:

- `now` - the clock time when the spec is run
- `seconds(n)` / `second` - duration of `n` seconds
- `minutes(n)` / `minute` - duration of `n` minutes (`n * seconds(60)`)
- `hours(n)` / `hour` - duration of `n` hours (`n * minutes(60)`)
- `days(n)` / `day` - duration of `n` days (`n * hours(24)`)
- `weeks(n)` / `week` - duration of `n` weeks (`n * days(7)`)
- `months(n)` / `month` - duration of `n` months (`n * days(30)`)
- `years(n)` / `year` - duration of `n` years (`n * days(365)`)

The singular version is a shorthand for n = 1, e.g. `month` is equivalent to `months(1)`.

Either may also be expressed as a [ISO-8601 datetime](https://www.iso.org/iso-8601-date-and-time-format.html) string. So any of the
following are valid:

- `now - years(5)`
- `now - year - months(6)`
- `now + minutes(15)`
- `2026-08-10T23:07:15Z`

Each may resolve to any time past or future, as long as `start` is earlier than `end`.

By default `start` is `now - days(30)` and `end` is `now`.

## Channels

`channels` is a map of named [channels](/docs/concepts/channel), or system interfaces. Any channel referenced by an effect must be included in this map.

See [Channel](/docs/concepts/channel) for syntax details.

## Effects

`effects` is a map of named [effects](/docs/concepts/effect), or system interactions. It must contain at least one entry, but usually contains many.

See [Effect](/docs/concepts/effect) for syntax details.

## Invariants

`invariants` is a map of named [invariants](/docs/concepts/invariant) that must hold in order for an audit to pass.

See [Invariant](/docs/concepts/invariant) for syntax details.

## Schemas

`schemas` is a map of named custom [schemas](/docs/concepts/schema) that can be reused across effects to produce similar data.

See [Schema](/docs/concepts/schema) for syntax details.
