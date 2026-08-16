# rngo Agent

Everything your agent needs to work with rngo.

## Skills

This project contains a rngo [skill](https://agentskills.io/) which will write or update a rngo [spec](https://rngo.dev/docs/concepts/spec) for you.

The [rngo CLI](https://rngo.dev/docs/cli) will offer to install the skill when you run [`rngo init`](https://rngo.dev/docs/cli/init), or you can install  it later via [`rngo skills install`](https://rngo.dev/docs/cli/skills/install).

You can also install them using [the Vercel `skills` CLI](https://www.skills.sh):

```sh
npx skills add rngodev/agent
```

Either way, once installed, you can prompt your agent like this:

```
update the rngo spec
```
