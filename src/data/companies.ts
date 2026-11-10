/**
 * Curated list of well-known US-listed companies for the Player ⇄ Stock match.
 * CIKs were taken from SEC EDGAR XBRL "frames" data (entity names as registered with the SEC).
 * A spread of sizes on purpose, so every player percentile has a match.
 * See docs/decisions/0004-company-values-sec-edgar.md.
 */
export interface Company {
  ticker: string;
  cik: number;
  name: string;
}

export const COMPANIES: readonly Company[] = [
  { ticker: "AAPL", cik: 320193, name: "Apple" },
  { ticker: "MSFT", cik: 789019, name: "Microsoft" },
  { ticker: "NVDA", cik: 1045810, name: "NVIDIA" },
  { ticker: "AMZN", cik: 1018724, name: "Amazon" },
  { ticker: "GOOGL", cik: 1652044, name: "Alphabet (Google)" },
  { ticker: "META", cik: 1326801, name: "Meta Platforms" },
  { ticker: "TSLA", cik: 1318605, name: "Tesla" },
  { ticker: "BRK.B", cik: 1067983, name: "Berkshire Hathaway" },
  { ticker: "JPM", cik: 19617, name: "JPMorgan Chase" },
  { ticker: "V", cik: 1403161, name: "Visa" },
  { ticker: "MA", cik: 1141391, name: "Mastercard" },
  { ticker: "WMT", cik: 104169, name: "Walmart" },
  { ticker: "JNJ", cik: 200406, name: "Johnson & Johnson" },
  { ticker: "PG", cik: 80424, name: "Procter & Gamble" },
  { ticker: "XOM", cik: 34088, name: "Exxon Mobil" },
  { ticker: "KO", cik: 21344, name: "Coca-Cola" },
  { ticker: "PEP", cik: 77476, name: "PepsiCo" },
  { ticker: "COST", cik: 909832, name: "Costco" },
  { ticker: "NFLX", cik: 1065280, name: "Netflix" },
  { ticker: "DIS", cik: 1744489, name: "Walt Disney" },
  { ticker: "NKE", cik: 320187, name: "Nike" },
  { ticker: "SBUX", cik: 829224, name: "Starbucks" },
  { ticker: "INTC", cik: 50863, name: "Intel" },
  { ticker: "ORCL", cik: 1341439, name: "Oracle" },
  { ticker: "CRM", cik: 1108524, name: "Salesforce" },
  { ticker: "ADBE", cik: 796343, name: "Adobe" },
  { ticker: "PYPL", cik: 1633917, name: "PayPal" },
  { ticker: "UBER", cik: 1543151, name: "Uber" },
  { ticker: "ABNB", cik: 1559720, name: "Airbnb" },
  { ticker: "BA", cik: 12927, name: "Boeing" },
  { ticker: "F", cik: 37996, name: "Ford" },
  { ticker: "GM", cik: 1467858, name: "General Motors" },
  { ticker: "T", cik: 732717, name: "AT&T" },
  { ticker: "VZ", cik: 732712, name: "Verizon" },
  { ticker: "PFE", cik: 78003, name: "Pfizer" },
  { ticker: "HD", cik: 354950, name: "Home Depot" },
  { ticker: "LLY", cik: 59478, name: "Eli Lilly" },
  { ticker: "IBM", cik: 51143, name: "IBM" },
  { ticker: "CSCO", cik: 858877, name: "Cisco" },
  { ticker: "QCOM", cik: 804328, name: "Qualcomm" },
  { ticker: "CMG", cik: 1058090, name: "Chipotle" },
  { ticker: "LULU", cik: 1397187, name: "Lululemon" },
  { ticker: "EA", cik: 712515, name: "Electronic Arts" },
  { ticker: "DPZ", cik: 1286681, name: "Domino's Pizza" },
  { ticker: "CHWY", cik: 1766502, name: "Chewy" },
  { ticker: "ROKU", cik: 1428439, name: "Roku" },
  { ticker: "ETSY", cik: 1370637, name: "Etsy" },
  { ticker: "HAS", cik: 46080, name: "Hasbro" },
  { ticker: "MAT", cik: 63276, name: "Mattel" },
  { ticker: "GAP", cik: 39911, name: "Gap" },
  { ticker: "LYFT", cik: 1759509, name: "Lyft" },
  { ticker: "SNAP", cik: 1564408, name: "Snap" },
  { ticker: "GME", cik: 1326380, name: "GameStop" },
  { ticker: "PTON", cik: 1639825, name: "Peloton" },
];
