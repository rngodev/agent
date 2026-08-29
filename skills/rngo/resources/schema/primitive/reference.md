# reference

Samples values from the run log for the specified [effect](/docs/concepts/effect).

## Parameters

### `effect` — required

The key of the effect whose emitted values should be sampled.

### `cursor` — optional

How successive values are emitted - could be either of:

- `random` - any value from the effect could be pulled at any time - this is the default
- `unique` - values are sampled randomly, but are never repeated

## Examples

Random sample:

```json
{
  "type": "reference",
  "effect": "users.create"
}
```

Random _unique_ sample:

```json
{
  "type": "reference",
  "effect": "account.post",
  "cursor": "unique"
}
```
