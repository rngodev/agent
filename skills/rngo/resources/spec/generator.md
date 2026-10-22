# Generator

A **generator** defines all inputs that an [effect](/docs/spec/effect) could possibly emit. Consider the following example:

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
          - generator:
              type: constant
              value: example.com
          - generator:
              type: constant
              value: example.org
  age:
    type: number
    scale: 0
    minimum: 0
    maximum: 120
```

It will endlessly generate values that look like this:

```json
{ "email": "kjandfa@example.com", "age": 16 }
{ "email": "9jsm348vk@example.org", "age": 77 }
{ "email": "111//??@example.org", "age": 58 }
```

## Primitive Types

A generator is represented as a [discriminated union](/docs/spec#discriminated-unions) of primitive types, and some are composites, i.e. they take other generators as parameters:

- [array](/docs/spec/generator/array) - generates an array of values from an `items` generator
- [constant](/docs/spec/generator/constant) - emits a literal value
- [context](/docs/spec/generator/context) - emits a value from the simulation's dynamic context
- [function](/docs/spec/generator/function) - evaluates a CEL expression over named sub-generators
- [number](/docs/spec/generator/number) - generates decimal or integer values
- [object](/docs/spec/generator/object) - generates an object from named property generators
- [reference](/docs/spec/generator/reference) - samples values emitted by another effect
- [select](/docs/spec/generator/select) - selects one of several sub-generators at random
- [string](/docs/spec/generator/string) - generates a string value

## Custom Types

Ultimately, an [effect's](/docs/spec/effect) generator must be a composition of [primitive generator types](#primitive-types), but a spec may define custom generator types under the `generators` field that can be shared _across_ effects.

Here's how you'd define and use a custom `uuid` generator type:

```yaml
generators:
  uuid:
    generator:
      type: string
      pattern: ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$
effects:
  users.create:
    generator:
      type: object
      properties:
        id:
          type: uuid
        name:
          type: string
  posts.create:
    generator:
      type: object
      properties:
        id:
          type: uuid
        authorId:
          type: reference
          effect: users.create
```

This is effectively identical to the following spec, where the `uuid` generator has been inserted into the `id` properties:

```yaml
effects:
  users.create:
    generator:
      type: object
      properties:
        id:
          type: string
          pattern: ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$
        name:
          type: string
  posts.create:
    generator:
      type: object
      properties:
        id:
          type: string
          pattern: ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$
        authorId:
          type: reference
          effect: users.create
```

The only thing you need to define a custom generator type is a `generator` field, which defines the literal generator spec.
