# Effect

An **effect** generates inputs to a [channel](/docs/channel). For example, the following effect generates user creation input roughly once per hour:

```yaml
trigger: hz(1, hour)
channel: db
metadata:
  table: USERS
generator:
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

## Parameters

### `prototype` — optional

A [prototype](/docs/spec/prototype) provides default values for the following parameters:

- `start`
- `end`
- `channel`

If not specified, the [default prototype](/docs/spec/prototype#default) will be used.

### `trigger` — optional

An effect's **trigger** defines when it emits inputs. If not specified, an effect will emit roughly one input per day.

The value is in Hertz but is also an [expression](/docs/reference/expressions), so you can use the more readable `hz` function instead of a raw number:

```
hz(5, minute)
```

rngo builds in variance, so the observed rate over any sub-interval of the simulation may be higher or lower than the configured one.

You can also configure growth by referencing `offset`:

```
hz(3, hour) + (0.0001 * offset)
```

The expression is sampled periodically over the course of the simulation, so the observed frequency will change in steps.

Trigger frequency will always be adjusted to be greater than or equal to zero and less than 1000 Hz.

### `start` — optional

When the effect starts. Defaults to the [prototype's](/docs/spec/prototype) `start`.

May be expressed as either an [ISO-8601](https://en.wikipedia.org/wiki/ISO_8601) string, or a [time expression](/docs/reference/expressions#time).

### `end` — optional

When the effect ends. Defaults to the [prototype's](/docs/spec/prototype) `end`.

May be expressed as either an [ISO-8601](https://en.wikipedia.org/wiki/ISO_8601) string, or a [time expression](/docs/reference/expressions#time).

### `channel` — optional

All effects are bound to a **channel**:

```yaml
channels:
  mydb:
    type: stream
    command: sqlite3 db.sqlite
    format:
      type: sql
effects:
  users.create:
    channel: mydb
    metadata:
      table: USERS
    generator: ...
```

Defaults to the [prototype's](/docs/spec/prototype) `channel`.

If a channel cannot be resolved, the effect's inputs will not be sent to the [proxy](/docs/concepts#proxy), but they will still be captured in the [log](/docs/concepts#log).

### `metadata` — optional

An effect may specify **metadata**, which is an arbitrary map:

```yaml
effects:
  create.article:
    channel: mysql
    metadata:
      table: Article
    generator: ...
```

In this case, the effect's metadata is meaningful to it's "mysql" channel. Assuming the channel uses the
"sql" format, it will use the `table` metadata field as the table name when formatting SQL statements.

### `generator` — required

Defines the structure and content of its inputs.

See the [generator reference](/docs/spec/generator) for more details.

## Examples

### DB History

To backfill user creation history, write an effect stream that runs from simulation start until "now"
and route the events directly to the "db" channel.

```yaml
trigger: hz(10, hour)
end: now
channel: db
metadata:
  table: USERS
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
      pattern: .{10,50}
    age:
      type: number
      minimum: 18
      scale: 0
    created_at:
      type: context
      path: ["clock", "now"]
```

### API Calls

Route realtime effects - i.e. happnening after "now" - to public channels, in this case the "api" channel.

```yaml
trigger: "hz(15, minute)"
start: now
end: now + minutes(3)
channel: api
generator:
  type: object
  properties:
    method:
      type: constant
      value: POST
    path:
      type: constant
      value: /articles
    body:
      type: object
      properties:
        authorId:
          type: function
          expression: "author.id"
          variables:
            author:
              type: reference
              effect: user.create
        title:
          type: string
          pattern: .{20,100}
        body:
          type: string
          pattern: .{100,1500}
```
