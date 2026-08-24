# `rngo run`

Runs a [spec](/docs/concepts/spec). By default, it:

1. builds the spec based upon the `.rngo` directory
2. runs the spec locally
3. routes the effects to the appropriate [channels](/docs/concepts/channel)
4. stores all [effects](/docs/concepts/effect) and [signals](/docs/concepts/signal) in the local run directory

## Building a Spec

`rngo run` builds a spec based upon the contents of the local `.rngo` directory.

The base of the spec is the contents of `.rngo/spec.yml`. If this file doesn't exist, the base will be an empty spec with a seed of 1.

From there, it will merge in each file under the `.rngo/effects` directory. For example, if there was a file at `.rngo/effects/user.create.yml` with the following value:

```yaml
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
      pattern: .{2,64}
```

It will be inserted into the simulation like this:

```yaml
seed: 1
effects:
  user.create:
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
          pattern: .{2,64}
```

If the path already exists in `.rngo/config.yml`, the `.rngo/effects` file will be ignored. An analogous process happens for the files in the `.rngo/systems` and `.rngo/schemas` directories.

## Applying Effects

`rngo run` will run the spec and routes the stream of inputs to the appropriate [channels](/docs/concepts/channel).

Consider the following excerpt from a spec:

```yaml
channels:
  db1:
    format:
      type: sql
    target:
      command: sqlite3 db1.sqlite
effects:
  invoice.create:
    channel: db1
    schema:
      type: object
      # ...
```

In this case, all events for the `invoice.create` effect will be piped into the `sqlite3 db1.sqlite` command.

You can specify a raw output for an effect, like this:

```yaml
effects:
  orders.create:
    schema:
      type: object
      # ...
```

`rngo run` will route to a default channel — in this case, it is effectively something like:

```yaml
format:
  type: json
import:
  command: cat > .rngo/runs/019f3fd6-8d2e-7101-9b68-b4b63cb2bb19/orders.jsonl
```

You can set the `--stdout` boolean flag, e.g.:

```
rngo run --stdout
```

This will skip channel routing and write all event values to stdout.

## --dry-run

If `--dry-run` is specified, the spec will be parsed and nothing else. If it fails to parse a code of 1 will be returned.
