# function

Evaluates a [Common Expression Language (CEL)](https://github.com/google/cel-spec) expression and emits the result. The expression may reference named sub-generators specified in the `variables` property.

## Parameters

### `expression` — required

The [CEL](https://github.com/google/cel-spec) expression.

### `variables` — optional

An object of named [generator](/docs/spec/generator) definitions that may be referenced in `expression`.

## Examples

### Email

Random email addresses from a enumerated set of domains.

```yaml
type: function
expression: "local + '@' + domain"
variables:
  local:
    type: string
    pattern: "[a-z]{5,10}"
  domain:
    type: select
    options:
      - weight: 3
        generator: { type: constant, value: "gmail.com" }
      - weight: 2
        generator: { type: constant, value: "yahoo.com" }
      - weight: 2
        generator: { type: constant, value: "outlook.com" }
      - generator: { type: constant, value: "icloud.com" }
      - generator: { type: constant, value: "protonmail.com" }
```
