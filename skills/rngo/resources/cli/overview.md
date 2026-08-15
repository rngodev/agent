# CLI

The rngo CLI manages project configurations, runs simulations and routes effect to channels.

The source code can be found [in the `rngo` repository](https://github.com/rngodev/rngo/tree/main/crates/cli).

## Installation

You can install the rngo CLI on macOS and Linux using Homebrew:

```
brew install rngodev/tap/cli
```

Or, you can pull down a precompiled binary from [https://github.com/rngodev/rngo/releases/latest](https://github.com/rngodev/rngo-rs/releases/latest)

Additionally, Rust users can build from source via:

```
cargo install rngo-cli
```

## Project Configuration

The configuration for a project lives in the local `.rngo` directory.

`.rngo/spec.yml` contains the base simulation spec, which may look something like this:

```yaml
key: my-project
seed: 41
start: now - years(3)
end: now + hours(12)
```

### Schema

| Key     |          | Description                                                                               |
| ------- | -------- | ----------------------------------------------------------------------------------------- |
| `key`   | required | A unique identifier for the project, used to distinguish its specs from others.           |
| `seed`  | optional | The default seed for the simulation's RNG, ensuring reproducible runs.                    |
| `start` | optional | The starting point in time for the simulation. Accepts expressions like `now - weeks(8)`. |
| `end`   | optional | The ending point in time for the simulation. Accepts expressions like `now + days(1)`.    |

Systems and effects each get their own configuration files under `.rngo/systems/`, `.rngo/effects/` and `.rngo/schemas/`, e.g.:

```
> ls -l .rngo
.rngo/config.yml
.rngo/systems/db.yml
.rngo/effects/user.create.yml
.rngo/effects/post.create.yml
.rngo/effects/comment.create.yml
.rngo/schemas/email.yml
```

See the [channel](/docs/concepts/channel), [effect](/docs/concepts/effect), and [schema](/docs/concepts/schema) references to see how to customize.
