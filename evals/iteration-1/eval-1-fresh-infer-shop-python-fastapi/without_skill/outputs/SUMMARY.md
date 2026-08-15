# rngo setup summary

## Target project

`shop` -- a tiny FastAPI storefront (`app/main.py`, `app/models.py`) backed by Postgres via
SQLAlchemy, run locally with `docker-compose.yml` (service `postgres`, exposed on `localhost:5432`,
credentials `shop`/`shop`/`shop`) and connected via `DATABASE_URL` from `.env.example`.

## What I did

1. Ran `rngo init` in the repo root, which created `.rngo/spec.yml` (`key: repo`, `seed: 1`) and added
   `.rngo/runs` to `.gitignore`. Changed `key` to `shop` to match the project name in `README.md`.
2. Read `app/models.py` (the SQLAlchemy models) to find the schema -- there are no migration files or
   `alembic` directory, so the ORM models are the source of truth:
   - `Product(id, sku, name, price, in_stock, created_at)`
   - `Order(id, customer_email, status, total, tracking_number, created_at)` with
     `OrderStatus = PENDING | SHIPPED | CANCELLED`
   - `OrderItem(id, order_id -> orders.id, product_id -> products.id, quantity, unit_price)`
   `app/main.py`'s three FastAPI routes (`GET /products`, `POST /orders`, `GET /orders/{id}`) are all
   unimplemented stubs (`...` bodies), so there's no real HTTP behavior to simulate yet -- only the
   database is a genuine system-under-test right now.
3. Defined one channel, `.rngo/channels/db.yml`, a `stream` target piping SQL into
   `psql -q $DATABASE_URL` (matches `.env.example`), with `format.type: sql`.
4. Defined three effects, one per table, all routed to the `db` channel with `metadata.table` set to
   the real table name:
   - `.rngo/effects/products.create.yml` -- `hz(2, hour)`, autoincrementing `id`, `sku` pattern
     `[A-Z]{3}-[0-9]{5}`, ASCII `name`, `price` as a `number` (scale 2, $1.99-$499.99), `in_stock`
     weighted 80/20 true/false (matches the model's `default=True`), `created_at` from
     `context: [clock, now]`.
   - `.rngo/effects/orders.create.yml` -- `hz(15, hour)` (orders churn faster than products),
     `customer_email` built with a `function` (local-part + domain, weighted toward common
     providers), `status` as a weighted `select` over the three enum members, `total` as a wider
     `number` range than a single item price, `tracking_number` as a nullable `select`
     (50/50 present/absent -- an approximation, see below).
   - `.rngo/effects/order_items.create.yml` -- `hz(35, hour)` (a few line items per order),
     `order_id`/`product_id` via `function` + `reference` back to `orders.create`/`products.create`,
     `quantity` 1-8, `unit_price` matching the product price range.
5. Validated with `rngo run --stdout` (killed after a few seconds each time) at every stage, including
   isolated single-effect specs while debugging (see "Notable difficulty" below). The final run over
   the full `.rngo` directory produced tens of thousands of well-formed events across all three effects
   with correctly resolving foreign-key references and no parse errors.

## Notable decisions

- **No API channel.** Since all three FastAPI endpoints are stub bodies (`...`), there's no real HTTP
  behavior to exercise yet. Modeling `POST /orders` as a `curl` effect would just hit unimplemented
  code, so I left it out. If/when the endpoints are implemented, an `exec`/`curl` channel plus an
  `orders.post`-style effect would be a natural addition -- the DB effects here would still be useful
  for backdating historical data.
- **Enum values are uppercase.** SQLAlchemy's `Enum(OrderStatus)` column persists the Python enum
  member's `.name` by default (`PENDING`, `SHIPPED`, `CANCELLED`), not the lowercase `.value` the enum
  defines (`pending`, `shipped`, `cancelled`), since `models.py` doesn't pass `values_callable`. I
  used the uppercase names in `orders.create.yml` to match actual persisted rows.
- **`tracking_number` nullability is an unconditioned 50/50 split.** Realistically it's populated once
  an order ships and null while pending/cancelled, but rngo's schema primitives don't support
  conditioning one property's value on a sibling property's value within the same effect, so I
  approximated with an even split rather than modeling that correlation. Worth revisiting if/when
  invariants are added around shipping status.
- **No `.rngo/schemas/` custom types**, even though the id pattern, timestamp, and item-price shape
  repeat across effects (see difficulty below) -- this installed CLI build doesn't support them, so
  everything is inlined instead.

## Notable difficulty

The skill's reference docs describe a `schemas:`-based custom-type feature (define once at
`.rngo/schemas/{name}.yml`, reference via `type: <name>` in effects) as current, explicitly warning
that older material calling channels "systems" is stale. In practice, the installed CLI
(`rngo 0.29.0`) accepts the new `channels`/`target`/`metadata` naming fine, but **fails to parse any
spec that uses a custom named schema type** -- both a directory-based `.rngo/schemas/id.yml` and a
hand-written inline spec matching the doc's own worked example produced
`error: failed to parse: 'no schema parser matched'`. I confirmed this by bisecting with a series of
minimal inline specs (via `rngo run --stdout --spec ...`) until isolating custom schema types as the
sole failure point -- every other primitive (`number`, `string`, `select`, `constant`, `function`,
`reference`, `context`) worked as documented. I worked around this by dropping `.rngo/schemas/` and
inlining the repeated shapes (autoincrementing id, `context: [clock, now]` timestamp, item price range)
directly into each effect file. This does mean `products.create.yml` and `order_items.create.yml`
duplicate the price range and all three effects duplicate the id shape -- acceptable for a project this
small, but worth revisiting if the CLI version is upgraded or the mismatch turns out to be a config
issue rather than a version gap.

## Files

- `.rngo/spec.yml`
- `.rngo/channels/db.yml`
- `.rngo/effects/products.create.yml`
- `.rngo/effects/orders.create.yml`
- `.rngo/effects/order_items.create.yml`
