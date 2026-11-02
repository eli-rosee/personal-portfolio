/*
 * Small rewrites of rendered Markdown, shared by the home About and the project pages.
 */

const escapeHtml = (text: string) =>
	text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// A link's title becomes the site tooltip: [text](#target "Tip")
export const linkTooltips = (html: string) =>
	html.replace(
		/<a href="([^"]*)" title="([^"]*)">([^<]*)<\/a>/g,
		'<a href="$1">$3<span class="tooltip label" aria-hidden="true">$2</span></a>',
	);

// A list item led by a bold label, - **Label:** text, gets <strong class="term"> so CSS can set the gap after it
export const listLabels = (html: string) => html.replace(/<li>(\s*(?:<p>)?)<strong>([^<]*:)<\/strong>/g, '<li>$1<strong class="term">$2</strong>');

// Each paragraph's first sentence in a <span class="lead"> (the whole paragraph when it's one sentence).
// A sentence ends at . ! or ? before a space and a capital, so "M.S. in" doesn't end one.
export const leadSentences = (html: string) =>
	html.replace(/<p>([\s\S]*?)<\/p>/g, (paragraph, inner: string) => {
		const lead = inner.match(/^[\s\S]+?[.!?](?=\s+[A-Z<]|$)/)?.[0];
		return lead ? `<p><span class="lead">${lead}</span>${inner.slice(lead.length)}</p>` : paragraph;
	});

// Typed exponents, subscripts and fractions, in escaped text: n^2, 10^-8, x^{n+1}, n_2, v_x, S_{xy}, {1/2}. An
// unbraced subscript is one letter or a number and must end its word, so file_name, a_b_c and x_1.py stay as
// typed. A fraction needs its braces, so a score like 15/17 stays as typed.
const scripts = (text: string) =>
	text
		.replace(
			/(?<=(?<![\p{L}\p{N}_./])[\p{L}\p{N}]+|[)\]])_(?:\{([^{}]*)\}|(\d+|\p{L})(?![\p{L}\p{N}_@/]|\.[\p{L}\p{N}]))/gu,
			(_, long, one) => `<sub>${long ?? one}</sub>`,
		)
		.replace(
			/(?<=[\p{L}\p{N})\]]|<\/sub>)\^(?:\{([^{}]*)\}|([-−+]?[\p{L}\p{N}]+))/gu,
			(_, long, one) => `<sup>${(long ?? one).replace(/-/g, "−")}</sup>`,
		)
		.replace(/\{([^{}/]+)\/([^{}/]+)\}/g, '<span class="frac"><sup>$1</sup>/<sub>$2</sub></span>');

// The same in rendered Markdown: only in its text, never in tags or `code`
export const typedScripts = (html: string) =>
	html.replace(/<(pre|code)\b[\s\S]*?<\/\1>|<[^>]+>|[^<]+/g, (part) => (part[0] === "<" ? part : scripts(part)));

// A statement line with its *phrase* in amber; punctuation right after the phrase stays on its line, next to it
export const statementHtml = (statement: string) =>
	scripts(escapeHtml(statement)).replace(/\*([^*]+)\*([.,!?;:]?)/g, (_, text, punct) => `<span class="nowrap"><em>${text}</em>${punct}</span>`);

// A plain line of text with its exponents, subscripts and fractions set
export const textHtml = (text: string) => scripts(escapeHtml(text));

// The same line where only plain text can go (alt text, link previews): as typed, without the braces
export const plainText = (text: string) =>
	text
		.replace(/\^\{([^{}]*)\}/g, "^($1)")
		.replace(/_\{([^{}]*)\}/g, "_$1")
		.replace(/\{([^{}/]+\/[^{}/]+)\}/g, "$1");

// A ```math block: one equation a line. "Label:" at a line's start goes in a label column, a "(note)"
// after two spaces at its end is dimmed, exponents and subscripts are typed as anywhere else (scripts),
// and a blank line is a gap between groups.
export const mathBlock = (source: string) => {
	const rows = source.split("\n").map((line) => {
		if (!line.trim()) return undefined;
		const labelled = line.match(/^\s*([A-Za-z][\w ]*):\s+(.*)$/);
		const [, eq, note] = (labelled?.[2] ?? line.trim()).match(/^(.*?)(?:\s{2,}(\(.*\)))?\s*$/)!;
		return { label: labelled?.[1], eq, note };
	});
	const labels = rows.some((r) => r?.label);
	const html = rows
		.map((r, i) => {
			if (!r) return rows[i - 1] ? '<span class="math-gap"></span>' : "";
			const label = labels ? `<span class="math-label">${r.label ? escapeHtml(r.label) : ""}</span>` : "";
			return `${label}<span class="math-eq">${scripts(escapeHtml(r.eq))}</span>${r.note ? `<span class="math-note">${escapeHtml(r.note)}</span>` : ""}`;
		})
		.join("");
	return `<div class="${labels ? "math" : "math math-bare"}">${html}</div>`;
};
