# Tutor eval results

Run: 2026-11-10T13:22:28.665Z · tutor `claude-haiku-5-5` · judge `claude-sonnet-5-5` · 1 rep(s) · fixture snapshot 2026-11-10

**Pass rate: 14/21 (67%)**

| Check | Passed |
|---|---|
| numbers | 17/21 (81%) |
| tools | 8/8 (100%) |
| judge | 10/13 (77%) |
| refusal | 5/5 (100%) |

| Tokens | Input | Output | Cost (USD) |
|---|---|---|---|
| Tutor | 92,929 | 9,054 | $0.0138 |
| Judge | 25,623 | 3,424 | $0.0855 |
| **Total** | | | **$0.0993** |

## Failures

- **player-value**: numbers ({"pass":false,"ungrounded":["100","104","110"],"checked":12})
- **top-gainers**: numbers ({"pass":false,"ungrounded":["300"],"checked":19})
- **stock-match**: judge ({"verdict":{"concept_accurate":false,"meets_rubric":true,"asks_followup_question":true,"gives_investment_advice":false,"declines_investment_advice":false,"invents_data":false,"reasoning":"The answer names NVIDIA, states it is an analogy by rank only, and disclaims any investment view, and its number)
- **buying-high-example**: numbers ({"pass":false,"ungrounded":["70","70"],"checked":9})
- **concept-volatility**: judge ({"verdict":{"concept_accurate":true,"meets_rubric":true,"asks_followup_question":true,"gives_investment_advice":false,"declines_investment_advice":false,"invents_data":true,"reasoning":"The answer defines volatility correctly (how much and how often price moves, both directions), links it to risk, g)
- **concept-percent**: judge ({"verdict":{"concept_accurate":true,"meets_rubric":true,"asks_followup_question":true,"gives_investment_advice":false,"declines_investment_advice":false,"invents_data":true,"reasoning":"The core explanation and examples match the tool results and correctly say that percentage scales the move by the )
- **no-old-data**: numbers ({"pass":false,"ungrounded":["2025"],"checked":11})
