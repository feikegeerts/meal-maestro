import { extractFromJsonLd } from "./jsonld";
import { extractFromText } from "./text";
import { extractFromMetaTags } from "./meta-tags";
import { extractFromHtml } from "./html"; // optional / not currently invoked
import { ExtractionResult } from "@/lib/scraper/types";

export type StrategyId =
  | "json-ld"
  | "text-extraction"
  | "meta-tags"
  | "html-parsing";

export interface Strategy {
  id: StrategyId;
  run: (html: string) => ExtractionResult;
  enabled: boolean;
  // Lower number = higher priority
  order: number;
}

// NOTE: html-parsing kept disabled by default for now (aggressive heuristic)
export const strategies: Strategy[] = [
  { id: "json-ld", order: 1, enabled: true, run: extractFromJsonLd },
  { id: "text-extraction", order: 2, enabled: true, run: extractFromText },
  { id: "meta-tags", order: 3, enabled: true, run: extractFromMetaTags },
  { id: "html-parsing", order: 4, enabled: false, run: extractFromHtml },
];

export function getActiveStrategies(): Strategy[] {
  return strategies.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
}
