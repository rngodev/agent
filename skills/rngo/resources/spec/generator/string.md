# string

Randomly generates a string value.

## Parameters

### `pattern` — optional

The regular expression that generated strings must match. Defaults to `.{0,64}`.

## Examples

### Default Length

```yaml
type: string
```

### Custom Length

```yaml
type: string
pattern: ".{5,10}"
```

### UUID

```yaml
type: string
pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
```
