# Schema

A **schema** defines the structure and content of an [effect's](/docs/concepts/effect) events. Consider the following schema spec:

```yaml
type: object
properties:
  email:
    type: function
    expression: username + '@' + domain
    variables:
      username:
        type: string
        pattern: .{2,64}
      domain:
        type: select
        options:
          - schema:
              type: constant
              value: example.com
          - schema:
              type: constant
              value: example.org
  age:
    type: number
    scale: 0
    minimum: 0
    maximum: 120
```

It will endlessly emit values that look like this:

```json
{ "email": "kjandfa@example.com", "age": 16 }
{ "email": "9jsm348vk@example.org", "age": 77 }
{ "email": "111//??@example.org", "age": 58 }
```

## Discriminator

The `type` field of a schema spec acts as the discriminator - i.e. it determines the other fields that you may (or must) specify in the spec.

In the above example, the top-level spec has type `object`, which requires a `properties` field, while its `age` property has type `number`, which accepts optional `minimum` and `maximum` fields.

## Composition

Schemas compose in that some schema types expect other schemas as inputs.

In the above example, we specify schemas in the `variables` field of the `function` schema spec which is itself specified as part of the `properties` field of the top-level `object` schema spec.

See the [schema reference](/docs/schema) for all available schemas.

## Custom Schema Types

Ultimately, an [effect's](/docs/concepts/effect) schema must be a composition of [primitive schema types](/docs/schema), but a spec may define custom schema types under the `schemas` field that can be shared _across_ effects.

Here's how you'd define and use a custom `uuid` schema type:

```yaml
schemas:
  uuid:
    schema:
      type: string
      pattern: ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$
effects:
  users.create:
    schema:
      type: object
      properties:
        id:
          type: uuid
        name:
          type: string
  posts.create:
    schema:
      type: object
      properties:
        id:
          type: uuid
        authorId:
          type: reference
          effect: users.create
```

This is effectively identical to the following spec, where the `uuid` schema has been inserted into the `id` properties:

```yaml
effects:
  users.create:
    schema:
      type: object
      properties:
        id:
          type: string
          pattern: ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$
        name:
          type: string
  posts.create:
    schema:
      type: object
      properties:
        id:
          type: string
          pattern: ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$
        authorId:
          type: reference
          effect: users.create
```

The only thing you need to define a custom schema type is a `schema` field, which defines the literal schema spec.

## Examples

### Incrementing ID

All natural numbers in order, starting with `1`.

```yaml
schema:
  type: number
  minimum: 1
  scale: 0
  step: 1
```

### Email

Random email addresses from a enumerated set of domains.

```yaml
schema:
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
          schema: { type: constant, value: "gmail.com" }
        - weight: 2
          schema: { type: constant, value: "yahoo.com" }
        - weight: 2
          schema: { type: constant, value: "outlook.com" }
        - schema: { type: constant, value: "icloud.com" }
        - schema: { type: constant, value: "protonmail.com" }
```
