# object

Randomly generates an object based upon the provided `properties` keyword.

## Keywords

### `properties` — required

An object that maps object property names to [schema](/docs/concepts/schema) definitions.

## Examples

```json
{
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
```
