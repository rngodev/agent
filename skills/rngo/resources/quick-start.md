# Quick Start

Install the rngo CLI with Homebrew:

```
brew install rngodev/tap/cli
```

Make a file called `rngo.yml` with this configuration:

```yaml
version: 1
seed: 1
channels:
  out:
    type: stdout
effects:
  users.create:
    channel: out
    generator:
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
                - generator:
                    type: constant
                    value: Alice
                - generator:
                    type: constant
                    value: Bob
                - generator:
                    type: constant
                    value: Carl
            familyName:
              type: select
              options:
                - generator:
                    type: constant
                    value: Agarwal
                - generator:
                    type: constant
                    value: Bates
                - generator:
                    type: constant
                    value: Chester
  posts.create:
    channel: out
    generator:
      type: object
      properties:
        id:
          type: number
          minimum: 1
          scale: 0
          step: 1
        title:
          type: select
          options:
            - weight: 5
              generator:
                type: constant
                value: Lorem Ipsum
            - weight: 3
              generator:
                type: constant
                value: Dolor Sit Amet
            - weight: 2
              generator:
                type: constant
                value: Sed Mattis Eu Erat
        authorId:
          type: function
          expression: user.id
          variables:
            user:
              type: reference
              effect: users.create
```

Now run the simulation like this:

```
rngo eval --stdout rngo.yml
```

This will output data that looks something like this:

```json
{"id":1,"name":"Alice Agarwal"}
{"id":2,"name":"Bob Bates"}
{"authorId":1,"id":1,"title":"Lorem Ipsum"}
```

---

## Next Step

Learn how to [initialize a project for rngo](/docs/guides/initialize-your-project).
