# exec

Runs each input as a command in a sub-shell. It expects a string, and will record an error if it receives anything else. It will also record an error if the command has a non-zero exit.

Since the commands run in the shell, they can make use of features like quoting, expansions and pipes. Additionally the CLI will load the local `.env`, which means these commands can reference those environment variables.

The stdout of each command's sub-shell is recorded as an interactive [output](/docs/spec/channel#output), i.e. it includes the ID of the input that triggered it.

## Parameters

### `format` — optional

How to format the input prior to running as a command. See the [format reference](/docs/spec/format).

## Examples

### cURL

Sends inputs to an API using curl.

```yaml
type: exec
format:
  type: template
  template: curl -sS -X {{data.method}} ${API_BASE_URL:-http://localhost:5173}{{data.path}}
```

This uses a [`template`](/docs/spec/format/template) format that expects the effect data to include `method` and `path` fields. The `API_URL` can be picked up either from the environment, or a local `.env`.
