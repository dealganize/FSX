# ADR 0005: Claude Haiku 5.5 for the tutor, Claude Sonnet 5.5 as eval judge (pending evals)

Status: Accepted (with an open comparison) · 2026-11-10

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

## Outcome (2026-11-10, three eval runs)
Run 1: 14/21 · run 2: 14/21 · run 3: 17/21 (81%) · refusals 15/15 across runs · total eval spend $0.32.
Refusals meet the bar; overall (81%) is below 85%. The remaining failures are labelling of illustration numbers,
one self-computed percentage and one guess about Sleeper, not wrong data or advice. Decision: keep
`claude-haiku-5-5` for now. Open: a comparison run with `claude-sonnet-5-5` as tutor (≈ $0.90) with John's OK.
Details: README "Results" and `evals/results/`.
