import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import { papersSchema } from '../src/domain/paperSchema';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const papersPath = resolve(scriptDirectory, '../src/data/papers.json');

if (!existsSync(papersPath)) {
  console.error(`Paper data file not found: ${papersPath}`);
  console.error('Restore src/data/papers.json before validating data.');
  exit(1);
}

let papersJson: unknown;
try {
  papersJson = JSON.parse(readFileSync(papersPath, 'utf8'));
} catch (error) {
  console.error(`Failed to read or parse paper data at ${papersPath}.`);
  console.error(error instanceof Error ? error.message : String(error));
  exit(1);
}

const result = papersSchema.safeParse(papersJson);

if (!result.success) {
  console.error('Paper data validation failed.');
  console.error(JSON.stringify(result.error.format(), null, 2));
  exit(1);
}

const enabled = result.data.filter((paper) => paper.isEnabled);
const difficultyCounts = new Map<string, number>();
for (const paper of enabled) {
  for (const difficulty of paper.difficulty) {
    difficultyCounts.set(difficulty, (difficultyCounts.get(difficulty) ?? 0) + 1);
  }
}

console.log(`Validated ${result.data.length} papers (${enabled.length} enabled).`);
for (const [difficulty, count] of [...difficultyCounts.entries()].sort()) {
  console.log(`${difficulty}: ${count}`);
}
