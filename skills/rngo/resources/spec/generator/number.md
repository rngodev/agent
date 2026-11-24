# number

Randomly generates decimal or integer values.

With no bounds, it can produce any finite double, including fractions. With only one bound, values are offset from that bound by a random magnitude: added to `minimum` or subtracted from `maximum`. A range wider than the largest finite double is a parse error.

## Parameters

### `minimum` — optional

The minimum value (inclusive) to be generated. If omitted, may generate values may be as low as -1.7976931348623157×10³⁰⁸.

### `maximum` — optional

The maximum value to be generated. Exclusive when `minimum` is also set, before rounding to `scale`. If omitted, may generate values may be as high as 1.7976931348623157×10³⁰⁸.

### `scale` — optional

The maximum number of digits that may be included after the decimal point. Set to zero to generate integers.

### `step` — optional

The size of the step between successive emitted values. If positive, `minimum` must be specified, and will be the first value. If negative, `maximum` must be specified and will be the first value.

## Examples

### Unbounded

```yaml
type: number
```

### Bounded

```yaml
type: number
minimum: -3.14
maximum: 2.71
```

### Integer

```yaml
type: number
minimum: 0
maximum: 10000
scale: 0
```

### Incrementing ID

All natural numbers in order, starting with `1`.

```yaml
type: number
minimum: 1
scale: 0
step: 1
```
