# Format

A **format** defines how an input is transformed into the text that a [channel](/docs/spec/channel) sends to the [subject system](/docs/concepts#subject). It is configured using the `format` field of a channel:

```yaml
channels:
  db:
    type: stream
    command: psql -q $DATABASE_URL
    format:
      type: sql
```

If a channel does not specify a format, the input's JSON-encoded data is sent as is.

## Primitive Types

A format is represented as a [discriminated union](docs/spec#discriminated-unions) of primitive types:

- [template](/docs/spec/format/template) - builds a string using a Handlebars template
- [sql](/docs/spec/format/sql) - formats the input as SQL insert
