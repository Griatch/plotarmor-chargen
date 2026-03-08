/**
 * Unit tests for plotarmor-chargen.html
 *
 * Loads the HTML file in jsdom with inline scripts enabled, then
 * exercises the character-generation logic.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(__dirname, '..', 'plotarmor-chargen.html');
const htmlSource = readFileSync(htmlPath, 'utf-8');

// Strip external <script src="…"> tags (html2pdf CDN etc.) and load in jsdom
const cleanedHtml = htmlSource.replace(
    /<script\s+src=["'][^"']*["'][^>]*><\/script>/gi,
    ''
);
const dom = new JSDOM(cleanedHtml, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://localhost',
});
const win = dom.window;

// Fire DOMContentLoaded so the page runs its init (generateCharacter, etc.)
const ev = win.document.createEvent('Event');
ev.initEvent('DOMContentLoaded', true, true);
win.document.dispatchEvent(ev);

/** Access a top-level const/let variable (not on window) via eval. */
const g = (name) => win.eval(name);

// ── Utility functions ────────────────────────────────────────────────

describe('randomElement', () => {
    it('returns an element from the given array', () => {
        const arr = ['a', 'b', 'c'];
        for (let i = 0; i < 20; i++) {
            const result = win.randomElement(arr);
            assert.ok(arr.includes(result), `Expected one of ${arr}, got ${result}`);
        }
    });

    it('returns the only element for single-element arrays', () => {
        assert.equal(win.randomElement(['x']), 'x');
    });
});

describe('shuffleArray', () => {
    it('returns an array of the same length with the same elements', () => {
        const original = [1, 2, 3, 4, 5];
        const shuffled = win.shuffleArray(original);
        assert.equal(shuffled.length, original.length);
        assert.deepEqual([...shuffled].sort(), [...original].sort());
    });

    it('does not mutate the original array', () => {
        const original = [1, 2, 3];
        const copy = [...original];
        win.shuffleArray(original);
        assert.deepEqual(original, copy);
    });
});

// ── escapeHtml / parseMarkdown ───────────────────────────────────────

describe('escapeHtml', () => {
    it('escapes &, < and >', () => {
        assert.equal(win.escapeHtml('a & b < c > d'), 'a &amp; b &lt; c &gt; d');
    });

    it('leaves normal text unchanged', () => {
        assert.equal(win.escapeHtml('hello world'), 'hello world');
    });
});

describe('parseMarkdown', () => {
    it('converts **bold** to <strong>', () => {
        const result = win.parseMarkdown('a **bold** word');
        assert.ok(result.includes('<strong>bold</strong>'));
    });

    it('converts *italic* to <em>', () => {
        const result = win.parseMarkdown('an *italic* word');
        assert.ok(result.includes('<em>italic</em>'));
    });

    it('escapes HTML within the text', () => {
        const result = win.parseMarkdown('<script>alert(1)</script>');
        assert.ok(!result.includes('<script>'));
        assert.ok(result.includes('&lt;script&gt;'));
    });
});

// ── renderApproach ───────────────────────────────────────────────────

describe('renderApproach', () => {
    it('bolds the approach name before the comma', () => {
        const result = win.renderApproach('Quickly, because of speed');
        assert.ok(result.startsWith('<strong>Quickly</strong>,'));
    });

    it('handles text without a comma gracefully', () => {
        const result = win.renderApproach('Quickly');
        assert.equal(typeof result, 'string');
        assert.ok(result.length > 0);
    });
});

// ── Data integrity ───────────────────────────────────────────────────

