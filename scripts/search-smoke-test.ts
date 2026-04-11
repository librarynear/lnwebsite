import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

type SearchRow = {
  id: string;
  slug: string;
  city: string;
  display_name: string;
  locality: string | null;
  nearest_metro: string | null;
  verification_status: string | null;
  profile_completeness_score: number | null;
  rank: number | null;
};

type SuggestionRow = {
  type: "library" | "locality" | "metro";
  label: string;
  slug: string;
  city: string;
};

const DEFAULT_CASES = [
  { q: "republic library", city: "delhi", note: "exact library name" },
  { q: "repub", city: "delhi", note: "prefix library match" },
  { q: "rajendra nagar", city: "delhi", note: "locality intent" },
  { q: "rajinder nagar", city: "delhi", note: "alternate spelling" },
  { q: "orn", city: "delhi", note: "alias abbreviation" },
  { q: "cp", city: "delhi", note: "common abbreviation" },
  { q: "rajendra place", city: "delhi", note: "metro intent" },
  { q: "rajinder place", city: "delhi", note: "metro alternate spelling" },
  { q: "karol bagh", city: "delhi", note: "locality search" },
  { q: "barakhamba", city: "delhi", note: "metro prefix" },
];

function getCasesFromArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    return DEFAULT_CASES;
  }

  return args.map((q) => ({ q, city: "delhi" }));
}

function printDivider() {
  console.log("-".repeat(90));
}

async function run() {
  const cases = getCasesFromArgs();

  for (const testCase of cases) {
    printDivider();
    console.log(`Query: "${testCase.q}" | city=${testCase.city}${"note" in testCase ? ` | ${testCase.note}` : ""}`);

    const startedAt = Date.now();
    const { data: searchResults, error: searchError } = await supabase.rpc(
      "search_libraries" as never,
      {
        query_term: testCase.q,
        city_filter: testCase.city,
        max_results: 5,
      } as never,
    );
    const searchMs = Date.now() - startedAt;

    if (searchError) {
      console.error(
        `search_libraries failed: ${searchError.message}\n` +
        "  Hint: your local code expects the newer search RPC shape. Apply the latest Supabase search migrations, then rerun this script.",
      );
    } else {
      console.log(`Top results (${searchMs}ms):`);
      const rows = (searchResults ?? []) as SearchRow[];
      if (rows.length === 0) {
        console.log("  No ranked results returned.");
      }
      rows.forEach((row, index) => {
        console.log(
          `${index + 1}. ${row.display_name} | locality=${row.locality ?? "-"} | metro=${row.nearest_metro ?? "-"} | verified=${row.verification_status ?? "-"} | rank=${row.rank ?? "-"}`,
        );
      });
    }

    const suggestionsStartedAt = Date.now();
    const { data: suggestions, error: suggestionsError } = await supabase.rpc(
      "search_suggestions" as never,
      {
        query_term: testCase.q,
      } as never,
    );
    const suggestionsMs = Date.now() - suggestionsStartedAt;

    if (suggestionsError) {
      console.error(`search_suggestions failed: ${suggestionsError.message}`);
    } else {
      console.log(`Suggestions (${suggestionsMs}ms):`);
      const rows = (suggestions ?? []) as SuggestionRow[];
      if (rows.length === 0) {
        console.log("  No suggestions returned.");
      }
      rows.forEach((row, index) => {
        console.log(`${index + 1}. [${row.type}] ${row.label} | city=${row.city} | slug=${row.slug}`);
      });
    }
  }

  printDivider();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
