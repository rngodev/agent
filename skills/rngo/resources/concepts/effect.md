# Effect

An **effect** generates inputs to a system. For example, the following effect generates user creation input roughly once per hour:

```yaml
trigger: hz(1, hour)
channel: db
metadata:
  table: USERS
schema:
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

## Schema

An effect must specify a **schema**, which defines the structure and content of its inputs.

See the [Schema reference](/docs/schema) for more details.

## Trigger

An effect's **trigger** defines when it emits inputs. If not specified, an effect will emit roughly one input per day.

The value is in Hertz but is also an expression, so you can use the more readable `hz` function instead of a raw number:

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

## Channel

All effects are bound to a **channel**:

```yaml
channels:
  mydb:
    format:
      type: sql
    target:
      command: sqlite3 db.sqlite
effects:
  users.create:
    channel: mydb
    schema: ...
```

If a `channel` is not explicitly configured, the events will be written to the file system.

## Metadata

An effect may specify **metadata**, which is an arbitrary map:

```yaml
effects:
  create.article:
    channel: mysql
    metadata:
      table: Article
    schema: ...
```

In this case, the effect's metadata is meaningful to it's "mysql" channel. Assuming the channel uses the
"sql" format, it will use the `table` metadata field as the table name when formatting SQL statements.

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
schema:
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
schema:
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
