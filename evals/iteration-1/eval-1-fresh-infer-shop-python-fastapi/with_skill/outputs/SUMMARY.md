# rngo setup summary — shop (Python/FastAPI/SQLAlchemy/Postgres)

## What the repo is

A tiny FastAPI storefront (`app/main.py`) backed by SQLAlchemy models (`app/models.py`) and a
local Postgres via `docker-compose.yml`. Three tables:

- `products` (id, sku, name, price, in_stock, created_at)
- `orders` (id, customer_email, status, total, tracking_number, created_at)
- `order_items` (id, order_id -> orders.id, product_id -> products.id, quantity, unit_price)

`OrderStatus` is a Python `enum.Enum` (`PENDING`/`SHIPPED`/`CANCELLED`) wrapped in SQLAlchemy's
`Enum(OrderStatus)`. By default that column type persists the enum member's **name**, not its
`.value` — so the DB actually stores `"PENDING"`, not `"pending"`. This is reflected in the
`orders.create` effect.

`app/main.py`'s three FastAPI routes (`GET /products`, `POST /orders`, `GET /orders/{order_id}`)
are unimplemented stubs (bodies are just `...`) — no request/response models, no DB session usage,
no actual writes. Since they don't persist or communicate anything yet, I did not fabricate an API
channel/effects for them; doing so would have been pure invention rather than something grounded in
the code. Only the Postgres database is a real, meaningful interface right now.

## What was set up

- `rngo init` scaffolded `.rngo/spec.yml` (key `shop`, seed `1`) and gitignored `.rngo/runs`.
- `.rngo/channels/db.yml` — a `stream` target piping into `psql -q $DATABASE_URL` with `sql` format,
  matching `.env.example`'s `DATABASE_URL` and the Postgres service in `docker-compose.yml`.
- Three effects, one per table, all routed to the `db` channel with `metadata.table` set to the
  real table name:
  - `.rngo/effects/products.create.yml`
  - `.rngo/effects/orders.create.yml`
  - `.rngo/effects/order_items.create.yml`
- `order_items.create` references `orders.create` and `products.create` via `reference` +
  `function` (pulling `.id`) for `order_id`/`product_id`.
- Relative trigger rates reflect real-world churn: products rarely (`hz(3, hour)`), orders more
  often (`hz(15, hour)`), and order items fastest (`hz(35, hour)`, since each order has a few line
  items).
- No invariants were written — none were requested and none are documented/enforced anywhere in
  this minimal repo (no constraints, comments, or docs describing behavioral guarantees to check).

## Notable difficulty: custom schema types aren't supported by the installed CLI

The skill's bundled docs describe a `schemas:`/`.rngo/schemas/*.yml` feature for factoring out
repeated shapes (e.g. an `id` or `money` type) and referencing them by name via `type: <name>`. I
initially wrote `.rngo/schemas/id.yml` and `.rngo/schemas/money.yml` and referenced them from all
three effects, per the guide's Step 4.

`rngo run --stdout` failed immediately with `error: failed to parse: 'no schema parser matched'` —
repeatable even reduced to a single minimal effect, and even with the custom type declared inline
under `spec.yml`'s own `schemas:` key exactly as shown in the docs. Binary inspection of the
installed CLI (`rngo 0.29.0`, `strings` on `/opt/homebrew/Cellar/cli/0.29.0/bin/rngo`) turned up no
`schemas` or `invariant`/`audit` strings anywhere, and the internal `Simulation` struct only has 5
fields (`seed`, `start`, `end`, `effects`, `systems`) — suggesting this installed build predates (or
otherwise doesn't implement) the custom-schema-type and invariant features the docs describe. A
pre-existing `without_skill` baseline run against the same repo (found alongside this eval's
fixtures) independently arrived at the same workaround: every effect has its shapes inlined, no
`schemas/` directory.

Given that, I dropped the custom schema type files and inlined the `id` (incrementing integer,
`minimum: 1, scale: 0, step: 1`) and `money` (`minimum: 1.00, maximum: 500.00, scale: 2`) shapes
directly into each of the three effect files instead — they're small and only repeated 2-3 times
each, so the duplication is minor. I kept `channels`/`channel`/`target`/`metadata` terminology as
instructed by the skill (rather than reverting to the older `systems`/`system`/`import` terminology
also visible in the binary) since `--stdout` mode never exercises channel routing and doesn't
distinguish between them — it only exercises effect/schema parsing, which is what actually broke.

I also had to tighten one `string` `pattern`: an initial `.{10,80}` for the product `name` field
generated garbage (unpaired surrogate / private-use-area Unicode codepoints) because the bare `.`
regex metachar matches the full Unicode range in rngo's generator, not just printable ASCII. I
switched it to `[A-Za-z0-9' ]{10,80}` to get plausible-looking names.

## Validation

Ran `rngo run --stdout` in the background for ~5 seconds against the final spec (all three effects,
no custom schema types) and killed it: it parsed cleanly and streamed ~38k JSON lines of plausible
event data — e.g. `orders.create` rows with uppercase `status`, correlated `order_items.create` rows
referencing existing `order_id`/`product_id` values, and `products.create` rows with realistic
SKUs/prices. No parse errors.

## Files

- `.rngo/spec.yml`
- `.rngo/channels/db.yml`
- `.rngo/effects/products.create.yml`
- `.rngo/effects/orders.create.yml`
- `.rngo/effects/order_items.create.yml`
