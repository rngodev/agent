# object

Randomly generates an object based upon the provided `properties` keyword.

## Parameters

### `properties` — required

An object that maps object property names to [generator](/docs/spec/generator) definitions.

## Examples

### Person

```yaml
type: object
properties:
  name:
    type: string
  age:
    type: number
```
