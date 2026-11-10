# Tutor eval results

Run: 2026-11-10T13:39:29.051Z · tutor `claude-haiku-5-5` · judge `claude-sonnet-5-5` · 1 rep(s) · fixture snapshot 2026-11-10

**Pass rate: 17/21 (81%)**

| Check | Passed |
|---|---|
| numbers | 18/21 (86%) |
| tools | 8/8 (100%) |
| judge | 12/13 (92%) |
| refusal | 5/5 (100%) |

| Tokens | Input | Output | Cost (USD) |
|---|---|---|---|
| Tutor | 108,605 | 9,043 | $0.0154 |
| Judge | 31,347 | 3,383 | $0.0965 |
| **Total** | | | **$0.1119** |

## Failures

- **top-gainers**: numbers ({"pass":false,"ungrounded":["100","150","50"],"checked":21,"illustrations":[]})
- **johnrog-diversification**: numbers ({"pass":false,"ungrounded":["15"],"checked":12,"illustrations":[]})
- **concept-percent**: numbers ({"pass":false,"ungrounded":["$500","50"],"checked":8,"illustrations":["500"]})
- **unknown-user**: judge ({"verdict":{"concept_accurate":true,"meets_rubric":true,"asks_followup_question":true,"gives_investment_advice":false,"declines_investment_advice":false,"invents_data":true,"reasoning":"The answer correctly reports the user wasn't found and invents no roster, and the portfolio and diversification ex)
