# string

Randomly generates a string value.

## Attributes

### `pattern` — optional

The regular expression that generated strings must match. Defaults to `.{0,64}`.

## Examples

Less than 64 characters:

```json
{
  "type": "string"
}
```

Between 5 and 10 characters:

```json
{
  "type": "string",
  "pattern": ".{5,10}"
}
```

UUID:

```json
{
  "type": "string",
  "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
}
```
