# reference

Samples values from the run log for the specified [effect](/docs/spec/effect).

## Parameters

### `effect` — required

The key of the effect whose emitted values should be sampled.

### `cursor` — optional

How successive values are emitted - could be either of:

- `random` - any value from the effect could be pulled at any time - this is the default
- `unique` - values are sampled randomly, but are never repeated

## Examples

### Random Sample

```yaml
type: reference
effect: "users.create"
```

### Unique Sample

```yaml
type: reference
effect: "account.post"
cursor: unique
```
