# Invalid History: BTC Issue Without Reserve Snapshot

## What looks plausible
A BTC-backed policy action is followed by a BTC-backed issuance event. The price
snapshot and ownership proof are included, which may look sufficient at a glance.

## Which invariant fails
Reserve coverage must hold at every issuance point. This history contains no
reserve snapshot to establish coverage for the newly issued USD-N.

## Why replay must reject it
Without an explicit reserve snapshot, an external auditor cannot verify that the
issuance was covered at the time it occurred. Replay verification must reject
this history as invalid tender.