describe('data constants', () => {
    const GENRES = ['modern', 'fantasy', 'scifi', 'horror'];
    const TONES = ['dark', 'realistic', 'lighthearted'];

    it('NAMES has entries for every genre', () => {
        const NAMES = g('NAMES');
        for (const genre of GENRES) {
            assert.ok(NAMES[genre], `Missing NAMES for ${genre}`);
            assert.ok(NAMES[genre].first.length > 0, `Empty first names for ${genre}`);
            assert.ok(NAMES[genre].last.length > 0, `Empty last names for ${genre}`);
        }
    });

    it('CONCEPTS has entries for every genre/tone combo', () => {
        const CONCEPTS = g('CONCEPTS');
        for (const genre of GENRES) {
            for (const tone of TONES) {
                assert.ok(
                    CONCEPTS[genre][tone].length > 0,
                    `Empty CONCEPTS for ${genre}/${tone}`
                );
            }
        }
    });

    it('CHARACTER_DETAILS has entries for every genre/tone combo', () => {
        const CD = g('CHARACTER_DETAILS');
        for (const genre of GENRES) {
            for (const tone of TONES) {
                assert.ok(
                    CD[genre][tone].length > 0,
                    `Empty CHARACTER_DETAILS for ${genre}/${tone}`
                );
            }
        }
    });

    it('MAGICAL_APPROACHES has entries for every genre/tone combo', () => {
        const MA = g('MAGICAL_APPROACHES');
        for (const genre of GENRES) {
            for (const tone of TONES) {
                assert.ok(
                    MA[genre][tone],
                    `Missing MAGICAL_APPROACHES for ${genre}/${tone}`
                );
            }
        }
    });

    it('APPROACH_EXPLANATIONS covers every regular approach for every genre', () => {
        const APPROACHES = g('APPROACHES');
        const AE = g('APPROACH_EXPLANATIONS');
        const allApproaches = [
            ...APPROACHES.physical,
            ...APPROACHES.mental,
            ...APPROACHES.social,
        ];
        for (const genre of GENRES) {
            for (const approach of allApproaches) {
                assert.ok(
                    AE[genre][approach],
                    `Missing explanation for ${approach} in ${genre}`
                );
                assert.ok(
                    AE[genre][approach].length > 0,
                    `Empty explanations for ${approach} in ${genre}`
                );
            }
        }
    });

    it('APPROACH_EXPLANATIONS covers magical approaches for every genre/tone', () => {
        const MA = g('MAGICAL_APPROACHES');
        const AE = g('APPROACH_EXPLANATIONS');
        for (const genre of GENRES) {
            for (const tone of TONES) {
                const magicalApproach = MA[genre][tone];
                assert.ok(
                    AE[genre][magicalApproach],
                    `Missing explanation for magical approach ${magicalApproach} in ${genre}`
                );
            }
        }
    });
});

// ── Name generation ──────────────────────────────────────────────────

describe('generateName', () => {
    it('returns a two-part name string', () => {
        const name = win.generateName('fantasy');
        assert.equal(typeof name, 'string');
        const parts = name.split(' ');
        assert.ok(parts.length >= 2, `Expected at least two parts, got: "${name}"`);
    });

    it('uses names from the correct genre', () => {
        const NAMES = g('NAMES');
        for (let i = 0; i < 20; i++) {
            const name = win.generateName('modern');
            const [first] = name.split(' ');
            assert.ok(
                NAMES.modern.first.includes(first),
                `"${first}" not in modern first names`
            );
        }
    });
});

// ── Blurb generation ─────────────────────────────────────────────────

describe('generateBlurb', () => {
    it('returns a non-empty capitalised string', () => {
        const blurb = win.generateBlurb('fantasy', 'dark');
        assert.ok(blurb.length > 0);
        assert.equal(blurb[0], blurb[0].toUpperCase());
    });
});

// ── Approach generation ──────────────────────────────────────────────

describe('generateApproaches', () => {
    it('returns 5 approaches by default', () => {
        const approaches = win.generateApproaches('fantasy', 'dark', false, false);
        assert.equal(approaches.length, 5);
    });

    it('returns 4 approaches when leaveUndefined is true', () => {
        const approaches = win.generateApproaches('fantasy', 'dark', false, true);
        assert.equal(approaches.length, 4);
    });

    it('includes a magical approach when includeMagical is true', () => {
        const MA = g('MAGICAL_APPROACHES');
        const approaches = win.generateApproaches('fantasy', 'dark', true, false);
        const magical = MA.fantasy.dark;
        const hasM = approaches.some(a => a.startsWith(magical + ','));
        assert.ok(hasM, `Expected magical approach "${magical}" in approaches`);
    });

    it('each approach follows the "Name, because reason" format', () => {
        const approaches = win.generateApproaches('scifi', 'realistic', true, false);
        for (const a of approaches) {
            assert.ok(a.includes(', because '), `Bad format: "${a}"`);
        }
    });
});

// ── Full character generation (via DOM) ──────────────────────────────

