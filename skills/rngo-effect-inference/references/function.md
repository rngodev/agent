# function

Evaluates a [Common Expression Language (CEL)](https://github.com/google/cel-spec) expression and emits the result. The expression may reference named sub-schemas specified in the `variables` property.

## Keywords

### `expression` — required

The [CEL](https://github.com/google/cel-spec) expression.

### `variables` — optional

An object of named [schema](/docs/concepts/schema) definitions that may be referenced in `expression`.

## Examples

```json
{
  "type": "function",
  "expression": "username + '@' + domain",
  "variables": {
    "username": {
      "type": "string",
      "pattern": ".{2,64}"
    },
    "domain": {
      "type": "select",
      "options": [
        {
          "weight": 5,
          "schema": {
            "type": "constant",
            "value": "example.com"
          }
        },
        {
          "weight": 2,
          "schema": {
            "type": "constant",
            "value": "example.org"
          }
        }
      ]
    }
  }
}
```
