# Signal

A **signal** describes a pattern that may emerge from simulation inputs, outputs and / or metadata.

It may be paired with an expectation. For example, here's one that expects no error-level outputs:

```yaml
type: sql
query: >
  select count(*) from output
  where level = 'error';
expect: result == 0
```

## Primitive Types

A signal is represented as a [discriminated union](docs/spec#discriminated-unions) of primitive types (although there is currently only one such type):

- [sql](/docs/spec/signal/sql) - calculates the signal with a SQLite query
