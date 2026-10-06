# `rngo run`

Runs a [spec](/docs/concepts/spec). By default, it:

1. builds the spec based upon the `.rngo` directory
2. runs the spec locally
3. routes the effects to the appropriate [channels](/docs/concepts/channel)
4. records all data in the local run directory

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

## Applying Inputs

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

In this case, all inputs from the `invoice.create` effect will be piped to the `sqlite3 db1.sqlite` command.

## Capturing Outputs

Each run gets its own directory, e.g. at:

```bash
.rngo/runs/01a005e6-1e8f-72b2-abfc-2da7a7a8dbdf/
```

This will contain:

- `spec.yml`, which has the full resolved spec used by the run
- `log.sqlite`, which is a SQLite database containing every input, output and metadata

The last run will be symlinked at

```bash
.rngo/runs/last
```

## Flags

### --stdout

Skip channel routing and write all inputs to stdout.

### --dry-run

Parse the spec and do nothing else. If it fails to parse a code of 1 will be returned.

### --realtime

Send each input to the system under test as close as possible to the input's timestamp.

The default behavior is to send inputs immediately. This flag will have no impact on backdated inputs, since their timestamps have already elapsed.

Existing with ctrl-c may result in logging a pending event that was never sent to the system.
