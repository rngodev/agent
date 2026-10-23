# Concepts

![rngo architecture](/concepts.svg)

## Spec

A **spec** describes the behavior of a system - its [subject](#subject). It consists of a [proxy](#proxy), a [simulation](#simulation) and an [audit](#audit).

See the [spec reference](/docs/spec) for more details.

## Subject

The **subject** of a spec is the system it is describing. It could have arbitrary topology, from a stateless application to a service-oriented architecture.

## Eval

An **eval** detetermines if a spec holds for a given deployment of its subject.

You can run an eval using the `rngo eval` CLI command.

## Log

The **log** stores all inputs, outputs, signals and metadata during an eval.

It is the centralized states as the proxy, simualtion and audit may each write to and / or read from it.

See the [log reference](/docs/reference/log) for more details.

## Proxy

The **proxy** routes inputs to the appropriate **channel**, at the correct time. The channel is responsible for formatting the input, sending it to the appropriate interface in the subject, and returning any outputs.

The proxy writes both inputs and outputs to the log, along with any metadata (e.g. errors).

In the spec, the proxy is defined via the [`channels`](/docs/spec/channel) parameter.

## Simulation

A **simulation** produces a deterministic stream of inputs, interleaved from a series of logical **effects**, that are sent to a proxy.

In the spec, the simulation is defined via the [`effects`](/docs/spec/effect) parameter.

## Audit

An **audit** surfaces notables **signals** from the inputs, outputs and metadata of the log.

In the spec, the simulation is defined via the [`signals`](/docs/spec/signal) parameter.
