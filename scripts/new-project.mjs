// Starts a new project: npm run new-project "Project Title"
// Makes src/content/projects/<slug>/ with an index.md of every field (src/content/projects/guide.md explains them), an assets/ folder
// for its files, and the project marked as a draft (it shows in `npm run dev`, never in the built site). Then renders the
// title art, if the display font is installed.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const title = process.argv.slice(2).join(" ").trim();
if (!title) {
	console.error('Usage: npm run new-project "Project Title"');
	process.exit(1);
}

const slug = title
	.toLowerCase()
	.normalize("NFKD")
	.replace(/[\u0300-\u036f]/g, "") // accents off their letters: "Résumé" -> "resume", not "re-sume"
	.replace(/[^a-z0-9]+/g, "-")
	.replace(/^-|-$/g, "");
const root = "src/content/projects";
const dir = join(root, slug);
if (existsSync(dir)) {
	console.error(`${dir} already exists.`);
	process.exit(1);
}

// The next mission number
const numbers = readdirSync(root, { withFileTypes: true })
	.filter((d) => d.isDirectory() && existsSync(join(root, d.name, "index.md")))
	.map((d) => Number(readFileSync(join(root, d.name, "index.md"), "utf8").match(/^number:\s*(\d+)/m)?.[1] ?? 0));
const number = Math.max(0, ...numbers) + 1;
const quoted = JSON.stringify(title);

const template = `---
title: ${quoted}
number: ${number}
status: liftoff
summary: One or two sentences.
stack: [Python, C++]

display:
  image: display.png

highlights:
  - demo.mp4

repo: https://github.com/eli-rosee/${slug}

readouts:
  - label: My role
    value: Role
  - label: Team
    value: Solo
  - label: When
    value: Jan 2026

media:
  - type: video
    file: demo.mp4
    title: Demo

draft: true

achievement: The best result, in one line.
statement: One line, with *one phrase* in amber.
---

## The problem

What it had to do, in a sentence or two.
`;

mkdirSync(join(dir, "assets"), { recursive: true });
writeFileSync(join(dir, "index.md"), template);
console.log(`Made ${dir}/index.md (mission ${number}, a draft).`);

// The title in the display font (an image, by license); without the font the page shows plain text
if (existsSync("design/fonts/mission-control-dcu")) {
	try {
		execFileSync("python3", ["scripts/render-art.py"], { stdio: "ignore" });
		console.log(`Rendered the title art (src/assets/brand/titles/${slug}.png).`);
	} catch {
		console.log("Couldn't render the title art; run `npm run art` to see why.");
	}
}

console.log(`
Next:
  1. Fill in ${dir}/index.md (src/content/projects/guide.md explains every field) and put the project's files in ${dir}/assets/.
  2. Preview it at http://localhost:4321/projects/${slug}/ (npm run dev).
  3. Delete \`draft: true\` to publish it.
  Renamed the title? Run \`npm run art\` to redraw it.`);
