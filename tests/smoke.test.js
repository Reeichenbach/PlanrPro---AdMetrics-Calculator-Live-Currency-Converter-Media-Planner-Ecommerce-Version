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

function boot(seeds) {
  return new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://localhost/',
    beforeParse(w) {
      Object.keys(seeds || {}).forEach(k => {
        try { w.localStorage.setItem(k, seeds[k]); } catch (e) {}
      });
    },
  });
}

const RATE_CACHE_KEY = 'planrpro.admetrics.ecom.rates.v1';
const CUR_STORE_KEY = 'planrpro.admetrics.ecom.currency.v1';

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
const w2 = boot({ [STORE_KEY]: saved }).window;
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

// ─────────────────────────────────────────────────────────────
// ── CURRENCY: display currency, conversion, converter, live/offline rates ──
// ─────────────────────────────────────────────────────────────
(async () => {
  w.loadGoogleEx();

  eq('currency defaults to INR via header select', $('cur-select').value, 'INR');
  eq('label rupees are marked for swapping',
     w.document.querySelectorAll('#tab-google .cur-mark, #tab-universal .cur-mark').length > 0 ? 'yes' : 'no', 'yes');
  eq('Learn tab keeps literal rupees (India-specific examples)',
     w.document.querySelectorAll('#tab-learn .cur-mark').length, 0);
  eq('rates fall back to the bundled table when no fetch exists',
     $('fx-status').className, 'fx-status offline');

  w.setCurrency('USD');
  eq('budget re-expressed in USD',            $('g-budget').value, '1199.0408'); // 100000 ÷ 83.40 (bundled)
  eq('cpc re-expressed in USD',               $('g-cpc').value, '0.21582734');  // 18 ÷ 83.40
  eq('aov re-expressed in USD',               $('g-aov').value, '21.582734');    // 1800 ÷ 83.40
  eq('percentages are NOT converted',         $('g-ctr').value, '5.5');
  eq('quality score is NOT converted',        $('g-qs').value, '7');
  eq('plan value survives the switch (roas)', txt('g-roas'), '3.20x');
  eq('outputs switch symbol',                 txt('g-revenue').charAt(0), '$');
  eq('label symbols switch too',
     w.document.querySelector('#tab-google .cur-mark').textContent, '$');
  eq('header select reflects the change',     $('cur-select').value, 'USD');

  w.setCurrency('INR');
  eq('round-trips back to the original budget', $('g-budget').value, '100000');
  eq('round-trips back to the original revenue', txt('g-revenue'), '₹3,20,000');

  // converter card
  $('fx-amount').value = '100000';
  $('fx-from').value = 'INR'; $('fx-to').value = 'USD';
  w.calcFx();
  eq('converter output (bundled rate)',  txt('fx-result'), '$1,199.04');
  eq('converter shows the rate used',    /^1 INR = \$0\.0120 · bundled estimate$/.test(txt('fx-rate-line')) ? 'ok' : txt('fx-rate-line'), 'ok');
  w.swapFx();
  eq('swap keeps the amount, flips the pair', txt('fx-result'), '₹83,40,000.00');
  eq('swap flips the selects', [$('fx-from').value, $('fx-to').value].join('>'), 'USD>INR');

  // live rates via a stubbed endpoint
  w.fetch = () => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      result: 'success',
      rates: { INR: 1, USD: 0.012, EUR: 0.0111, GBP: 0.00947, AED: 0.0439, SGD: 0.0161, AUD: 0.0184, CAD: 0.0168 },
    }),
  });
  await w.refreshRates();
  eq('live fetch switches the status pill', $('fx-status').className, 'fx-status live');
  eq('status quotes a live USD rate', /1 USD = ₹83\.33/.test(txt('fx-status')) ? 'ok' : txt('fx-status'), 'ok');
  $('fx-from').value = 'INR'; $('fx-to').value = 'USD';
  w.calcFx();
  eq('converter now uses the live rate',   txt('fx-result'), '$1,200.00');       // 100000 × 0.012
  eq('rate line says live',                /· live rate$/.test(txt('fx-rate-line')) ? 'ok' : txt('fx-rate-line'), 'ok');
  eq('live rates are cached',              w.localStorage.getItem(RATE_CACHE_KEY) ? 'yes' : 'no', 'yes');

  // a failed endpoint must degrade, not break
  const wOff = boot({}).window;
  wOff.fetch = () => Promise.reject(new Error('blocked'));
  await wOff.refreshRates();
  eq('blocked FX API keeps the app on bundled rates',
     wOff.document.getElementById('fx-status').className, 'fx-status offline');
  wOff.document.getElementById('fx-amount').value = '100000';
  wOff.calcFx();
  eq('converter still works offline',
     wOff.document.getElementById('fx-result').textContent.trim(), '$1,199.04');

  // cached rates are reused on the next visit (no network needed)
  const cached = w.localStorage.getItem(RATE_CACHE_KEY);
  const wCache = boot({ [RATE_CACHE_KEY]: cached }).window;
  eq('fresh load reuses the cached live rate',
     wCache.document.getElementById('fx-status').className, 'fx-status live');

  // display currency persists across reloads, together with the plan it belongs to
  w.loadGoogleEx();
  w.setCurrency('USD');
  const usdState = w.localStorage.getItem(STORE_KEY);
  eq('saved plan records its currency', JSON.parse(usdState).__cur, 'USD');
  const wCur = boot({ [STORE_KEY]: usdState }).window;
  eq('display currency persists across reloads',
     wCur.document.getElementById('cur-select').value, 'USD');
  eq('restored currency formats outputs in USD',
     wCur.document.getElementById('g-revenue').textContent.charAt(0), '$');
  // the stubbed live rate is 1/0.012 = 83.3333, hence 100000 ÷ 83.3333 = 1200
  eq('restored budget kept the USD amount, converted at the live rate',
     wCur.document.getElementById('g-budget').value, '1200');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
