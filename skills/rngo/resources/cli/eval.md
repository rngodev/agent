# `rngo eval`

Evaluates a [spec](/docs/spec). By default, it:

1. builds the spec based upon the `.rngo` directory
2. runs the simulation locally
3. routes the inputs to the appropriate [channels](/docs/spec/channel)
4. records all data in the local eval directory

## Building a Spec

`rngo eval` builds a spec based upon the contents of the local `.rngo` directory.

The base of the spec is the contents of `.rngo/spec.yml`. If this file doesn't exist, the base will be an empty spec with a seed of 1.

From there, it will merge in each file under the `.rngo/effects` directory. For example, if there was a file at `.rngo/effects/user.create.yml` with the following value:

```yaml
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
      pattern: .{2,64}
```

It will be inserted into the simulation like this:

```yaml
seed: 1
effects:
  user.create:
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
          pattern: .{2,64}
```

If the key already exists in `.rngo/spec.yml`, the `.rngo/effects` file replaces it. The same process applies to the `.rngo/channels`, `.rngo/generators` and `.rngo/signals` directories.

To use another location, pass it as an argument: either a directory, or a single file that holds the whole spec:

```bash
rngo eval path/to/project
rngo eval spec.yml
```

## Applying Inputs

`rngo eval` will run the simulation and route the stream of inputs to the appropriate [channels](/docs/spec/channel).

Consider the following excerpt from a spec:

```yaml
channels:
  db1:
    type: stream
    command: sqlite3 db1.sqlite
    format:
      type: sql
effects:
  invoice.create:
    channel: db1
    generator:
      type: object
      # ...
```

In this case, all inputs from the `invoice.create` effect will be piped to the `sqlite3 db1.sqlite` command.

## Capturing Outputs

Each eval gets its own directory, e.g. at:

```bash
.rngo/evals/01a005e6-1e8f-72b2-abfc-2da7a7a8dbdf/
```

This will contain:

- `spec.json`, which has the full resolved spec
- `spec.rewritten.json`, which has the spec that actually ran, if `--scenario` or `--stdout` changed it
- `log.sqlite`, which is a SQLite database containing every input, output and metadata

The last eval will be symlinked at

```bash
.rngo/evals/last
```

## Flags

### --dry-run

Check that the simulation can be built, and do nothing else. If it fails, a code of 1 will be returned.

### --limit

Cap the number of inputs the eval produces.

### --realtime

Send each input to the system under test as close as possible to the input's timestamp.

The default behavior is to send inputs immediately. This flag will have no impact on backdated inputs, since their timestamps have already elapsed.

An input is only logged once it is due. Stopping with ctrl-c ends the wait, audits what ran, and exits with code 1; a second ctrl-c exits immediately.

### --scenario

Run the eval for particular [prototype scenario](/docs/spec/prototype). Depending on the spec, this may change parameters for multiple effects, most commonly `start` and `end`.

### --stdout

Write inputs to stdout instead of sending them to their channels. Each channel's format still applies, and inputs from effects without a channel are not printed.
