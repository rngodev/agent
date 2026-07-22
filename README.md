# rngo Agent

Everything your agent needs to work with rngo.

## Skills

This project contains a variety of [Agent skills](https://agentskills.io/) under [`/skills`](https://github.com/rngodev/agent/tree/main/skills).

The [rngo CLI](https://rngo.dev/docs/cli) will offer to install the skills when you run [`rngo init`](https://rngo.dev/docs/cli/init). You can also install them directly using [the Vercel `skills` CLI](https://www.skills.sh):

```sh
npx skills add rngodev/agent
```

Once installed, you can ask the agent to write rngo specs for you and write them to the `.rngo` directory:

| Skill  | Description |
| ------------- | ------------- |
| [rngo-system-inference](https://github.com/rngodev/agent/tree/main/skills/rngo-system-inference)  | Infer and create / update rngo systems |
| [rngo-effect-inference](https://github.com/rngodev/agent/tree/main/skills/rngo-effect-inference)  | Infer and create / update rngo effects |
| [rngo-custom-schema-type](https://github.com/rngodev/agent/tree/main/skills/rngo-custom-schema-type) | Create / update a custom schema type |
