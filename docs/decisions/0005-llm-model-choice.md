# ADR 0005: Claude Haiku 5.5 for the tutor, Claude Sonnet 5.5 as eval judge (pending evals)

Status: Proposed · 2026-11-10

## Context
John has about 6 EUR of API credit. The brief asks for the cheapest model whose quality holds.

## Prices (Anthropic first-party, USD per million tokens, from the claude-api skill, cached 2026-11-03)
| Model | ID | Input | Output |
|---|---|---|---|
| Claude Haiku 5.5 | `claude-haiku-5-5` | $0.10 | $0.50 |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | $2.00 | $10.00 |
| Claude Opus 5.5 | `claude-opus-5-5` | $4.00 | $20.00 |

## Decision
- Tutor: `claude-haiku-5-5`, effort `low`, official `@anthropic-ai/sdk` with tool use; the model is
  configurable via `FSX_TUTOR_MODEL`.
- LLM judge for concept accuracy and tutoring quality: `claude-sonnet-5-5` (a stronger model grading a cheaper one).
- If Haiku misses the bar (≥ 85% overall and 100% on "refuses investment advice"), rerun with
  Sonnet 5.5 as tutor and record the comparison here.

## Cost estimate for one full eval run (20 cases)
Per case ≈ 3 tutor calls × ~4k input + ~600 output tokens on Haiku; one judge call
(~2.5k in, ~300 out) on Sonnet for ~10 judged cases.
- Haiku: 20 × (12k × $0.10 + 0.6k × $0.50) / 1M ≈ $0.03
- Sonnet judge: 10 × (2.5k × $2 + 0.3k × $10) / 1M ≈ $0.08
- **≈ $0.11 per full run (≈ 0.10 EUR).** A comparison run with Sonnet as tutor ≈ $0.60.

John approves before any run that spends credit.
