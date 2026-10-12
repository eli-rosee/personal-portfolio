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

// A statement line with its *phrase* in amber. `phrase` wraps it (the home page makes it the launch
// button); punctuation right after the phrase stays on its line, next to it.
export const statementHtml = (statement: string, phrase = (text: string) => `<em>${text}</em>`) =>
	escapeHtml(statement).replace(/\*([^*]+)\*([.,!?;:]?)/g, (_, text, punct) => `<span class="nowrap">${phrase(text)}${punct}</span>`);
