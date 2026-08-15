# Welcome!

rngo helps you learn what your code does by simulating usage and recording everything.

In particular, rngo implements

- a specification language that describes a system's behavior
- a CLI that verifies whether a specification holds for an instance of its system

The rngo specification language is declarative and intuitive - both you and your agent
will find it easy to write. Here's an example spec:

```yaml
key: my-blog
seed: 1
start: now - years(2)
end: now + minutes(5)
channels:
  db:
    format:
      type: sql
    target:
      type: stream
      command: sqlite3 db.sqlite
  api:
    target: exec
    command: >
      curl -sS \
        -X {{method}} \
        {{#eq method "POST"}}
          --header "Content-Type: application/json" \
          --data {{body}} \
        {{/eq}}
        $API_BASE_URL{{path}}
effects:
  users.create:
    trigger: hz(100, day)
    end: now
    channel: db
    metadata:
      table: USERS
    schema:
      type: object
      properties:
        id:
          type: number
          minimum: 1
          scale: 0
          step: 1
        name:
          type: string
          pattern: .{2,64}
        email:
          type: function
          expression: "'user' + number + '@example.com'"
          variables:
            number:
              type: number
              minimum: 10000
              maximum: 99999
              scale: 0
  articles.post:
    trigger: hz(120, hour)
    start: now
    channel: api
    schema:
      type: object
      properties:
        path:
          type: constant
          value: /articles
        method:
          type: constant
          value: POST
        body:
          type: object
          properties:
            authorId:
              type: function
              expression: user.id
              variables:
                user:
                  type: reference
                  effect: users.create
            title:
              type: string
              format: .{0,100}
invariants:
  api-enforces-minimum-title-length:
    type: sql
    query: >
      SELECT count(*) 
      FROM signals s
        JOIN effects e ON s.effect_id = e.id
      WHERE e.key = 'articles.post'
      AND length(e.value ->> '$.title') < 10
      AND s.data NOT LIKE '%422 Unprocessable Content%';
    expect: result == 0
```

You can use the [rngo run](/docs/cli/run) CLI command to verify that the spec holds for a running instance of `my-blog`, e.g.:

```bash
export API_BASE_URL=https://localhost:5000
rngo run --spec spec.yml
```

This will produce output similar to:

```bash
Simulation
time: 2026-08-13 13:14:12
db: 73104 effects, 0 signals
api: 11 effects, 11 signals

Audit
1/1 invariants passed
```

---

## Next Step

Check out the [quick start](/docs/quick-start) for a step-by-step guide to running your first spec in just a few minutes.
