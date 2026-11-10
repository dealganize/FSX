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

## Cost estimate for one full eval run (21 cases)
`npm run eval -- --estimate` computes it from the case list: 21 cases, 18 graded by the judge.
Assumptions: ~3 tutor calls per case at ~4k input / ~500 output tokens (Haiku), one judge call per
judged check at ~3k input / ~600 output tokens (Sonnet).
- Tutor (Haiku 5.5): ≈ $0.04
- Judge (Sonnet 5.5): ≈ $0.22
- **≈ $0.26 per full run (≈ 0.24 EUR)**, of which most is the judge. A comparison run with Sonnet 5.5
  as the tutor would add ≈ $0.80.

The first estimate in this ADR (≈ $0.11) assumed 10 judged cases; the final set judges 18.
The real token counts and cost of each run are recorded in `evals/results/`.
John approves before any run that spends credit.
