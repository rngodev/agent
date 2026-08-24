# Signal

A **signal** describes a pattern that may emerge from simulation inputs, outputs and / or metadata. It may be paired with an expectation. For example, here's one that expects no error-level outputs:

```yaml
type: sql
query: >
  select count(*) from output
  where level = 'error';
expect: result == 0
```

Currently, the only supported `type` is **sql**, which expects a [SQLite](https://sqlite.org)-compatible `query` that returns a scalar, against the following schema:

```sql
CREATE TABLE inputs (
    id INTEGER NOT NULL,
    effect TEXT NOT NULL,
    offset INTEGER NOT NULL,
    data TEXT NOT NULL
);

CREATE TABLE outputs (
    channel TEXT NOT NULL,
    input_id INTEGER,
    timestamp TEXT NOT NULL,
    level TEXT NOT NULL,
    data TEXT NOT NULL
);

CREATE TABLE metadata (
    type TEXT NOT NULL,
    input_id INTEGER,
    effect TEXT,
    offset INTEGER,
    attribute TEXT,
    data TEXT
);
```

You may also specify `expect`, which is a [CEL](https://cel.dev) expression which takes the `result` of the query and should return a boolean.

During the audit phase of a run, the CLI calculates each signal and prints the results, e.g.:

```bash
Audit
no-errors: 3096 (failed - expected 'result == 0')
some-inputs: 1556 (passed)
warnings: 16
1 passed
1 failed
```

If any signal expectation fails, the CLI process will return an exit code of 1. Additionally, the CLI will write the results as json to `.rngo/runs/last/signals.json`, e.g.:

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

### No Signal Errors

This example sets the expectation that we will never observe error-level signals.

```yaml
type: sql
query: >
  select count(*) 
  from signals
  where level = 'error';
expect: result == 0
```

### Errors for Invalid Inputs

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
