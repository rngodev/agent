---
name: rngo-effect-inference
description: Infer and create rngo effect configuration YAML files under .rngo/effects/ from a system contexts.
---

# rngo Effect Inference Skill

Your job is to create a configuration file for each **effect** inferred from the **_system_** context.

## Overview

An **effect** models any interaction with a system, such as a database insert.

Effects are defined in YAML files in the `.rngo/effects/` directory, with one file per effect named `{EFFECT_KEY}.yml`. Each file's extension MUST BE `.yml` and should NEVER BE `.yaml`.

## Effect Components

### 1. Schema

Every effect MUST have a `schema` that defines the structure and content of generated data. This uses the same primitive schema types as custom schema types:

- [`array`](references/array.md) — Generates an array of values from the specified `items` sub-schema.
- [`constant`](references/constant.md) — Endlessly emits the specified literal value.
- [`context`](references/context.md) — Emits a value from the simulation's dynamic context.
- [`function`](references/function.md) — Evaluates a [Common Expression Language (CEL)](https://github.com/google/cel-spec) expression and emits the result.
- [`number`](references/number.md) — Randomly generates decimal or integer values.
- [`object`](references/object.md) — Randomly generates an object based upon the provided `properties` keyword.
- [`reference`](references/reference.md) — Samples values previously emitted by an effect in the same simulation.
- [`select`](references/select.md) — Emits a value from exactly one of a set of sub-schemas, selected at random.
- [`string`](references/string.md) — Randomly generates a string value.

There are no dedicated `boolean`, `enum`, or `null` types — compose them from the above:

- **boolean**: `select` between two `constant` options (`true` / `false`)
- **enum**: `select` between `constant` options, one per allowed value (add `weight` to skew the distribution)
- **null** / **nullable**: `select` between the real schema and `{ type: constant, value: null }`

### 2. Trigger

`trigger` defines how frequently the effect generates events, in Hertz. Use the `hz(count, unit)` helper for readability:

```yaml
trigger: hz(100, day)
```

```yaml
trigger: hz(5, minute)
```

You can configure growth over the simulation by referencing `offset` (milliseconds since the simulation start):

```yaml
trigger: hz(3, hour) + (0.0001 * offset)
```

Trigger frequency is always clamped between 0 and 1000 Hz. If not specified, an effect defaults to roughly one event per day.

### 3. System

`system` associates an effect with a system defined in `.rngo/systems/`. If omitted, events are written to the local filesystem instead.

```yaml
system: mydb
```

### 4. Format

`format` sets effect-specific properties for the system's format. For example, for a SQL system, you should set the table like this:

```yaml
format:
  table: USERS
```

## Complete Effect Examples

### User Effect (Standalone)

```yaml
# .rngo/effects/users.create.yml
trigger: hz(1, day)
system: db
format:
  table: users
schema:
  type: object
  properties:
    id:
      type: number
      minimum: 1
      scale: 0
      step: 1
    name:
      type: function
      expression: givenName + ' ' + familyName
      variables:
        givenName:
          type: select
          options:
            - schema: { type: constant, value: Alice }
            - schema: { type: constant, value: Bob }
        familyName:
          type: select
          options:
            - schema: { type: constant, value: Smith }
            - schema: { type: constant, value: Jones }
    email:
      type: function
      expression: username + '@example.com'
      variables:
        username:
          type: string
          pattern: .{5,10}
    createdAt:
      type: context
      path: ["clock", "now"]
```

### Post Effect (with References)

```yaml
# .rngo/effects/posts.create.yml
trigger: hz(0.5, day)
system: db
format:
  table: POSTS
schema:
  type: object
  properties:
    id:
      type: number
      minimum: 1
      scale: 0
      step: 1
    title:
      type: string
      pattern: .{10,100}
    content:
      type: select
      options:
        - schema: { type: constant, value: Lorem ipsum dolor sit amet. }
        - schema: { type: constant, value: Consectetur adipiscing elit. }
    authorId:
      type: function
      expression: author.id
      variables:
        author:
          type: reference
          effect: users.create
    createdAt:
      type: context
      path: ["clock", "now"]
```

### Order Effect

```yaml
# .rngo/effects/orders.create.yml
trigger: hz(2, second)
system: db
format:
  table: ORDERS
schema:
  type: object
  properties:
    id:
      type: number
      minimum: 1
      scale: 0
      step: 1
    userId:
      type: function
      expression: user.id
      variables:
        user:
          type: reference
          effect: users.create
    total:
      type: number
      minimum: 10.00
      maximum: 1000.00
    status:
      type: select
      options:
        - schema: { type: constant, value: pending }
        - schema: { type: constant, value: completed }
        - schema: { type: constant, value: cancelled }
```

### Database Table Effect

```yaml
# .rngo/effects/customers.create.yml
trigger: hz(1, day)
system: db
format:
  table: CUSTOMERS
schema:
  type: object
  properties:
    id:
      type: number
      minimum: 1
      scale: 0
      step: 1
    name:
      type: function
      expression: givenName + ' ' + familyName
      variables:
        givenName:
          type: select
          options:
            - schema: { type: constant, value: Alice }
            - schema: { type: constant, value: Bob }
        familyName:
          type: select
          options:
            - schema: { type: constant, value: Smith }
            - schema: { type: constant, value: Jones }
    email:
      type: function
      expression: username + '@example.com'
      variables:
        username:
          type: string
          pattern: .{5,10}
```

## Inference Best Practices

### 1. Analyze Database Schema

- Use `object` for tables and collections - property names MUST EXACTLY match table column names
- Map columns to `object` properties with sub-schemas matching the column type
- Use `number` with `scale: 0` for primary keys (add `step: 1` for auto-incrementing IDs)
- Use `reference` for foreign keys
- For nullable columns, `select` between the real schema and `{ type: constant, value: null }`

### 2. Determine Entity Relationships

- Use `reference` for foreign key relationships
- Wrap references in `function` to extract specific fields
- `reference` samples with replacement - it does not support a one-to-one/unique mode

### 3. Choose Appropriate Trigger Frequencies

- High-frequency effects (events, logs): `trigger: hz(100, hour)` to `trigger: hz(1000, hour)`
- Medium-frequency (posts, orders): `trigger: hz(10, hour)` to `trigger: hz(50, hour)`
- Low-frequency (users, products): `trigger: hz(1, hour)` to `trigger: hz(10, day)`
- Use dynamic triggers for growing datasets: `trigger: hz(10, day) + (0.0001 * offset)`

### 4. Always specify System

- Use `system: NAME` where NAME is the name of the system from whose context this effect was inferred.

### 5. Compose Realistic Data from Primitives

- Build names and emails with `function` + `select` (see the examples above), not a single generic field
- Use `context` with `path: ['clock', 'now']` for timestamps

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

### 7. Handle Null/Optional Values

- `select` between the real schema and `{ type: constant, value: null }` for optional fields
- Consider minimum/maximum constraints

### 8. File Naming

- Use `[SCOPE].[TYPE].yml` format, where scope is the name of the table, collection or other entity that the effect applies to, e.g. `users.create.yml`
- If there is no obvious target, use simply `[ACTION].yml`, e.g. `sign-out.yml`
- If there are multiple systems, use `[SYSTEM].[SCOPE].[ACTION].yml`, e.g. `mysql.posts.create.yml`
- Use table / collection / etc. as the scope when possible
- Use lower case for everything and kebab-case for multi-word parts, e.g. `order-items.create-empty.yml`

## Validation Rules

1. Every effect MUST have a `schema` field
2. The `schema` MUST have a `type` field
3. `system` is optional - if omitted, events are written to the local filesystem
4. The `trigger` field, if present, must be a valid expression (e.g. `hz(count, unit)`, optionally combined with `offset`)
5. References must point to existing effects
6. Function expressions must be valid CEL syntax

## System Inference

Every effect MUST be inferred from a system context. For example, if this system is defined in `.rngo/systems/db.yml`:

```yaml
# .rngo/systems/mydb.yml
format:
  type: sql
import:
  command: sqlite3 db.sqlite
infer:
  context:
    description: sqlite schema dump
    command: sqlite3 db.sqlite '.schema'
```

You should create an effect for every table in the schema dump, each of which should have a `system` field with a value of `db`. For example:

```yaml
# .rngo/effects/users.create.yml
system: db
format:
  table: users
schema:
  type: object
  properties:
    id:
      type: number
      minimum: 1
      scale: 0
      step: 1
    email:
      type: function
      expression: username + '@example.com'
      variables:
        username:
          type: string
          pattern: .{5,10}
    name:
      type: string
      pattern: .{2,64}
```

## Output Format

Write each effect to: `.rngo/effects/{EFFECT_KEY}.yml`

Use YAML format with proper indentation (2 spaces).

Always validate:

- Schema structure is correct
- format/system mutual exclusivity
- References point to valid effects
- Trigger frequencies are reasonable for the effect type
