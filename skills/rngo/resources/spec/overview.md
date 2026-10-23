# Spec

A **spec** describes the behavior of a system via a [simulation](/docs/concepts#simulation) and an [audit](/docs/concepts#audit). The simulation models realistic usage of the system while the audit sets expectations for observed behavior.

There are two ways of representing a spec:

1. via a [Rust DSL](https://crates.io/crates/rngo)
2. as a JSON (or YAML) object

This reference will focus on the JSON / YAML representation. Here's an example:

```yaml
key: my-service
seed: 41
start: now - years(5)
end: now + minutes(3)
channels:
  sqlite:
    type: stream
    command: sqlite3 db.sqlite
    format:
      type: sql
effects:
  user.create:
    channel: sqlite
    metadata:
      table: USER
    generator:
      type: object
      properties:
        id:
          type: number
          minimum: 1
          scale: 0
          step: 1
        name:
          type: string
          pattern: .{0,36}
signals:
  no-errors:
    type: sql
    query: >
      select count(*) from metadata
      where level = 'error';
    expect: result == 0
```

The `signals` parameter configures the audit, while the other parameters configure the simulation.

The [`rngo eval`](/docs/cli/eval) CLI command evaluates whether a spec hold for a given deployment of a system by running the simulation against the system, logging all data and then auditing the log.

## Discriminated Unions

Several component types within a spec are represented as [discriminated unions](https://en.wikipedia.org/wiki/Tagged_union). This means that the component takes a `type` parameter, whose value is an enum that determines the schema of the other parameters..

The spec component types that are represented as discriminated unions are:

- [generator](/docs/spec/generator)
- [format](/docs/spec)
- [channel](/docs/spec/channel)
- [signal](/docs/spec/signal)

You can see in the example above that each of these component types have a `type` parameter. In fact, the effect has a generator of type `object`, which has nested generators of types `number` and `string` - each has a different parameter schema.

## Parameters

### `key` — required

A unique, meaningful identifier for the spec.

`rngo init` will set this to the name of the project's directory by default.

### `seed` — optional

Makes the simulation's random number generator deterministic.

Must be a positive integer, and defaults to `1`.

Changing `seed` lets you get a fresh set of data for an otherwise identical simulation.

### `start` — optional

When the simulation starts.

May be any time past or future, but must come before `end`. Defaults to `now - days(30)`.

May be expressed as either an [ISO-8601](https://en.wikipedia.org/wiki/ISO_8601) string, or a [time expression](/docs/reference/expressions#time).

### `end` — optional

When the simulation ends.

May be any time past or future, but must come after `start`. Defaults to `now`.

May be expressed as either an [ISO-8601](https://en.wikipedia.org/wiki/ISO_8601) string, or a [time expression](/docs/reference/expressions#time).

### `channels` — optional

How to send inputs to and receive outputs from the system during the simulation

Must be an object of named channels. See the [channel reference](/docs/spec/channel) for how to define one.

### `effects` — required

How to generate inputs during the simulation.

Must be an object of named effects. See the [effect reference](/docs/spec/effect) for how to define one.

### `signals` — optional

What patterns to look for in the log during the audit.

Must be an object of named signals. See the [signal reference](/docs/spec/signal) for how to define one.

### `generators` — optional

Custom generator types that may be used within an effect.

Must be an object of named custom generator type. See the [custom generator types reference](/docs/spec/generator#custom-generator-types) for how to define one.
