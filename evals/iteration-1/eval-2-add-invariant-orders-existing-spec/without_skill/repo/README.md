# orders-demo

A tiny order-fulfillment system (schema in `schema.sql`, seeded with sqlite).

## Business rule

An order must have a recorded payment before it can be fulfilled — the application never writes a
`fulfillments` row for an order that hasn't been paid.

## rngo

A spec already exists under `.rngo/`. Run `rngo run --stdout` to try it.
