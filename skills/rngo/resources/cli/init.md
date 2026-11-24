# `rngo init`

Initializes a project for rngo.

The first step is to set up `.rngo/spec.yml` with a key and a default seed, e.g.:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/rngodev/rngo/main/schema/v1/spec.schema.json
version: 1
key: my-project
seed: 1
```

The `$schema` comment lets editors validate and autocomplete the spec.

Then it ensures the `.gitignore` includes the `.rngo/evals` directory, which is where data from evals will live.

Finally it asks if and where it should install agent skills. It installs the skills release that is compatible with the CLI's version:

```bash
✔ Would you like to install agent skills? · yes
✔ Where should skills be installed? · Standard Local (./.agents/skills)
./.agents/skills:
  rngo: installed 0.7.0
```

A coding agent is the easiest way to infer channels and effects. With the above skills installed, you can prompt your agent like so:

```
write the rngo spec!
```

If you are not using a coding agent, see the [channel](/docs/spec/channel) and [effect](/docs/spec/effect) references for details on how to define them manually.

## Flags

### --default

Skips all prompts: the key is the directory name, the seed is 1, and the skills are not installed.
