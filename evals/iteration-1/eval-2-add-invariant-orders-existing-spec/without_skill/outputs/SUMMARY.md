# Summary

## Task

Add a rngo invariant enforcing the business rule stated in the repo's `README.md`: an order must
have a recorded payment before it can be fulfilled — the application should never write a
`fulfillments` row for an order that hasn't been paid.

## What was done

Read the existing spec (`spec.yml`, `channels/db.yml`, and the four `effects/*.yml` files) plus
`README.md` and `schema.sql` to understand the domain: `customers` -> `orders` (via `customer_id`)
-> `payments` (via `order_id`) -> `fulfillments` (via `order_id`, sourced through a reference to
`payments.create` in the existing spec).

No invariant file previously existed (`.rngo/invariants/` didn't exist yet), so a new one was created
at `.rngo/invariants/fulfillment-requires-prior-payment.yml`:

    type: sql
    query: >
      SELECT count(*)
      FROM effects f
      WHERE f.key = 'fulfillments.create'
      AND NOT EXISTS (
        SELECT 1
        FROM effects p
        WHERE p.key = 'payments.create'
        AND p.value ->> '$.order_id' = f.value ->> '$.order_id'
        AND p.value ->> '$.paid_at' <= f.value ->> '$.fulfilled_at'
      );
    expect: result == 0

This counts any `fulfillments.create` effect for which there is no `payments.create` effect on the
same order with a `paid_at` at or before the fulfillment's `fulfilled_at`. It passes only when that
count is zero, i.e. every fulfillment has a prior payment for its order.

No other files were changed. The existing `fulfillments.create` effect already references
`payments.create` (via `payment.order_id`) to source its `order_id`, so the simulation itself never
generates a fulfillment for an order lacking any payment at all. The new invariant additionally checks
the temporal ordering (paid at or before the moment of fulfillment) holds in the recorded data, which
is the actual guarantee the README describes.

## Validation

Ran `rngo run --stdout` in the background and killed it after a few seconds. Output confirmed the spec
still parses cleanly and produces plausible interleaved events, e.g. a `payments.create` effect for an
order's `paid_at` appearing before a later `fulfillments.create` effect for the same `order_id`.
`--stdout` mode only prints generated effects (it skips channel routing and invariant auditing), so
this confirms the spec is well-formed and the new invariant file doesn't break parsing, but it does not
itself execute the SQL invariant against a live system — that would require a full run against
`db.sqlite` via the `db` channel.

## Notable difficulty

The first several attempts to run `rngo run --stdout` failed immediately with `error: Operation not
permitted (os error 1)`, even though the spec had already been written to `.rngo/runs/<id>/spec.json`
(confirming the spec itself parsed fine). This turned out to be unrelated to the invariant change:
several stale/incomplete run directories (including a `runs/last` directory that was a plain directory
rather than the expected symlink) were left over in `.rngo/runs/` from earlier interrupted runs.
Removing the leftover `.rngo/runs/*` entries resolved the issue and subsequent runs worked normally.
Per the task instructions, `.rngo/runs` contents are excluded from the copied output anyway.
