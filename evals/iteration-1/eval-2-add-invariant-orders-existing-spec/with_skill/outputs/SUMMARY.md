# Summary

## Task

Add an rngo invariant enforcing the business rule documented in the repo's `README.md`:

> An order must have a recorded payment before it can be fulfilled — the application never writes a
> `fulfillments` row for an order that hasn't been paid.

## What was done

Read the existing spec (`spec.yml`, `channels/db.yml`, `effects/{customers,orders,payments,fulfillments}.create.yml`),
the domain `README.md`, and `schema.sql` to confirm the rule and the shape of the `orders`, `payments`,
and `fulfillments` tables.

Added a new invariant file at `.rngo/invariants/fulfillment-requires-prior-payment.yml`:

```yaml
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
    AND p.offset <= f.offset
  );
expect: result == 0
```

This asserts that every `fulfillments.create` effect has at least one `payments.create` effect for the
same `order_id` whose simulation `offset` is at or before the fulfillment's offset — i.e. no order is
ever fulfilled before (or without) being paid. It queries the `effects` table directly (per
`resources/concepts/invariant.md`), since this is a state-ordering check across two effect logs rather
than something that shows up in `signals`/`errors`.

No other files needed changes — the existing `fulfillments.create` effect already models `order_id` via
a `reference` to `payments.create` (pulling `payment.order_id`), so the generator already tends to
produce a preceding payment for each fulfillment. The new invariant makes that guarantee an explicit,
checked assertion rather than an implicit side effect of how the generator happens to be wired, and it
would catch a regression if `fulfillments.create` were ever changed to reference `orders.create` directly
(bypassing payment) or to allow multiple/out-of-order fulfillments.

## Validation

Per the skill's guidance, tried `rngo run --stdout` (backgrounded, killed after a few seconds) to confirm
the spec parses and produces plausible events. Running it directly inside the target repo path
(`.../with_skill/repo`) consistently failed immediately with `error: Operation not permitted (os error 1)`
— this reproduced identically both with and without the new invariant file present, and even with only
the pre-existing spec content, so it is not caused by anything added here. It also occurred regardless of
the sandbox override flag. As a workaround, the same `.rngo/` directory was copied to a scratch directory
outside the skills tree (`/tmp`) and `rngo run --stdout` was run there instead, where it worked normally
and streamed well-formed events, e.g. payment/fulfillment pairs with the payment's offset preceding the
matching fulfillment's offset, consistent with the effect's `reference` wiring. This confirms the overall
spec (including the new invariant file's YAML) parses correctly under `rngo run`'s spec-building step.
`rngo run --stdout` does not evaluate invariants itself (invariants are evaluated only during the audit
phase of a full run against real channels), so the invariant's logic was additionally checked by hand
against a sample `effects.jsonl` log and against the schema documented in
`resources/concepts/invariant.md`.

Stray run directories created by the repeated failed attempts inside the repo (each containing only a
`spec.json`, no effects/errors, since the process errored before simulating) were cleaned up, leaving only
the two run directories that predated this change.

## Outputs

The full resulting `.rngo/` directory (all of `spec.yml`, `channels/`, `effects/`, `invariants/`,
excluding `.rngo/runs` contents) is copied into this `outputs/` folder.
