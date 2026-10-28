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

// A statement line with its *phrase* in amber. `phrase` wraps it (the home page makes it the launch
// button); punctuation right after the phrase stays on its line, next to it.
export const statementHtml = (statement: string, phrase = (text: string) => `<em>${text}</em>`) =>
	escapeHtml(statement).replace(/\*([^*]+)\*([.,!?;:]?)/g, (_, text, punct) => `<span class="nowrap">${phrase(text)}${punct}</span>`);

// A ```math block: one equation a line. "Label:" at a line's start goes in a label column, a "(note)"
// after two spaces at its end is dimmed, v_x and S_{xy} are subscripts, F^T and S^{-1} superscripts,
// and a blank line is a gap between groups.
const mathText = (text: string) =>
	escapeHtml(text)
		.replace(/\^\{([^}]*)\}|\^(\S)/g, (_, long, one) => `<sup>${(long ?? one).replace(/-/g, "−")}</sup>`)
		.replace(/_\{([^}]*)\}|_(\w)/g, (_, long, one) => `<sub>${long ?? one}</sub>`);

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
			return `${label}<span class="math-eq">${mathText(r.eq)}</span>${r.note ? `<span class="math-note">${escapeHtml(r.note)}</span>` : ""}`;
		})
		.join("");
	return `<div class="${labels ? "math" : "math math-bare"}">${html}</div>`;
};
