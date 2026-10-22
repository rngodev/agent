# stream

Runs the specified `command` in a sub-shell prior to the start of an eval, then pipes each input to the sub-shell's stdin.

Similar to [`exec`](/docs/spec/channel/exec), the `command` can take advantage of shell features and reference environment variables in the local `.env`.

Any data received from stdout or stderr is recorded as an ambient [output](/docs/spec/channel#output), i.e. one that does not reference any input.

A `stream` channel may also be used to implement a read-only channel - i.e. one that no input is routed to - since the channel records stdout and stderr regardless of effect input.

## Parameters

### `command` — required

The command to run in a sub-shell.

### `format` — optional

How to format the input prior to piping to stdin. See the [format reference](/docs/spec/format).

## Examples

### PostgreSQL

Use the **sql** `format` to pipe SQL statements into `psql`'s stdin.

```yaml
type: stream
command: psql -q $DATABASE_URL
format:
  type: sql
```

### Log File

Receive signals from a log file. This is an example of a read-only channel, meaning no effects will be sent to it.

```yaml
type: stream
command: tail -F logs/app.log
```
