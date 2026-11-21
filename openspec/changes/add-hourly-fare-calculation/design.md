## Context

The approved pricing model uses driver-set hourly rates, route minutes for estimates, and actual elapsed Start/End OTP time for final fare. Release 1 disables per-kilometre pricing.

## Goals / Non-Goals

Provide a shared, testable base fare calculation. Quote selection, persisted policy snapshots, fee applicability and settlement remain with the integrations that own those inputs.

## Decisions

Use `pricing_mode` and the server-selected hourly rate. For final fare, consume the frozen rate and authoritative trip timestamps. Keep fractional elapsed time and the unrounded base fare. Compute whole-rupee display rounding separately. Leave fuel, tolls, parking, platform fees and waiting/no-show amounts outside the base calculation.

## Risks / Trade-offs

The floating-point calculation is suitable for estimates and base fare display. Payment amounts require the existing settlement integration to define authoritative minor-unit conversion. The in-memory snapshot uses an ISO timestamp and freezes its scalar inputs. It exposes no HTTP or storage schema.
