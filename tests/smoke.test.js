/**
 * Formula + behaviour tests for the PlanrPro AdMetrics calculator.
 * Runs the real index.html inside jsdom — no build step, no mocks of the app.
 *
 *   npm install && npm test
 *
 * Every expected value below is an independently computed number, so a refactor
 * that silently changes the math (or a formatter) fails loudly.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const FILE = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(FILE, 'utf8');
const STORE_KEY = 'planrpro.admetrics.ecom.inputs.v1';

function boot(seed) {
  return new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://localhost/',
    beforeParse(w) {
      if (seed) { try { w.localStorage.setItem(STORE_KEY, seed); } catch (e) {} }
    },
  });
}

let pass = 0, fail = 0;
function eq(label, actual, expected) {
  const ok = actual === expected;
  ok ? pass++ : fail++;
  if (!ok) console.log(`FAIL  ${label}\n      got  ${JSON.stringify(actual)}\n      want ${JSON.stringify(expected)}`);
  else console.log(`pass  ${label}`);
}

const dom = boot();
const w = dom.window;
const $ = id => w.document.getElementById(id);
const txt = id => ($(id) ? $(id).textContent.trim() : `<<MISSING ${id}>>`);
const cls = id => ($(id) ? $(id).className : '');

// ── globals the inline onclick/oninput attributes depend on ──
['calcGoogle','calcMeta','calcUniversal','resetGoogle','resetMeta','resetUniversal',
 'loadGoogleEx','loadMetaEx','loadUniEx','switchTab','switchLearn','init']
  .forEach(fn => eq(`${fn} exposed globally`, typeof w[fn], 'function'));

// ── Google planner ──
w.loadGoogleEx();
eq('g: clicks = budget ÷ cpc',                    txt('g-clicks'), '5,556');
eq('g: impressions use ₹ en-IN grouping',         txt('g-impr'), '1,01,010');
eq('g: orders = clicks × cvr',                    txt('g-orders'), '178');
eq('g: revenue = orders × aov',                   txt('g-revenue'), '₹3,20,000');
eq('g: roas = revenue ÷ budget',                  txt('g-roas'), '3.20x');
eq('g: cpa = budget ÷ orders',                    txt('g-cpa'), '₹563');
eq('g: break-even roas = 1 ÷ margin%',            txt('g-be-roas'), '2.22x (min)');
eq('g: gross profit after ads',                   txt('g-profit'), '₹44,000');
eq('g: net revenue after 8% returns',             txt('g-net-rev'), '₹2,94,400');
eq('g: MER% = spend ÷ revenue',                   txt('g-mer'), '31.3%');
eq('g: hint hidden once inputs are complete',     $('g-hint').style.display, 'none');
eq('g: profitable ROAS renders green',            cls('g-roas'), 'out-val hi');
eq('g: conservative scenario roas',               txt('gs-roas-c'), '2.13x'); // 3.20 ÷ 1.2 × 0.8
eq('g: optimistic scenario roas',                 txt('gs-roas-o'), '4.52x'); // 3.20 ÷ 0.85 × 1.2

// ── Meta planner ──
w.loadMetaEx();
eq('m: impressions = budget ÷ cpm × 1000',        txt('m-impr'), '6,15,385');
eq('m: reach = impressions ÷ frequency',          txt('m-reach'), '2,79,720');
eq('m: clicks = impressions × ctr',               txt('m-clicks'), '11,692');
eq('m: cpc derived from cpm and ctr',             txt('m-cpc'), '₹6.84');   // 130 ÷ (1.9×10)
eq('m: orders',                                   txt('m-orders'), '246');
eq('m: revenue',                                  txt('m-revenue'), '₹3,68,308');
eq('m: roas',                                     txt('m-roas'), '4.60x');
eq('m: break-even roas',                          txt('m-be-roas'), '2.08x (min)');
eq('m: ecpm mirrors cpm by construction',         txt('m-ecpm'), '₹130.00');
eq('m: base scenario roas equals headline roas',  txt('ms-roas-b'), '4.60x');

// ── Universal tools ──
w.loadUniEx();
eq('u: contribution margin per order',            txt('u-cm'), '₹651');     // 810 − 80 − 36 − 43.2
eq('u: break-even roas',                          txt('u-be-roas'), '2.77x');
eq('u: max allowable cpa',                        txt('u-max-cpa'), '₹521');
eq('u: target roas = break-even × 1.3',           txt('u-target-roas'), '3.60x');
eq('u: total marketing spend',                    txt('u-total-spend'), '₹2,00,000');
eq('u: blended roas',                             txt('u-blended-roas'), '25.00x');
eq('u: marketing as % of revenue',                txt('u-mer-pct'), '4.0%');
eq('u: current revenue',                          txt('u-cur-rev'), '₹4,20,000');
eq('u: target revenue',                           txt('u-new-rev'), '₹5,32,000');
eq('u: incremental revenue',                      txt('u-extra-rev'), '₹1,12,000');

// ── Empty state / reset ──
w.resetGoogle();
eq('reset clears the field',                      $('g-budget').value, '');
eq('empty state shows an em dash, not NaN',       txt('g-roas'), '—');
eq('hint returns when inputs are missing',        $('g-hint').style.display, 'block');

// ── Input validation ──
w.loadGoogleEx(); $('g-qs').value = '99';  w.calcGoogle();
eq('quality score clamped to 10',                 txt('g-kpi-qs'), '10/10 ✓ Good');
w.loadGoogleEx(); $('g-qs').value = '-4';  w.calcGoogle();
eq('negative quality score clamped to 1',         txt('g-kpi-qs'), '1/10 ✗ Poor');
w.loadGoogleEx(); $('g-cvr').value = '30'; w.calcGoogle();
eq('very high ROAS reads as good, not warning',   cls('g-roas'), 'out-val hi');
w.loadGoogleEx(); $('g-return').value = '150'; w.calcGoogle();
eq('return rate capped at 100%',                  txt('g-net-rev'), '₹0');
w.loadGoogleEx(); $('g-margin').value = '0'; w.calcGoogle();
eq('zero margin explains itself',                 txt('g-be-roas'), '— (enter margin > 0)');
eq('zero margin still reports the real loss',     txt('g-profit'), '-₹1,00,000');
w.loadGoogleEx(); $('g-cpc').value = '18.5'; w.calcGoogle();
eq('decimal CPC is accepted',                     txt('g-clicks'), '5,405');

// ── Persistence across reloads ──
w.loadGoogleEx();
const saved = w.localStorage.getItem(STORE_KEY);
eq('state saved on every recalc',                 JSON.parse(saved)['g-budget'], '100000');
eq('state spans all tabs',                        JSON.parse(saved)['u-aov'], '1800');
const w2 = boot(saved).window;
eq('inputs restored after reload',                w2.document.getElementById('g-budget').value, '100000');
eq('results re-rendered after reload',
   w2.document.getElementById('g-revenue').textContent.trim(), '₹3,20,000');

// ── Accessibility / hygiene ──
eq('every input has an accessible name',
   Array.from(w.document.querySelectorAll('.inp')).filter(i => !i.getAttribute('aria-label')).length, 0);
eq('active tab exposes aria-pressed',
   w.document.querySelector('button.tab-btn[aria-pressed="true"]') ? 'yes' : 'no', 'yes');
eq('decimal inputs are not step-locked to integers', $('g-cvr').getAttribute('step'), 'any');
eq('no Cloudflare save-page snippet left behind',  /cdn-cgi\/challenge-platform/.test(html) ? 'present' : 'gone', 'gone');
eq('no dead setRow helper left behind',            /setRow/.test(html) ? 'present' : 'gone', 'gone');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
