# Channel

**Channels** are how the [proxy](/docs/concepts#proxy) sends inputs to and receives outputs from interfaces in the [subject system](/docs/concepts#subject). For example:

```yaml
channels:
  db:
    type: stream
    command: psql -q $DATABASE_URL
    format:
      type: sql
  api:
    type: exec
    format:
      type: template
      template: curl -sS -X {{method}} $API_BASE_URL{{path}}
  log:
    type: stream
    command: tail -F logs/app.log
```

## Output

A channel _may_ produce outputs, which could be either:

- **interactive**, or explicitly caused by one input, e.g. a response to an HTTP request
- **ambient**, or having ambiguous causality, e.g. an application log line

In either case, every output is added to the log and may be included in a [signal](/docs/spec/signal).

Interactive outputs always include an `input_id` foreign key to the input that caused it. Currently, these will only come from `exec` channels.

Ambient outputs come from `stream` channels. They may come from channels that take inputs, or from read-only channels.

## Primitive Types

A channel is represented as a [discriminated union](docs/spec#discriminated-unions) of primitive types:

- [exec](/docs/spec/channel/exec) - runs each input as a command in a one-off sub-shell
- [stream](/docs/spec/channel/stream) - sends each input to the stdin of a command in a sub-shell

### `format` — optional

Defines how it will transform an input prior to sending it to the system. If no format is specified, the input's JSON-encoded data will be sent.

There are two supported type:
