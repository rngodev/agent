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
| [rngo](https://github.com/rngodev/agent/tree/main/skills/rngo) | Write and update a project's rngo spec — infers channels and effects from the codebase, and authors invariants and custom schema types |
