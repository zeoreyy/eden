// CI step after a scrape: open an issue when a source has failed 2 runs in a row; close it when it recovers.
// Uses the `gh` CLI (GH_TOKEN from the workflow). `npx tsx scripts/source-issues.ts [programme.json]`
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { CINEMA_BY_ID, type Programme } from "@eden/shared";

const p = JSON.parse(readFileSync(process.argv[2] ?? "out/programme.json", "utf8")) as Programme;
const LABEL = "source-failure";
const gh = (...args: string[]) => execFileSync("gh", args, { encoding: "utf8" });
const run = process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : "local run";

gh("label", "create", LABEL, "--color", "d6a892", "--description", "A cinema source failed 2+ runs in a row", "--force");
const open = JSON.parse(gh("issue", "list", "--label", LABEL, "--state", "open", "--json", "number,title")) as { number: number; title: string }[];
const titleOf = (id: string) => `Source failing: ${id}`;

for (const [id, s] of Object.entries(p.sources)) {
  const issue = open.find((i) => i.title === titleOf(id));
  if (!s.ok && (s.failures ?? 0) >= 2 && !issue) {
    const cinemas = s.cinemaIds.map((c) => CINEMA_BY_ID.get(c)?.name ?? c).join(", ");
    const body = [
      `**${id}** has failed ${s.failures} runs in a row.`, "",
      `- Cinemas: ${cinemas}`, `- Last error: ${s.note ?? "?"}`, `- Last success: ${s.lastSuccess ?? "never"}`, `- Run: ${run}`, "",
      "The app keeps showing the last good data with \"atualizado há X\" (or \"sem horários\" if there never was any).",
      "This issue closes by itself when the source works again.",
    ].join("\n");
    gh("issue", "create", "--title", titleOf(id), "--label", LABEL, "--body", body);
    console.log(`opened issue for ${id}`);
  } else if (s.ok && issue) {
    gh("issue", "close", String(issue.number), "--comment", `Recovered in ${run}.`);
    console.log(`closed issue #${issue.number} (${id} recovered)`);
  }
}
