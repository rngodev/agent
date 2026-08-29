# `rngo skills install`

Installs the latest version of rngo's agent skills.

By default, this command will ask where to install the skills:

```bash
? Where should skills be installed? ›
❯ Standard Local (./.agents/skills)
  Claude Local (./.claude/skills)
  Standard Global (~/.agents/skills)
  Claude Global (~/.claude/skills)
  Other
```

If the skills at the selected directory are out-of-date, the CLI will remove them and replace them with latest release from [https://github.com/rngodev/agent](https://github.com/rngodev/agent).

## Flags

### --path

You can directly specify the location using the `--path` flag:

```bash
rngo skills intall --path ~/.myagent/skills
```
