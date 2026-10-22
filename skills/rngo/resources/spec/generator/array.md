# array

Generates an array of values from the specified `items` sub-generator.

## Parameters

### `items` — required

A sub-generator used to generate each array item.

### `minItems` — optional

The minimum size of each generated array. Defaults to 0.

### `maxItems` — optional

The maximum size of each generated array. Defaults to `minItems` plus 16.

## Examples

### Default Size Bounds

```yaml
type: array
items:
  type: object
  properties:
    name:
      type: string
    age:
      type: number
```

### Custom Size Bounds

```yaml
type: array
items:
  type: number
minItems: 10
maxItems: 90
```
