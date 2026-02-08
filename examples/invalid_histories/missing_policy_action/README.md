# Invalid History: Missing Policy Action

## What looks plausible
The ledger contains reserve and stress snapshots followed by a mint event. On the
surface it appears well-formed because the snapshots are present and the issuance
amount is small relative to reserves.

## Which invariant fails
The mint event is not preceded by a `POLICY_ACTION` of kind `ISSUE`. USD-N tender
validity requires every ISSUE/BURN event to follow an explicit policy action.

## Why replay must reject it
Without the policy action linkage, an auditor cannot prove the issuance was
authorized by deterministic policy. Replay verification must therefore reject
this history as invalid tender.