describe('generateCharacter', () => {
    beforeEach(() => {
        win.document.getElementById('genre').value = 'fantasy';
        win.document.getElementById('tone').value = 'dark';
        win.document.getElementById('magical').checked = false;
        win.document.getElementById('leaveUndefined').checked = false;
        win.generateCharacter();
    });

    it('populates currentCharacter with expected fields', () => {
        const c = g('currentCharacter');
        assert.ok(c, 'currentCharacter should be set');
        assert.equal(typeof c.name, 'string');
        assert.equal(typeof c.blurb, 'string');
        assert.equal(typeof c.details, 'string');
        assert.ok(Array.isArray(c.approaches));
        assert.equal(c.luck, 1);
    });

    it('renders the character name in the DOM', () => {
        const nameEl = win.document.querySelector('.character-name .field-text');
        assert.ok(nameEl, 'Name element should exist');
        assert.ok(nameEl.textContent.trim().length > 0);
    });

    it('renders 5 approaches in the DOM by default', () => {
        const items = win.document.querySelectorAll('.approach-item');
        assert.equal(items.length, 5);
    });

    it('renders 4 approaches when leaveUndefined is on', () => {
        win.document.getElementById('leaveUndefined').checked = true;
        win.generateCharacter();
        const items = win.document.querySelectorAll('.approach-item');
        assert.equal(items.length, 4);
    });
});

// ── Toggle functions ─────────────────────────────────────────────────

describe('toggleMagical', () => {
    beforeEach(() => {
        win.document.getElementById('genre').value = 'fantasy';
        win.document.getElementById('tone').value = 'dark';
        win.document.getElementById('magical').checked = false;
        win.document.getElementById('leaveUndefined').checked = false;
        win.generateCharacter();
    });

    it('adds a magical approach when toggled on', () => {
        const MA = g('MAGICAL_APPROACHES');
        win.document.getElementById('magical').checked = true;
        win.toggleMagical();
        const magical = MA.fantasy.dark;
        const c = g('currentCharacter');
        const has = c.approaches.some(a => a.startsWith(magical + ','));
        assert.ok(has, 'Last approach should be magical');
    });

    it('removes the magical approach when toggled off', () => {
        const MA = g('MAGICAL_APPROACHES');
        win.document.getElementById('magical').checked = true;
        win.toggleMagical();
        win.document.getElementById('magical').checked = false;
        win.toggleMagical();
        const magical = MA.fantasy.dark;
        const c = g('currentCharacter');
        const has = c.approaches.some(a => a.startsWith(magical + ','));
        assert.ok(!has, 'Magical approach should be removed');
    });
});

describe('toggleLeaveUndefined', () => {
    beforeEach(() => {
        win.document.getElementById('genre').value = 'fantasy';
        win.document.getElementById('tone').value = 'dark';
        win.document.getElementById('magical').checked = false;
        win.document.getElementById('leaveUndefined').checked = false;
        win.generateCharacter();
    });

    it('removes one approach when toggled on', () => {
        const before = g('currentCharacter').approaches.length;
        win.document.getElementById('leaveUndefined').checked = true;
        win.toggleLeaveUndefined();
        assert.equal(g('currentCharacter').approaches.length, before - 1);
    });

    it('adds one approach when toggled off again', () => {
        win.document.getElementById('leaveUndefined').checked = true;
        win.toggleLeaveUndefined();
        const after1 = g('currentCharacter').approaches.length;
        win.document.getElementById('leaveUndefined').checked = false;
        win.toggleLeaveUndefined();
        assert.equal(g('currentCharacter').approaches.length, after1 + 1);
    });
});

// ── updateMagicalLabel ───────────────────────────────────────────────

describe('updateMagicalLabel', () => {
    it('shows "Mental" for scifi genre', () => {
        win.document.getElementById('genre').value = 'scifi';
        win.updateMagicalLabel();
        const label = win.document.getElementById('magicalLabel');
        assert.ok(label.textContent.includes('Mental'));
    });

    it('shows "Occult" for horror genre', () => {
        win.document.getElementById('genre').value = 'horror';
        win.updateMagicalLabel();
        const label = win.document.getElementById('magicalLabel');
        assert.ok(label.textContent.includes('Occult'));
    });

    it('shows "Magical" for fantasy genre', () => {
        win.document.getElementById('genre').value = 'fantasy';
        win.updateMagicalLabel();
        const label = win.document.getElementById('magicalLabel');
        assert.ok(label.textContent.includes('Magical'));
    });
});
