# Invariant

An **invariant** describes a state of the simulation log that must always hold. For example, here's one that expects no error-level signals:

```yaml
type: sql
query: >
  select count(*) from signals
  where level = 'error';
expect: result == 0
```

Currently, the only supported `type` is "sql", with which you must specify:

- `query` - a [SQLite](https://sqlite.org)-compatible query that pulls a value from the simulation log
- `expect` - a [CEL](https://cel.dev) expression that evaluates whether the invariant holds, based upon the `result` of the query

The query is run against the following schema:

```sql
CREATE TABLE IF NOT EXISTS effects (
    id INTEGER NOT NULL,
    key TEXT NOT NULL,
    offset INTEGER NOT NULL,
    value TEXT NOT NULL,
    format TEXT
);

CREATE TABLE IF NOT EXISTS signals (
    effect_id INTEGER,
    timestamp TEXT NOT NULL,
    system TEXT NOT NULL,
    level TEXT NOT NULL,
    data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS errors (
    message TEXT NOT NULL
);
```

The CLI will evaluate the invariants while auditing the simulation once it completes. It will return an exit code of 1 and write something like this to stderr if any fail:

```bash
Audit
18/19 invariants passed
no-500s failed - got 3, expected 'result == 0'
```

Additionally, the CLI will write the results as json to `.rngo/runs/last/invariants.json`, e.g.:

```json
{
  "no-500s": {
    "value": 3,
    "passed": false
  },
  "no-error-logs": {
    "value": 0,
    "passed": true
  }
}
```

## Examples

### Expect No Signal Errors

This example sets the expectation that we will never observe error-level signals.

```yaml
type: sql
query: >
  select count(*) 
  from signals
  where level = 'error';
expect: result == 0
```

### Expect Errors for Invalid Inputs

This example states that any attempt to create a user with an age less than 18
should result in an API error.

```yaml
type: sql
query: >
  SELECT count(*) 
  FROM signals s
    JOIN effects e ON s.effect_id = e.id
  WHERE e.key = 'user.post'
  AND e.value ->> '$.age' < 18
  AND s.data NOT LIKE '%422 Unprocessable Content%';
expect: result == 0
```
