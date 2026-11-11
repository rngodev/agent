# Prototype

A **prototype** provides default values for effects. For example:

```yaml
prototypes:
  backfill:
    channel: db
    start: now - years(2)
    end: now
    scenarios:
      small:
        start: now - months(2)
effects:
  user.create:
    prototype: backfill
    trigger: hz(5, hour)
    generator: ...
```

By referencing the `backfill` prototype, the `user.create` effect will use the prototype's `channel`, `start` and `end` attributes.

Additionally, the `backfill` prototype defines one **scenario**, which means that when the CLI [eval command](/docs/cli/eval) is run like this:

```bash
rngo eval --scenario small
```

The prototype will effectively be:

```yaml
channel: db
start: now - months(2)
end: now
```

## Default

If an effect does not explicitly reference a named prototype, it uses the **default prototype**, which is defined by the `start` and `end` parameters at the [top level of the spec](/docs/spec#parameters).

## Parameters

### `channel` — optional

The key of the channel to which member effects will send inputs, by default.

An effect may override its prototype's channel. If channel is not specified at the prototype level, each effect _must_ specify a channel.

### `start` — optional

When each member effect starts, by default.

May be expressed as either an [ISO-8601](https://en.wikipedia.org/wiki/ISO_8601) string, or a [time expression](/docs/reference/expressions#time).

An effect may override its prototype's start.

### `end` — optional

When each member effect ends, by default.

May be expressed as either an [ISO-8601](https://en.wikipedia.org/wiki/ISO_8601) string, or a [time expression](/docs/reference/expressions#time).

An effect may override its prototype's end.

### `scenarios` — optional

An object of named prototype overrides, which will be applied when the CLI eval is run with the corresponding `--scenario` flag.

A single scenario key may be used across multiple prototypes:

```yaml
prototypes:
  phaseOne:
    start: now - years(2)
    end: now - years(1)
    scenarios:
      small:
        start: now - months(6)
        end: now - months(3)
  phaseTwo:
    start: now - years(1)
    end: now
    scenarios:
      small:
        start: now - months(3)
```
