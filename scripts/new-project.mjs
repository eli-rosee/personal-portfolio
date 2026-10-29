// Starts a new project: npm run new-project "Project Title"
// Makes src/content/projects/<slug>/ with an index.md listing every field's options, an assets/ folder
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
# project
#   status:
#     liftoff
#     in-orbit
#     decommissioned

title: ${quoted}
number: ${number}
status: liftoff
summary: One or two sentences.
stack: [Python, C++]

# display (delete for no signal)
#   fit:
#     crop (default)
#     whole
#   crop:
#     center (default)
#     top
#     bottom
#     left
#     right
#     top left
#     top right
#     bottom left
#     bottom right
#     x% y%
#   effects:
#     true (default)
#     false
#   zoom: 1 and up

display:
  image: display.png

# code (one or neither)
#   repo: <url> (default)
#   private: <tooltip>

repo: https://github.com/eli-rosee/${slug}

# readouts (up to 4)
#   note

readouts:
  - label: My role
    value: Role
  - label: Team
    value: Solo
  - label: When
    value: Jan 2026

# media (in order)
#   type:
#     video
#       thumbnail
#       sound:
#         true (default)
#         false
#     clip
#       file:
#         .mp4
#         .webm
#         .gif
#       shape:
#         landscape (default)
#         portrait
#     image
#       shape:
#         landscape (default)
#         portrait
#       fit, crop, zoom: as in display
#     slides
#       npm run slides <slug> deck.pptx makes the folder and the PDF
#       folder
#       pdf
#     link
#       href or file
#       live:
#         false (default)
#         true
#       label
#   every card
#     caption
#     wide:
#       false (default)
#       true
#   image, clip, video, slides
#     effects:
#       false (default)
#       true

media:
  - type: video
    file: demo.mp4
    title: Demo

# draft
#   delete to publish

draft: true

# write-up (files go in assets/)
#   ## Heading
#   **bold**
#   [text](url "tooltip")
#   - list
#   1. steps in order (numbered 01, 02, …)
#   - **Label:** text (the gap after the colon is set by the site)
#   blank line = new paragraph; extra blank lines or spaces add nothing
#   &ensp; or &emsp; = a one-off wider space
#   line\\ (line break)
#   ![alt](file "caption") on its own line
#     2–3 in a row sit side by side
#     {effects=true} right after it adds the image effects
#     {values=N} right after a clip adds a count of N values and a progress bar
#   \`\`\`math … \`\`\` = equations, one a line
#     Label:  x = F x    (note)
#     v_x  F^T  S^{-1}

# order
#   Background (opt)
#   The problem · The prompt
#   Approach · What we built
#   The core algorithm (opt)
#   My role (team projects)
#   Where I went wrong
#   Results
#   Awards (opt)

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
  1. Fill in ${dir}/index.md and put the project's files in ${dir}/assets/.
  2. Preview it at http://localhost:4321/projects/${slug}/ (npm run dev).
  3. Delete \`draft: true\` to publish it.
  Renamed the title? Run \`npm run art\` to redraw it.`);
