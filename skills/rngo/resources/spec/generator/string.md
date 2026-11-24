# string

Randomly generates a string value.

## Parameters

### `pattern` — required

The regular expression that generated strings must match. It always matches the whole value, so anchors (`^` and `$`) are not supported.

## Examples

### Custom Length

```yaml
type: string
pattern: ".{5,10}"
```

### UUID

```yaml
type: string
pattern: "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
```
