// Starts a new project: npm run new-project "Project Title"
// Makes src/content/projects/<slug>/ with an index.md holding every field, each explained, an assets/
// folder for its files, and the
// project marked as a draft (it shows in `npm run dev`, never in the built site). Then renders the
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
title: ${quoted}
number: ${number}                 # order on the home page
status: liftoff           # liftoff (in progress) · in-orbit (done) · decommissioned
summary: One or two sentences, shown on the card and at the top of the page.
stack: [Python, C++]

# The screen on the card and the page. Delete the block for a "no signal" screen.
display:
  image: display.png
  # fit: whole            # show the whole image, with dark bars (default: crop, filling the screen)
  # crop: top             # part kept in view: center (default), top, bottom, left, right, top left...
  # zoom: 1.3             # zoom in around the crop point (1 = none)

# The code button. Keep one, or neither:
repo: https://github.com/eli-rosee/${slug}
# private: Course policy keeps it private · email me   # "Code on request": emails me; this is its tooltip.
#                                                      # Coursework uses this line; write your own reason otherwise.

# Facts under the top card. The note is the grey line under the value (optional).
readouts:
  - label: My role
    value: Role
    note: One line on what I owned
  - label: The team
    value: Team
  - label: Timeline
    value: Jan 2026 → Mar 2026

# Opens the About section. *Asterisks* make a phrase amber.
statement: One line on the project, with *one phrase* in amber.

# Cards under About, in this order. Delete any you don't use.
media:
  - type: video           # with sound; opens in the theater
    file: demo.mp4
    title: Demo
    # caption: Grey line under the title
    # poster: demo.png    # frame shown before it plays
    # sound: false        # hides "Sound on" on the card (default: true)
    # wide: true          # spans both columns
  - type: clip            # silent loop: .mp4, .webm or .gif; it plays on the card
    file: clip.mp4
    title: Clip
    # caption: Grey line under the title
    # shape: portrait     # a tall card, two rows high, for phone videos (default: landscape)
    # wide: true
  - type: image
    file: photo.png
    title: Photo
    # caption: Grey line under the title
    # shape: portrait     # a tall card, two rows high (default: landscape)
    # fit: whole          # show all of it, with dark bars (default: crop, filling the card)
    # crop: top           # with crop: the part kept in view
    # zoom: 1.3           # with crop: zoom in around that part
    # wide: true
  - type: slides
    folder: slides/       # slide images, in file-name order
    title: Slides
    # caption: Grey line under the title
    # pdf: deck.pdf       # download
    # wide: true
  - type: link            # a web page: a bar under the cards, opens a new tab
    href: https://example.com
    title: Live site
    # live: true          # the project running: first, a green Live light, its own button
    # label: Paper        # the bar's tag (default: Link, or Live)
  - type: link            # a file in assets/: a bar too
    file: report.pdf
    title: Report
    # label: PDF          # (default: the file's extension)

draft: true               # delete to publish
---

<!--
FILES: everything goes in assets/ beside this file; write paths from there ("plot.png", "slides/").
In a draft a missing file shows as a gap on the page; once published it stops the build.

THE WRITE-UP below becomes the About section.
  ## Heading               starts a section; the heading sits in the left column
  **bold**                set in white
  [text](https://...)     an amber [link]; [text](https://... "Tip") adds a tooltip
  - item                  a list
  line one\\               a backslash at the end of a line starts a new line, without a paragraph gap

FIGURES: on a line of their own, with a blank line before and after.
  ![Alt text](plot.png "Caption")
    Caption: shown under the figure.
    Alt text: read aloud by screen readers in place of the image; never shown on the page.
    Leave it empty to reuse the caption: ![](plot.png "Caption")
  Two or three figure lines with no blank line between them sit side by side, at one height.
  .png .jpg .webp are images; .gif .mp4 .webm play as silent loops. A tall image gets a portrait (3:4)
  frame, a wide one a landscape (16:9) frame; both are filled, cutting the edges if needed.

WAYS TO ORGANIZE IT (start with My role; pick one outline, or mix):

  Engineering problem   My role / The problem / Constraints / Approach / How it works / Results / What I'd change
  Story                 My role / Where it started / First attempt / What broke / The fix / Where it ended up / What I learned
  Team or course        My role / The brief / The team / What I built / Bringing it together / Demo day / Takeaways
  Research or data      My role / The question / The data / Method / Findings / Limits / Next steps
  Robotics build        My role / The goal / Hardware / Software / Testing / Failures / Final result
  Tool or product       My role / Who it's for / The problem it solves / Features / Under the hood / What's next

  More headings: Background · Requirements · Design decisions · Trade-offs · Architecture · The hard part ·
  A bug worth telling · Performance · Testing · Results in numbers · Demo · Lessons learned ·
  If I did it again · Credits
-->

## My role

What I owned, in a sentence or two.
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
