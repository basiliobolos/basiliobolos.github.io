// Run against a generated site: NATAL_URL=http://127.0.0.1:4173/natal/ node tools/verificar-natal.cjs
// Playwright is a QA-only dependency; no browser packages enter the public build.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const data = require('../data/natal.json');
const url = process.env.NATAL_URL || 'http://127.0.0.1:4173/natal/';
let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks++; }
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('body.js-ready');
    await page.evaluate(() => document.fonts.ready);
    check(data.produtos.length === 19, '19 cards');
    check(data.produtos.reduce((sum, p) => sum + p.variantes.length, 0) === 22, '22 variants');
    check(await page.locator('[data-product]:visible').count() === 19, 'All cards visible');
    check(await page.locator('h1').count() === 1, 'One page heading');
    check(await page.locator('meta[name="robots"]').getAttribute('content') === 'noindex, nofollow', 'Preview cannot be indexed');
    const schema = await page.locator('script[type="application/ld+json"]').allTextContents();
    check(schema.every(text => !text.includes('.br/https:')), 'Valid canonical breadcrumb');
    check(schema.every(text => !text.includes('"offers"')), 'No fabricated structured offers');
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No horizontal overflow at ${width}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    for (const [category, count] of [['biscoitos', 12], ['chocotones', 5], ['pao-de-mel', 2], ['canecas', 4]]) {
      await page.locator(`[data-category="${category}"]`).click();
      check(await page.locator('[data-product]:visible').count() === count, `${category}: ${count}`);
    }
    await page.locator('[data-category="todos"]').click();
    await page.locator('#product-search').fill('pao de mel');
    check(await page.locator('[data-product]:visible').count() === 2, 'Accent-insensitive search');
    await page.locator('#product-search').fill('zzzzzz');
    check(await page.locator('#empty-state').isVisible(), 'Empty state');
    await page.locator('#clear-filters').click();
    await page.locator('#product-budget').selectOption('20');
    check(!await page.locator('#logo-carimbada').isVisible(), 'Budget includes R$35 setup');
    await page.locator('#product-budget').selectOption('');
    await page.locator('#personalized').check();
    check(await page.locator('[data-product]:visible').count() === 3, 'Photo or logo filters');
    await page.locator('#personalized').uncheck();
    async function add(id, index, amount, flavor) {
      await page.locator(`[data-open-product="${id}"]`).click();
      await page.locator('#variant-select').selectOption(String(index));
      if (flavor) await page.locator('#flavor-select').selectOption(flavor);
      await page.locator('#product-quantity').fill(String(amount));
      await page.locator('#product-form button[type="submit"]').click();
      check(!await page.locator('#product-dialog').isVisible(), `Added ${id}`);
    }
    await add('biscoito-saquinho', 1, 2);
    await add('logo-carimbada', 0, 10);
    await add('logo-carimbada', 0, 2);
    await add('chocotone-trufado', 0, 2, 'Leite em pó');
    await page.locator('#open-selection').click();
    check((await page.locator('#selection-total').textContent()).includes('337,00'), 'Total: 28 + 96 + 35 + 178 = 337');
    const href = new URL(await page.locator('#send-selection').getAttribute('href'));
    const message = href.searchParams.get('text');
    check(href.pathname === '/5511978458498', 'Correct WhatsApp destination');
    check(message.includes('12x Biscoito com logo carimbada') && message.includes('Decorado') && message.includes('Leite em pó'), 'Quantity, variant and flavor in message');
    check((message.match(/35,00/g) || []).length === 1, 'One setup fee');
    check(message.includes('valores da prévia'), 'Preview price disclaimer');
    check(await page.evaluate(() => { const d = document.querySelector('#selection-dialog'); return d.scrollWidth <= d.clientWidth; }), 'List dialog fits mobile');
    await page.getByRole('button', { name: 'Remover Biscoito com logo carimbada, Por unidade', exact: true }).click();
    check((await page.locator('#selection-total').textContent()).includes('206,00'), 'Removal recalculates total');
    await page.keyboard.press('Escape');
    check(!await page.locator('#selection-dialog').isVisible(), 'Escape closes modal');
    await page.locator('[data-open-product="mini-chocotone"]').click();
    await page.locator('#product-quantity').fill('0');
    await page.locator('#product-form button[type="submit"]').click();
    check(await page.locator('#product-dialog').isVisible(), 'Zero quantity blocked');
    await page.keyboard.press('Escape');
    check(await page.locator('[data-open-product="mini-chocotone"]').evaluate(el => el === document.activeElement), 'Focus restored');
    await add('mini-chocotone', 0, 999, 'Brigadeiro');
    await page.locator('[data-open-product="mini-chocotone"]').click();
    await page.locator('#product-form button[type="submit"]').click();
    check(await page.locator('#product-dialog').isVisible(), 'Accumulated quantity limit');
    await page.keyboard.press('Escape');
    await add('caixa-pao-mel', 0, 1);
    check(errors.length === 0, `No JS errors: ${errors.join(', ')}`);
    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const fallback = await noJs.newPage();
    await fallback.goto(url, { waitUntil: 'domcontentloaded' });
    check(await fallback.locator('[data-product]:visible').count() === 19, 'Static catalogue without JS');
    check(!await fallback.locator('.catalog-tools').isVisible(), 'Nonfunctional controls hidden without JS');
    await fallback.locator('#biscoito-saquinho summary').click();
    check(await fallback.locator('#biscoito-saquinho .details-body a').isVisible(), 'WhatsApp without JS');
    await noJs.close();
    const missingImages = await browser.newContext();
    await missingImages.route('https://placehold.co/**', route => route.abort());
    const imagePage = await missingImages.newPage();
    await imagePage.goto(url, { waitUntil: 'domcontentloaded' });
    await imagePage.waitForSelector('.hero-main .photo-fallback');
    check(await imagePage.locator('.hero-main .photo-frame').evaluate(el => el.clientHeight > 100), 'Image error preserves layout and label');
    await missingImages.close();
    const sitemap = fs.readFileSync(require('node:path').join(__dirname, '../dist/sitemap.xml'), 'utf8');
    check(!sitemap.includes('/natal/'), 'Preview excluded from sitemap');
    console.log(`${checks} checks passed: catalogue, responsive layout, filters, quantities, pricing, WhatsApp, keyboard, no-JS and image fallback.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
