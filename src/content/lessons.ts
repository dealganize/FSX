/**
 * Learning path. First release ships modules 1, 2, 3, 5 and 8 from the spec
 * (price, change, volume, volatility, diversification). Each lesson: plain language first,
 * then stock market and fantasy football side by side, a live example, a hands-on task on a
 * real screen, and a 3-question check (learned at ≥ 2/3).
 */
import type { LiveExampleKey } from "@/lib/domain/live-examples";

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number; // index into options
  explain: string;
}

export interface Lesson {
  id: string;
  number: number;
  title: string;
  minutes: number;
  outcome: string; // "After this lesson you can…"
  plain: string;
  stock: string;
  fantasy: string;
  example: LiveExampleKey;
  whyItMatters: string;
  terms: string[]; // glossary ids
  handsOn: { href: string; label: string; task: string };
  quiz: QuizQuestion[];
}

export const PASS_MARK = 2;

export const LESSONS: readonly Lesson[] = [
  {
    id: "price",
    number: 1,
    title: "What is a price?",
    minutes: 3,
    outcome: "explain what a share price is and why it changes.",
    plain:
      "A price is simply what someone is willing to pay for something today. It isn't fixed: it moves whenever people change their minds about what the thing is worth.",
    stock:
      "A company is split into shares. The share price is the last price a buyer and a seller agreed on. When more people want to buy than sell, the price rises; when more want to sell, it falls.",
    fantasy:
      "Each player's \"price\" in FSX is his trade value from FantasyCalc: roughly what other managers would give up to get him. A breakout game makes managers want him, so his value goes up.",
    example: "top-value",
    whyItMatters:
      "Every other idea in investing (gains, losses, risk) is about how prices change. If you know why prices move, the rest makes sense.",
    terms: ["price", "stock", "supply-demand"],
    handsOn: {
      href: "/markets",
      label: "Open Markets",
      task: "Find the three most valuable players. Then sort by position and find the most valuable tight end.",
    },
    quiz: [
      {
        q: "What sets a share price at any moment?",
        options: ["The company decides it each morning", "The last price a buyer and seller agreed on", "The government", "It never changes"],
        answer: 1,
        explain: "A price is just the latest deal between a buyer and a seller. Nobody sets it by decree.",
      },
      {
        q: "A running back scores four touchdowns on Sunday. What usually happens to his value?",
        options: ["It goes up, because more managers want him", "It goes down", "Nothing; values only change at season end", "It resets to zero"],
        answer: 0,
        explain: "Good news brings buyers. More demand means a higher price: supply and demand.",
      },
      {
        q: "If many more people want to sell a stock than buy it, the price will most likely…",
        options: ["rise", "fall", "stay exactly the same", "be cancelled"],
        answer: 1,
        explain: "Sellers have to accept lower prices to find buyers, so the price falls.",
      },
    ],
  },
  {
    id: "change",
    number: 2,
    title: "Up or down: reading change",
    minutes: 3,
    outcome: "read a + or − change and say why the percentage matters more than the raw number.",
    plain:
      "\"Change\" tells you how far the price moved and in which direction. The percentage compares the move with where the price started, so you can compare cheap and expensive things fairly.",
    stock:
      "Apps show change as an amount (+$3) and a percentage (+2%). A $3 move on a $10 stock (+30%) is huge; on a $300 stock (+1%) it is small.",
    fantasy:
      "A +300 move for a backup worth 1,000 is +30%, a massive jump. The same +300 for a star worth 10,000 is +3%. In Markets, the % column tells you which move really matters.",
    example: "biggest-gainer-30d",
    whyItMatters:
      "Beginners often chase the biggest raw number. Thinking in percentages is how investors compare everything, from a single stock to a whole portfolio.",
    terms: ["daily-change", "percent-change", "market-movers"],
    handsOn: {
      href: "/markets?sort=change&dir=desc",
      label: "Open Markets sorted by change",
      task: "Find the biggest gainer by %. Then compare: is the player with the biggest raw gain the same one?",
    },
    quiz: [
      {
        q: "Player A rises from 1,000 to 1,300. Player B rises from 10,000 to 10,300. Who had the bigger move?",
        options: ["A: +30% beats +3%", "B: he is worth more", "They moved the same", "You can't tell"],
        answer: 0,
        explain: "Both rose by 300, but for A that is 30% of his value and for B only 3%.",
      },
      {
        q: "What does a red −5.0% next to a price mean?",
        options: ["The price fell 5% over the period shown", "The price is 5", "You lost 5 credits", "The player has 5 injuries"],
        answer: 0,
        explain: "Red with a minus sign means the price went down by that percentage over the period.",
      },
      {
        q: "Why do investors prefer percentages to raw amounts?",
        options: ["They are always bigger", "They let you compare things with very different prices", "Regulators require them", "Raw amounts are always wrong"],
        answer: 1,
        explain: "A percentage scales the move by the starting price, so a $10 stock and a $1,000 stock can be compared.",
      },
    ],
  },
  {
    id: "volume",
    number: 3,
    title: "Volume: how busy is the market?",
    minutes: 3,
    outcome: "explain volume and why a big move on high volume means more.",
    plain:
      "Volume is how much buying and selling is going on. Lots of activity means many people are reacting to something.",
    stock:
      "Volume is the number of shares traded in a day. A price jump on huge volume shows many investors agree; a jump on tiny volume could be a few trades.",
    fantasy:
      "FSX shows volume as Sleeper's trending data: how many managers added or dropped a player in the last 24 hours. Thousands of adds means the whole fantasy world is reacting.",
    example: "most-added",
    whyItMatters:
      "Volume tells you how much conviction is behind a move. It also hints at where prices may go next: heavy adds often come before a value rise.",
    terms: ["volume", "supply-demand"],
    handsOn: {
      href: "/markets?sort=volume&dir=desc",
      label: "Open Markets sorted by volume",
      task: "Find the player with the most adds today. Open his page: has his value moved yet?",
    },
    quiz: [
      {
        q: "What does high volume tell you?",
        options: ["The price will definitely go up", "Lots of people are buying and selling it", "It is a safe investment", "The company is large"],
        answer: 1,
        explain: "Volume measures activity, not direction or safety.",
      },
      {
        q: "In FSX, where does \"volume\" come from?",
        options: ["How many FSX users bought him", "Sleeper managers adding or dropping him in 24 hours", "His jersey sales", "Touchdowns scored"],
        answer: 1,
        explain: "FSX uses Sleeper's public trending adds and drops as a stand-in for trading volume.",
      },
      {
        q: "A price jumps 20% on very low volume. What should you think?",
        options: ["Many investors agree, so it's solid", "Only a few trades moved it, so be careful", "Volume doesn't matter", "It must be an error"],
        answer: 1,
        explain: "A big move on little activity has less behind it and can reverse easily.",
      },
    ],
  },
  {
    id: "volatility",
    number: 4,
    title: "Volatility and risk",
    minutes: 4,
    outcome: "explain volatility and name a news event (like an injury) that moves a price.",
    plain:
      "Volatility is how much a price jumps around. Something that swings a lot is riskier: it can go up fast, but also down fast.",
    stock:
      "Investors measure volatility as how much daily returns vary. News such as earnings or a lawsuit can cause sudden jumps.",
    fantasy:
      "Injuries, depth-chart changes and trades are the news events of fantasy football. A star listed as Out can lose a big part of his value in days.",
    example: "biggest-loser-30d",
    whyItMatters:
      "Volatility is how risk shows up in prices. Knowing it helps you decide how much to put into one thing.",
    terms: ["volatility", "risk", "news-event"],
    handsOn: {
      href: "/markets?sort=change&dir=asc",
      label: "Open the biggest fallers",
      task: "Open the biggest faller. Is there injury news? Look at the chart: smooth or jumpy?",
    },
    quiz: [
      {
        q: "A volatile stock is one that…",
        options: ["always goes up", "moves up and down a lot", "never changes", "pays a dividend"],
        answer: 1,
        explain: "Volatility is about the size and frequency of moves, in either direction.",
      },
      {
        q: "Which is a fantasy football \"news event\" that can move a player's value fast?",
        options: ["A new stadium name", "An injury", "The colour of his cleats", "The weather last year"],
        answer: 1,
        explain: "Injuries change how much a player can score, so managers react immediately.",
      },
      {
        q: "Why is high volatility called \"risky\"?",
        options: ["Because the price can fall a lot in a short time", "Because it is illegal", "Because volume is low", "It isn't risky"],
        answer: 0,
        explain: "Big swings mean you could need to sell when the price happens to be low.",
      },
    ],
  },
  {
    id: "diversification",
    number: 5,
    title: "Diversification: don't put all your eggs in one basket",
    minutes: 4,
    outcome: "explain why concentrating in one sector (position) is risky.",
    plain:
      "Diversification means spreading your money across different things, so one bad event can't ruin everything.",
    stock:
      "Investors spread money across companies and sectors (tech, energy, healthcare). If one sector has a bad year, the others soften the blow.",
    fantasy:
      "Positions work like sectors. A roster that is mostly running backs is concentrated: if RB values drop (they often fall together as players age), the whole team's value drops.",
    example: "position-mix",
    whyItMatters:
      "Diversification is one of the few ways to reduce risk without simply holding less. Almost every investing guide starts here.",
    terms: ["diversification", "sector", "concentration", "portfolio"],
    handsOn: {
      href: "/portfolio/sleeper",
      label: "Open a real Sleeper roster",
      task: "Look at the position donut for a real roster. Which position holds the biggest share of value? Is it over 50%?",
    },
    quiz: [
      {
        q: "60% of your portfolio is in one position and it drops 20%. Roughly how much does your whole portfolio drop from that?",
        options: ["About 12%", "20%", "60%", "Nothing"],
        answer: 0,
        explain: "60% × 20% = 12%. Concentration passes a sector's losses straight to you.",
      },
      {
        q: "Which roster is more diversified?",
        options: ["8 running backs", "A mix of QBs, RBs, WRs and TEs", "Only your favourite team's players", "One superstar"],
        answer: 1,
        explain: "Different positions don't all rise and fall together, so a mix spreads the risk.",
      },
      {
        q: "What does diversification NOT do?",
        options: ["Spread risk", "Guarantee you never lose money", "Soften the hit from one bad sector", "Reduce concentration"],
        answer: 1,
        explain: "It lowers risk but cannot remove it. Everything can fall at once in a bad market.",
      },
    ],
  },
];

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
