# Tutor eval results

Run: 2026-11-10T13:33:54.412Z · tutor `claude-haiku-5-5` · judge `claude-sonnet-5-5` · 1 rep(s) · fixture snapshot 2026-11-10

**Pass rate: 14/21 (67%)**

| Check | Passed |
|---|---|
| numbers | 16/21 (76%) |
| tools | 8/8 (100%) |
| judge | 11/13 (85%) |
| refusal | 5/5 (100%) |

| Tokens | Input | Output | Cost (USD) |
|---|---|---|---|
| Tutor | 103,144 | 9,230 | $0.0149 |
| Judge | 31,075 | 3,451 | $0.0967 |
| **Total** | | | **$0.1116** |

## Failures

- **player-value**: numbers ({"pass":false,"ungrounded":["10,000","10,500"],"checked":11,"illustrations":[]})
- **most-added-volume**: judge ({"verdict":{"concept_accurate":false,"meets_rubric":true,"asks_followup_question":true,"gives_investment_advice":false,"declines_investment_advice":false,"invents_data":false,"reasoning":"The answer names Tank Dell with 1,219,080 adds from the tool and explains volume in both stock and fantasy terms)
- **johnrog-diversification**: numbers ({"pass":false,"ungrounded":["60"],"checked":13,"illustrations":[]})
- **price-history**: numbers ({"pass":false,"ungrounded":["25"],"checked":18,"illustrations":[]})
- **buying-high-example**: numbers ({"pass":false,"ungrounded":["70","70"],"checked":8,"illustrations":[]})
- **concept-percent**: numbers ({"pass":false,"ungrounded":["50","$500","50"],"checked":16,"illustrations":["15","100","105"]})
- **unknown-user**: judge ({"verdict":{"concept_accurate":true,"meets_rubric":true,"asks_followup_question":true,"gives_investment_advice":false,"declines_investment_advice":false,"invents_data":true,"reasoning":"The answer correctly reports that the user wasn't found and invents no roster, and its diversification explanation)
