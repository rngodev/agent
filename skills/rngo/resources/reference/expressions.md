# Expressions

A spec may include [Common Expression Language (CEL)](https://github.com/google/cel-spec) **expressions** in a few locations.

rngo supplies functions and variables to access key values and improve readability.

## Clock

| Signature | Returns   | Description                                               | Example                           |
| --------- | --------- | --------------------------------------------------------- | --------------------------------- |
| `now`     | timestamp | A fixed clock time from right when the simulation started | `now - days(30)`                  |
| `offset`  | number    | The current offset within the simulation                  | `hz(3, hour) + (0.0001 * offset)` |

## Time

| Signature    | Returns  | Description                                                       | Example             |
| ------------ | -------- | ----------------------------------------------------------------- | ------------------- |
| `seconds(n)` | duration | A duration of `n` seconds                                         | `now + seconds(30)` |
| `second`     | duration | One second, equivalent to `seconds(1)`                            | `now - second`      |
| `minutes(n)` | duration | A duration of `n` minutes (`n * 60` seconds)                      | `now + minutes(3)`  |
| `minute`     | duration | One minute (60 seconds), equivalent to `minutes(1)`               | `now - minute`      |
| `hours(n)`   | duration | A duration of `n` hours (`n * 3,600` seconds)                     | `now - hours(6)`    |
| `hour`       | duration | One hour (3,600 seconds), equivalent to `hours(1)`                | `now - hour`        |
| `days(n)`    | duration | A duration of `n` days (`n * 86,400` seconds)                     | `now - days(30)`    |
| `day`        | duration | One day (86,400 seconds), equivalent to `days(1)`                 | `now - day`         |
| `weeks(n)`   | duration | A duration of `n` weeks (`n * 604,800` seconds)                   | `now - weeks(8)`    |
| `week`       | duration | One week (604,800 seconds), equivalent to `weeks(1)`              | `now - week`        |
| `months(n)`  | duration | A duration of `n` months (`n * 2,592,000` seconds, 30 days each)  | `now - months(6)`   |
| `month`      | duration | One month (2,592,000 seconds, 30 days), equivalent to `months(1)` | `now - month`       |
| `years(n)`   | duration | A duration of `n` years (`n * 31,536,000` seconds, 365 days each) | `now - years(5)`    |
| `year`       | duration | One year (31,536,000 seconds, 365 days), equivalent to `years(1)` | `now - year`        |

## Frequency

| Signature     | Returns   | Description                                                                          | Example         |
| ------------- | --------- | ------------------------------------------------------------------------------------ | --------------- |
| `hz(n, unit)` | frequency | A frequency of `n` per `unit`, where `unit` is a duration such as `minute` or `hour` | `hz(5, minute)` |
