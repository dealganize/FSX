/**
 * Glossary. Every term is explained three ways: plain language, "In the stock market…",
 * and "In fantasy football…". `example` names a live example computed from today's data
 * (see src/lib/domain/live-examples.ts). Content is versioned in git, not in the database.
 */
import type { LiveExampleKey } from "@/lib/domain/live-examples";

export interface GlossaryTerm {
  id: string;
  term: string;
  plain: string;
  stock: string;
  fantasy: string;
  example?: LiveExampleKey;
  related?: string[];
}

export const GLOSSARY: readonly GlossaryTerm[] = [
  {
    id: "stock",
    term: "Stock (share)",
    plain: "A small piece of ownership in something.",
    stock: "A share is a slice of a company. Owning one share of Apple means you own a tiny part of Apple.",
    fantasy: "Here, each NFL player is a stock. A \"share\" is a pretend unit you can buy with practice credits.",
    example: "top-value",
    related: ["price", "portfolio"],
  },
  {
    id: "price",
    term: "Price",
    plain: "What someone will pay for it today.",
    stock: "A share price is the last price buyers and sellers agreed on. It changes all day as people buy and sell.",
    fantasy: "A player's price is his trade value: roughly what other managers would give up to get him. FSX uses FantasyCalc's values.",
    example: "top-value",
    related: ["supply-demand", "daily-change"],
  },
  {
    id: "supply-demand",
    term: "Supply and demand",
    plain: "When more people want something than are offering it, the price goes up.",
    stock: "If more investors want to buy a stock than sell it, buyers bid the price up. Good news usually brings buyers.",
    fantasy: "If lots of managers want a player (he just scored three touchdowns), his trade value rises.",
    example: "most-added",
  },
  {
    id: "daily-change",
    term: "Daily change",
    plain: "How much the price moved since yesterday.",
    stock: "Shown as an amount (+$2.10) and a percentage (+1.5%). Green means up, red means down.",
    fantasy: "How much a player's value moved since the last daily snapshot.",
    related: ["percent-change"],
  },
  {
    id: "percent-change",
    term: "Percentage change",
    plain: "The move compared with where it started, so big and small prices can be compared fairly.",
    stock: "+$5 on a $10 stock is +50%; +$5 on a $500 stock is +1%. The percentage tells you which move really matters.",
    fantasy: "+300 for a player worth 1,000 is a huge +30%; +300 for a star worth 10,000 is only +3%.",
    example: "biggest-gainer-30d",
    related: ["daily-change"],
  },
  {
    id: "market-movers",
    term: "Market movers (gainers and losers)",
    plain: "The things whose price moved the most.",
    stock: "News sites list the day's top gainers and losers, ranked by percentage change.",
    fantasy: "The players whose value rose or fell the most, often after a big game or an injury.",
    example: "biggest-loser-30d",
  },
  {
    id: "volume",
    term: "Volume",
    plain: "How much buying and selling is going on.",
    stock: "The number of shares traded in a day. High volume means lots of people are acting on something.",
    fantasy: "FSX uses Sleeper's trending data: how many managers added or dropped a player in the last 24 hours.",
    example: "most-added",
    related: ["supply-demand"],
  },
  {
    id: "trend",
    term: "Trend",
    plain: "The general direction a price has been moving over time.",
    stock: "An uptrend is a series of higher prices; a downtrend is a series of lower prices. One day is not a trend.",
    fantasy: "A rookie whose value climbs week after week is in an uptrend.",
    example: "biggest-gainer-30d",
    related: ["price-chart"],
  },
  {
    id: "price-chart",
    term: "Price chart",
    plain: "A line showing the price over time.",
    stock: "Time runs left to right, price bottom to top. You can zoom out (1 year) or in (1 week).",
    fantasy: "FSX saves every player's value once a day, so the chart grows by one point per day.",
  },
  {
    id: "volatility",
    term: "Volatility",
    plain: "How much and how often a price jumps around.",
    stock: "A volatile stock can swing several percent in a day. Calm stocks move slowly. Volatile means riskier, both ways.",
    fantasy: "A player with injury news or a changing role can see his value swing a lot in a short time.",
    example: "biggest-loser-30d",
    related: ["risk", "news-event"],
  },
  {
    id: "risk",
    term: "Risk",
    plain: "The chance that things turn out worse than you hoped.",
    stock: "Every investment can lose value. Higher possible rewards usually come with higher risk.",
    fantasy: "An injured star could return at full strength, or not. That uncertainty is risk.",
    example: "injured-top",
    related: ["volatility", "diversification"],
  },
  {
    id: "news-event",
    term: "News event",
    plain: "New information that changes what people think something is worth.",
    stock: "Earnings reports, a new CEO or a lawsuit can move a share price within minutes.",
    fantasy: "Injuries, trades, a new starting role or a suspension move a player's value.",
    example: "injured-top",
  },
  {
    id: "order",
    term: "Order (buy / sell)",
    plain: "An instruction to buy or sell.",
    stock: "You tell your broker what to buy or sell, how many shares, and at what price.",
    fantasy: "Like proposing a trade or putting in a waiver claim. In FSX, orders use practice credits only.",
    related: ["market-order", "limit-order"],
  },
  {
    id: "market-order",
    term: "Market order",
    plain: "Buy or sell right now at the current price.",
    stock: "A market order fills straight away at the best available price. Fast, but you don't control the exact price.",
    fantasy: "Accepting a trade as offered, right now, without haggling.",
    related: ["limit-order"],
  },
  {
    id: "limit-order",
    term: "Limit order",
    plain: "Buy or sell only if the price reaches a level you choose.",
    stock: "\"Buy only at $50 or less.\" If the price never gets there, nothing happens.",
    fantasy: "\"I'll trade for him, but only if his value drops below 5,000.\"",
    related: ["market-order"],
  },
  {
    id: "portfolio",
    term: "Portfolio",
    plain: "Everything you own, taken together.",
    stock: "All your stocks, funds and cash in one account.",
    fantasy: "Your whole roster. FSX values each player at today's price to show your roster's total value.",
    related: ["diversification", "holding"],
  },
  {
    id: "holding",
    term: "Holding (position)",
    plain: "One thing you own and how much of it.",
    stock: "\"I hold 10 shares of Nike\" is one holding.",
    fantasy: "Each player on your roster is a holding.",
  },
  {
    id: "cost-basis",
    term: "Cost basis",
    plain: "What you paid.",
    stock: "The total price you paid for shares. Your gain or loss is measured against it.",
    fantasy: "What you gave up to get a player: the value you traded away.",
    related: ["unrealised-gain"],
  },
  {
    id: "unrealised-gain",
    term: "Unrealised gain or loss",
    plain: "A profit or loss that exists on paper because you haven't sold yet.",
    stock: "If you bought at $100 and it's now $120, you have a $20 unrealised gain. It can still disappear.",
    fantasy: "Your rookie's value doubled since you drafted him, but until you trade him, that gain is only on paper.",
    related: ["realised-gain"],
  },
  {
    id: "realised-gain",
    term: "Realised gain or loss",
    plain: "A profit or loss you locked in by selling.",
    stock: "Once you sell, the gain or loss is final (and in real life, may be taxed).",
    fantasy: "You traded a player away: whatever he does next no longer changes your result.",
    related: ["unrealised-gain"],
  },
  {
    id: "diversification",
    term: "Diversification",
    plain: "Not putting all your eggs in one basket.",
    stock: "Owning different kinds of companies, so one bad industry can't sink your whole portfolio.",
    fantasy: "A roster that isn't all running backs. If RBs get hurt or lose value, the rest of the team holds up.",
    example: "position-mix",
    related: ["sector", "concentration"],
  },
  {
    id: "sector",
    term: "Sector",
    plain: "A group of similar things.",
    stock: "Technology, energy, healthcare: companies in one sector often move together.",
    fantasy: "Positions (QB, RB, WR, TE) work like sectors. Running backs, for example, often lose value with age together.",
    example: "position-mix",
  },
  {
    id: "concentration",
    term: "Concentration risk",
    plain: "Too much of your money in one place.",
    stock: "If half your money is in one stock and it falls 40%, your whole portfolio falls 20%.",
    fantasy: "If half your roster's value is in one position, a bad trend for that position hurts your whole team.",
    related: ["diversification"],
  },
  {
    id: "market-cap",
    term: "Market capitalisation",
    plain: "What the whole company is worth on the stock market.",
    stock: "Share price × number of shares. The biggest companies are worth trillions of dollars.",
    fantasy: "The closest match is a player's total trade value and rank among all players.",
    related: ["public-float"],
  },
  {
    id: "public-float",
    term: "Public float",
    plain: "The part of a company owned by outside investors.",
    stock: "Market value of the shares held by the public, not by insiders such as founders. Companies report it to the US regulator (the SEC) once a year. FSX uses it to rank companies.",
    fantasy: "No direct match: it is how FSX sizes the real companies in the Player ⇄ Stock card.",
    related: ["market-cap"],
  },
  {
    id: "blue-chip",
    term: "Blue chip",
    plain: "Big, established and widely trusted.",
    stock: "Large, well-known companies with a long record, like Coca-Cola or Microsoft.",
    fantasy: "An established star near the top of the market.",
    related: ["growth-stock"],
  },
  {
    id: "growth-stock",
    term: "Growth stock",
    plain: "Something people expect to become much more valuable.",
    stock: "A company priced on what it could become, not what it earns today. Can rise fast or disappoint.",
    fantasy: "A young player whose value is climbing as managers bet on his future.",
    related: ["blue-chip"],
  },
  {
    id: "buy-high-sell-low",
    term: "Buying high, selling low",
    plain: "The classic beginner mistake: buying after a big rise, selling after a big fall.",
    stock: "Fear and excitement push people to chase hot stocks and panic-sell after drops, which locks in losses.",
    fantasy: "Trading for a player right after his career game, or dumping him after one bad week.",
    example: "biggest-gainer-30d",
  },
];

export function getTerm(id: string): GlossaryTerm | undefined {
  return GLOSSARY.find((t) => t.id === id);
}
