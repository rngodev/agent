# Signal

A **signal** is an output from a [channel](/docs/concepts/channel), which could be either:

- **interactive**, or explicitly caused by one [effect](/docs/concepts/effect), e.g. a response to an HTTP request
- **ambient**, or having ambiguous causality, e.g. an application log line

In either case, every signal is stored in the simulation log and may be the target of an [invariant](/docs/concepts/invariant).

Interactive signals always include an `effect_id` foreign key to the effect that caused it. Currently, this will only come from systems with `exec`-type imports.

Ambient signals come from systems with `stream`-type target. They may come from channels that take effects, e.g.:

```yaml
format:
  type: sql
target:
  type: stream
  command: psql -q $DATABASE_URL
```

Or from channels that do not expect effects (and therefore do not need a format) e.g.:

```yaml
target:
  type: stream
  command: tail -F logs/app.log
```

Both channels will produce ambient signals - i.e. without an effect FK - because they are asynchronous, so causality is generally ambiguous.
