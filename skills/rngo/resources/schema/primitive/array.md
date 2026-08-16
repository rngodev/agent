# array

Generates an array of values from the specified `items` sub-schema.

## Inputs

### `items` — required

A sub-schema used to generate each array item.

### `minItems` — optional

The minimum size of each generated array. Defaults to 0.

### `maxItems` — optional

The maximum size of each generated array. Defaults to `minItems` plus 16.

## Examples

Default size bounds:

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string"
      },
      "age": {
        "type": "number"
      }
    }
  }
}
```

Custom size bounds:

```json
{
  "type": "array",
  "items": {
    "type": "number"
  },
  "minItems": 10,
  "maxItems": 90
}
```
