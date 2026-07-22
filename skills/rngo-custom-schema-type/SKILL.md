---
name: rngo-custom-schema-type
description: Create or update a custom schema type YAML file under .rngo/schemas/ for the rngo CLI, composed from rngo's primitive schema types (array, constant, context, function, number, object, reference, select, string).
---

# rngo Custom Schema Type Skill

Your job is to add a **custom schema type** configuration file based upon the user prompt.

## Overview

A **custom schema type** defines the structure and content of a data type that may be used by many effects. It is defined in terms of **primitive schema types** which are provided by rngo and documented below.

Custom schema types are defined in YAML files in the `.rngo/schemas/` directory, with one file per effect named `{SCHEMA_KEY}.yml`. Each file's extension MUST BE `.yml` and should NEVER BE `.yaml`.

## Structure

A custom schema type MUST have a `schema` field that has either a primitive schema type, or another custom schema type (assuming no cycles).

#### Primitive Schema Types

- [`array`](references/array.md) — Generates an array of values from the specified `items` sub-schema.
- [`constant`](references/constant.md) — Endlessly emits the specified literal value.
- [`context`](references/context.md) — Emits a value from the simulation's dynamic context.
- [`function`](references/function.md) — Evaluates a [Common Expression Language (CEL)](https://github.com/google/cel-spec) expression and emits the result.
- [`number`](references/number.md) — Randomly generates decimal or integer values.
- [`object`](references/object.md) — Randomly generates an object based upon the provided `properties` keyword.
- [`reference`](references/reference.md) — Samples values previously emitted by an effect in the same simulation.
- [`select`](references/select.md) — Emits a value from exactly one of a set of sub-schemas, selected at random.
- [`string`](references/string.md) — Randomly generates a string value.

## Examples

### UUID

```yaml
# .rngo/schemas/uuid.yml
schema:
  type: string
  format: ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$
```

### ID

```yaml
# .rngo/schemas/id.yml
schema:
  type: number
  minimum: 0
  scale: 0
  step: 1
```

### Email

```yaml
# .rngo/schemas/email.yml
schema:
  type: function
  expression: "username + '@' + domain"
  variables:
    username:
      type: string
      pattern: "[a-z]{5,10}"
    domain:
      type: select
      options:
        - weight: 3
          schema: { type: constant, value: "gmail.com" }
        - weight: 2
          schema: { type: constant, value: "yahoo.com" }
        - weight: 2
          schema: { type: constant, value: "outlook.com" }
        - schema: { type: constant, value: "icloud.com" }
        - schema: { type: constant, value: "protonmail.com" }
```

### Name

```yaml
# .rngo/schemas/name.yml
schema:
  type: function
  expression: "givenName + ' ' + familyName"
  variables:
    givenName:
      type: select
      options:
        - schema: { type: constant, value: "Alice" }
        - schema: { type: constant, value: "Marcus" }
        - schema: { type: constant, value: "Priya" }
        - schema: { type: constant, value: "James" }
        - schema: { type: constant, value: "Fatima" }
        - schema: { type: constant, value: "Noah" }
        - schema: { type: constant, value: "Sofia" }
        - schema: { type: constant, value: "Liam" }
        - schema: { type: constant, value: "Grace" }
        - schema: { type: constant, value: "Ethan" }
        - schema: { type: constant, value: "Ana" }
        - schema: { type: constant, value: "David" }
    familyName:
      type: select
      options:
        - schema: { type: constant, value: "Johnson" }
        - schema: { type: constant, value: "Chen" }
        - schema: { type: constant, value: "Patel" }
        - schema: { type: constant, value: "O'Connor" }
        - schema: { type: constant, value: "Al-Sayed" }
        - schema: { type: constant, value: "Kim" }
        - schema: { type: constant, value: "Rossi" }
        - schema: { type: constant, value: "Murphy" }
        - schema: { type: constant, value: "Nakamura" }
        - schema: { type: constant, value: "Walker" }
        - schema: { type: constant, value: "Silva" }
        - schema: { type: constant, value: "Okafor" }
```

## Custom Schema Type Best Practices

### 1. Avoid references

- Use `object` for tables and collections - property names MUST EXACTLY match table column names
- Map columns to `object` properties with sub-schemas matching the column type
- Use `id.integer` for primary keys
- Use `reference` for foreign keys
- Use `util.nullable` for nullable columns

### 6. Use Functions Only When Better Alternatives Do Not Exist

- Use `function` to compute derived values
- Use `function` to extract fields from `reference` types
- Access fields with dot notation: `user.profile.age`
- CEL operation support:
  - arithmetic: `-`, `+`, `*`, `/`
  - relations: `==`, `!=`, `<`, `<=`, `>`, `>=`
  - logic: `!`, `&&`, `||`
  - string concatenation: `+`
- ONLY USE variables listed in the schema, or operations listed here

## Validation Rules

1. Every effect MUST have a `schema` field
2. The `schema` MUST have a `type` field
3. Every effect MUST have a `system` field
4. The `rate` field, if present, must be a string (expression)
5. References must point to existing entities
6. Function expressions must be valid CEL syntax
7. Domain types must be from the supported list
