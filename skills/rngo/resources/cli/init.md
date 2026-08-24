# `rngo init`

Initializes a project for rngo.

The first step is to set up `.rngo/spec.yml` with a key and a default seed, e.g.:

```yaml
key: my-project
seed: 1
```

Then it ensures the `.gitignore` includes the `.rngo/runs` directory, which is where data from simulation runs will live.

Finally it asks if and where it should install agent skills:

```bash
✔ Would you like to install agent skills? · yes
✔ Where should skills be installed? · Standard Local (./.agents/skills)
./.agents/skills:
  rngo-custom-schema-type: installed 0.2.0
  rngo-effect-inference: installed 0.2.0
  rngo-channel-inference: installed 0.2.0
```

A coding agent is the easiest way to infer systems and effects. With the above skills installed, you can prompt your agent like so:

```
infer rngo systems and effects!
```

If you are not using a coding agent, see the [channel](/docs/concepts/channel) and [effect](/docs/concepts/effect) references for details on how to define them manually.

## `--default`

The `--default` flag will ask for the default key and seed, and choose not to install the skill.
