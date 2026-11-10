import { redirect } from "next/navigation";

export default function SleeperPortfolioIndex() {
  redirect(`/portfolio/sleeper/${process.env.NEXT_PUBLIC_DEMO_SLEEPER_USER || "johnrog"}`);
}
