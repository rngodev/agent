# number

Randomly generates decimal or integer values.

## Inputs

### `minimum` — optional

The minimum value (inclusive) to be generated. The default value is -1.7976931348623157×10³⁰⁸.

### `maximum` — optional

The maximum value (inclusive) to be generated. The default value is 1.7976931348623157×10³⁰⁸.

### `scale` — optional

The maximum number of digits that may be included after the decimal point. Set to zero to generate integers.

### `step` — optional

The size of the step between successive emitted values. If positive, the first value will be `minimum`. If negative, the first value will be `maximum`.

## Examples

Unbounded:

```json
{
  "type": "number"
}
```

Bounded:

```json
{
  "type": "number",
  "minimum": -3.14,
  "maximum": 2.71
}
```

Integer:

```json
{
  "type": "number",
  "minimum": 0,
  "maximum": 10000,
  "scale": 0
}
```

Incrementing ID:

```json
{
  "type": "number",
  "minimum": 1,
  "scale": 0,
  "step": 1
}
```
