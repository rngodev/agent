# sql

Calculates a [signal](/docs/spec/signal) with a [SQLite](https://sqlite.org)-compatible query that returns a scalar.

The query runs against the log database - see the [log reference](/docs/reference/log#schema) for schema details.

## Parameters

### `query` — required

The SQL query. It must return a scalar.

### `expect` — optional

An [expression](/docs/reference/expressions) which takes the `result` of the query and returns a boolean. If it returns false, the signal fails and the CLI exits with code 1.

## Examples

### No Error Outputs

Expect that no error-level outputs are observed:

```yaml
type: sql
query: >
  select count(*) from outputs
  where level = 'error';
expect: result == 0
```

### Validation

Any attempt to create a user with an age less than 18 must result in an API error.

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
