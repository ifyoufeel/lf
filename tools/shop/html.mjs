// Small markup helpers the shop renderers share (tools/shop/render.mjs, tools/shop/markets.mjs).

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Numbers as the page writes them: thousands grouped, 140,120; a price with cents keeps both, 3,994.90.
export const num = (n) => n.toLocaleString('en-GB', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
export const usd = (n) => '$' + num(n);

export const ne = '<svg aria-hidden="true"><use href="#g-ne"/></svg>';

// A hyphenated word stays whole on its line ("Wi-Fi"), and a middle dot ends a line rather than starting one.
export const keep = (s) => esc(s).replace(/ · /g, ' · ').replace(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)+/gu, (w) => `<span class="nw">${w}</span>`);

// Every product photo stands whole on paper in a square tile and sweeps from grey to colour when its screen is active
// (rule 9). Subpages hold their pictures in square cards; the arch belongs to the home page (the owner's choice,
// 26 October 2026).
export const tile = (file, alt, lazy = true) => `<span class="tile goods"><img${lazy ? ' loading="lazy"' : ''} decoding="async" src="media/${esc(file)}" alt="${esc(alt)}"><i class="seal" aria-hidden="true"></i></span>`;

// A numbered list of steps, as "How ordering works" draws it.
export const steps = (list) => `<ol class="steps" data-fade style="--d:.3s">${list.map((s, i) => `<li><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="t">${esc(s.t)}</span><span class="s">${esc(s.s)}</span></li>`).join('')}</ol>`;
