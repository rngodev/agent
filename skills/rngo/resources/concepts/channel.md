# Channel

**Channels** are proxies through which a simulation sends inputs and receives outputs
from the system-under-test. For example:

```yaml
channels:
  db:
    format:
      type: sql
    target:
      type: stream
      command: psql -q $DATABASE_URL
  api:
    target:
      type: exec
      command: curl -sS -X {{method}} $API_BASE_URL{{path}}
  log:
    target:
      type: stream
      command: tail -F logs/app.log
```

## Output

A channel _may_ produce outputs, which could be either:

- **interactive**, or explicitly caused by one input, e.g. a response to an HTTP request
- **ambient**, or having ambiguous causality, e.g. an application log line

In either case, every output is added to the simulation log and may be included in a [signal](/docs/concepts/signal).

Interactive outputs always include an `input_id` foreign key to the input that caused it. Currently, this will only come from systems with `exec`-type targets.

Ambient outputs come from systems with `stream`-type targets. They may come from channels that take inputs, e.g.:

```yaml
format:
  type: sql
target:
  type: stream
  command: psql -q $DATABASE_URL
```

Or from channels that do not expect inputs (and therefore do not need a format) e.g.:

```yaml
target:
  type: stream
  command: tail -F logs/app.log
```

Both channels will produce ambient outputs - i.e. without an input FK - because they are asynchronous, so causality is generally ambiguous.

## Private Channels

All simulations will include channels that proxy to public interfaces - e.g., APIs, web apps, CLIs. But most will also include channels
for private interfaces for a few different reasons.

### DBs

When a simulation starts in the past, it will produce backdated effects, and usually public interfaces do not support backdating.
So, you'll need to route these effects directly to a database.

### SaaS

Many systems keep state in SaaS, which means that the simulation will either need to set up or query that state in
order to [reference](/docs/schema/primitive/reference) it in other effects.

### Observability

Simulations often incorporate logs, metrics, traces, etc. as _read-only channels_ so that their outputs can be [signals](docs/concepts/signal).

## Target

A channel MUST specify a `target`, which defines how the channel sends data to and receives data from the system. Currently,
there are two supported `type`s: `exec` and `stream`.

### Exec

An **exec** target runs the specified shell `command` whenever it receives an effect. The command may be a [Handlebars](https://handlebarsjs.com/guide/#language-features)
template, to which the effect value is the input.

Any output from the command will be emitted as an interactive signal, i.e. one that includes the ID of the effect that triggered it.

### Stream

The specified `command` for a **stream** target will be run by the CLI in a sub-shell prior to the start of simulation. Whenever the channel receives an effect,
it pipes it into the stdin of the subshell.

Any data received from stdout or stderr will be emitted as an ambient signal, i.e. one without any explcit effect cause.

Relatedly, a stream target may be used to implement a read-only channel - i.e. one that no effect is routed to - since stdout and stderr will be proxied
regardless of effect input.

## Format

A channel MAY specify a `format`, which defines how the channel will transform effect data prior
to sending it to the target. Currently, there are two support `type`s: `sql` and `json`.

### SQL

The **sql** format will transform an effect body into a SQL insert statement. E.g., the following effect event value:

```json
{
  "id": 1,
  "name": "Alice",
  "admin": true
}
```

would become:

```sql
INSERT INTO `users` (id, name, admin) VALUES (1, 'Alice', true);
```

The table name is taken from the `table` field from the associated effect's [metadata](/docs/concepts/effect#metadata).
If that's not specifed, it will fallback to the effect's name.

### JSON

The **json** format is effectively a no-op currently - the channel will pass each effect event's value
directly to the target unchanged.

## Examples

### cURL

You can use cURL as an **exec** `target` for an API channel. This example uses a template
that expects the effect data to include `method` and `path` fields.

```yaml
target:
  type: exec
  command: curl -sS -X {{method}} $API_BASE_URL{{path}}
```

### PostgreSQL

Use a **stream** `target` and **sql** `format` to pipe SQL statements into `psql`'s stdin. In most cases,
this will be an example of a _private_ channel.

```yaml
format:
  type: sql
target:
  type: stream
  command: psql -q $DATABASE_URL
```

### Log File

Use a **stream** `target` to receive signals from a log file. This is an example of a read-only channel,
meaning no effects will be sent to it. Also, in most cases this will be _private_.

```yaml
target:
  type: stream
  command: tail -F logs/app.log
```
