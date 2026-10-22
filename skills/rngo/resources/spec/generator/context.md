# context

Emits a value from the simulation's dynamic context.

## Parameters

### `path` — required

The path to the desired value.

## Examples

### Current Logical Time

Get the current in-simulation ISO 8601 date and time:

```yaml
type: context
path: [clock, now]
```

### Trigger Event

Get the event that triggered the current effect:

```yaml
type: context
path: [trigger, event]
```
