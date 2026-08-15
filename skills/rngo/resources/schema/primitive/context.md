# context

Emits a value from the simulation's dynamic context.

## Inputs

### `path` — required

The path to the desired value.

## Examples

Get the current in-simulation ISO 8601 date and time:

```json
{
  "type": "context",
  "path": ["clock", "now"]
}
```

Get the event that triggered the current effect:

```json
{
  "type": "context",
  "path": ["trigger", "event"]
}
```
