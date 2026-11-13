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
    await page.locator('[data-privacy-reject]').click();
    check(data.produtos.length === 19, '19 product records');
    check(data.produtos.reduce((sum, p) => sum + p.variantes.length, 0) === 22, '22 variants');
    check(await page.locator('[data-product]:visible').count() === 22, '22 separate cards visible');
    check(await page.locator('h1').count() === 1, 'One page heading');
    check(await page.locator('meta[name="robots"]').getAttribute('content') === 'noindex, nofollow', 'Preview cannot be indexed');
    const schema = await page.locator('script[type="application/ld+json"]').allTextContents();
    check(schema.every(text => !text.includes('.br/https:')), 'Valid canonical breadcrumb');
    check(schema.every(text => !text.includes('"offers"')), 'No fabricated structured offers');
    check(await page.locator('#mainNav .brand-icon').getAttribute('src') === '/assets/images/brand/logo.jpeg', 'Original brand logo');
    check(await page.locator('#mainNav [aria-current="page"]').textContent().then(text => text.includes('Natal')), 'Christmas active navigation');
    check(await page.locator('.footer-gradient .social-link').count() === 5, 'Original footer social links');
    check(await page.locator('.whatsapp-float').isVisible(), 'Floating WhatsApp visible');
    check((await page.locator('.whatsapp-float').getAttribute('href')).includes('Natal'), 'Contextual WhatsApp message');
    check(await page.locator('svg.lucide').count() > 20, 'Official inline Lucide icons');
    check(await page.locator('#product-budget, #personalized').count() === 0, 'Removed price and personalization controls');
    await page.locator('[data-natal-dropdown]').click();
    check(await page.locator('#product-links').isVisible(), 'Desktop product dropdown');
    await page.keyboard.press('Escape');
    check(!await page.locator('#product-links').isVisible(), 'Dropdown Escape');
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No horizontal overflow at ${width}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-menu-toggle]').click();
    check(await page.locator('#navbarContent').isVisible() && await page.locator('[data-menu-toggle]').getAttribute('aria-expanded') === 'true', 'Mobile menu opens');
    await page.locator('[data-natal-dropdown]').click();
    check(await page.locator('#product-links').isVisible(), 'Mobile product dropdown');
    await page.keyboard.press('Escape');
    check(await page.locator('[data-menu-toggle]').getAttribute('aria-expanded') === 'true', 'First Escape closes only dropdown');
    await page.keyboard.press('Escape');
    check(await page.locator('[data-menu-toggle]').getAttribute('aria-expanded') === 'false', 'Second Escape closes mobile menu');
    check(await page.locator('[data-menu-toggle]').evaluate(el => el === document.activeElement), 'Mobile focus restored');
    check(await page.locator('.variant-gallery').count() === 0, 'No double cards');
    check(await page.locator('[data-product]').evaluateAll(cards => new Set(cards.map(card => card.id)).size === cards.length), 'Unique card IDs');
    for (const id of ['biscoito-saquinho', 'cartao-biscoito', 'pao-mel-saquinho']) {
      const cards = page.locator(`[data-product="${id}"]`);
      check(await cards.count() === 2, `${id}: two standalone cards`);
      const images = cards.locator('.product-media img');
      const sources = await images.evaluateAll(elements => elements.map(el => el.src));
      check(new Set(sources).size === 2, `${id}: distinct photo URLs`);
      check(await images.evaluateAll(elements => elements.every(el => el.getBoundingClientRect().width >= 300)), `${id}: full-size photos on mobile`);
      const p = data.produtos.find(p => p.id === id);
      for (const [index, v] of p.variantes.entries()) {
        const card = cards.nth(index);
        check((await card.locator('h4').textContent()) === v.referencia, `${v.referencia}: version in heading`);
        check(await card.locator('.product-order').getAttribute('data-order-reference') === v.referencia, `${v.referencia}: own WhatsApp button`);
        await card.locator('.product-open').click();
        check(await page.locator('#variant-select').inputValue() === String(index) && await page.locator('#dialog-order').getAttribute('data-order-reference') === v.referencia, `${v.referencia}: details open correct version`);
        await page.keyboard.press('Escape');
      }
    }
    check(await page.locator('.product-code, #dialog-code').count() === 0, 'No technical codes on cards or details');
    check(!/N26-\d/.test(await page.locator('body').innerText()), 'No numeric product codes visible');
    const references = new Set();
    for (const p of data.produtos) {
      for (const v of p.variantes) {
        check(!references.has(v.referencia), `Unique variant name: ${v.referencia}`);
        references.add(v.referencia);
        const link = page.locator(`[data-product="${p.id}"] [data-order-reference="${v.referencia}"]`);
        const href = new URL(await link.getAttribute('href'));
        const message = href.searchParams.get('text');
        check(href.origin === 'https://wa.me' && href.pathname === '/5511978458498', `Correct destination: ${v.referencia}`);
        check(message.includes(`\n${v.referencia}.\n`) && !message.includes('Código:'), `Exact product and version: ${v.referencia}`);
        check(await link.isVisible() && (await link.textContent()).includes('WhatsApp'), `Direct visible order button: ${v.referencia}`);
      }
      for (const flavor of p.sabores || []) {
        check(!references.has(flavor.referencia), `Unique flavor name: ${flavor.referencia}`);
        references.add(flavor.referencia);
        const href = new URL(await page.locator(`[data-product="${p.id}"] [data-order-reference="${flavor.referencia}"]`).getAttribute('href'));
        check(href.searchParams.get('text').includes(flavor.nome) && href.searchParams.get('text').includes(flavor.referencia), `Exact flavor message: ${flavor.referencia}`);
      }
    }
    await page.context().route('https://wa.me/**', route => route.fulfill({ contentType: 'text/html', body: '<title>WhatsApp link test</title>' }));
    const expectedHref = await page.locator('[data-product="biscoito-saquinho"] [data-order-reference="Biscoito decorado no saquinho"]').getAttribute('href');
    const popupPromise = page.waitForEvent('popup');
    await page.locator('[data-product="biscoito-saquinho"] [data-order-reference="Biscoito decorado no saquinho"]').click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    check(popup.url() === expectedHref, 'Card button opens the exact WhatsApp URL');
    await popup.close();
    await page.locator('.product-open[data-open-product="biscoito-saquinho"][data-variant-index="1"]').click();
    check(await page.locator('#variant-select').inputValue() === '1', 'Decorated card opens decorated version');
    check((await page.locator('#dialog-photo img').getAttribute('alt')).includes('decorado'), 'Decorated picture selected');
    check((await page.locator('#dialog-order').getAttribute('data-order-reference')) === 'Biscoito decorado no saquinho', 'Decorated reference displayed');
    check((await page.locator('#dialog-order').getAttribute('href')) === expectedHref, 'Details match direct card message');
    await page.locator('.thumb-option[data-choice="0"]').click();
    check(await page.locator('#variant-select').inputValue() === '0' && (await page.locator('#dialog-price').textContent()).includes('8,00'), 'Thumbnail updates selected variant and unit price');
    check((await page.locator('#dialog-order').getAttribute('data-order-reference')) === 'Biscoito carimbado no saquinho', 'Thumbnail updates WhatsApp code');
    await page.keyboard.press('Escape');
    check(await page.locator('.product-open[data-open-product="biscoito-saquinho"][data-variant-index="1"]').evaluate(el => el === document.activeElement), 'Details return focus');
    await page.locator('.product-open[data-open-product="chocotone-trufado"]').click();
    const originalFlavorPhoto = await page.locator('#dialog-photo img').getAttribute('src');
    await page.locator('#flavor-select').selectOption('Leite em pó');
    check(originalFlavorPhoto !== await page.locator('#dialog-photo img').getAttribute('src'), 'Flavor changes main photo');
    const flavorMessage = new URL(await page.locator('#dialog-order').getAttribute('href')).searchParams.get('text');
    check(flavorMessage.includes('Leite em pó') && flavorMessage.includes('Chocotone trufado · Leite em pó'), 'Selected flavor and code in WhatsApp message');
    await page.locator('.thumb-option[data-choice="Doce de leite"]').click();
    check(await page.locator('#flavor-select').inputValue() === 'Doce de leite', 'Flavor thumbnail updates selection');
    check((await page.locator('#dialog-order').getAttribute('data-order-reference')) === 'Chocotone trufado · Doce de leite', 'Flavor thumbnail updates order reference');
    await page.keyboard.press('Escape');
    for (const [category, count] of [['biscoitos', 14], ['chocotones', 5], ['pao-de-mel', 3], ['canecas', 4]]) {
      await page.locator(`[data-category="${category}"]`).click();
      check(await page.locator('[data-product]:visible').count() === count, `${category}: ${count}`);
    }
    await page.locator('[data-category="todos"]').click();
    await page.locator('#product-search').fill('pao de mel');
    check(await page.locator('[data-product]:visible').count() === 3, 'Accent-insensitive search');
    await page.locator('#product-search').fill('zzzzzz');
    check(await page.locator('#empty-state').isVisible(), 'Empty state');
    await page.locator('#clear-filters').click();
    await page.locator('#product-search').fill('leite em po');
    check(await page.locator('[data-product]:visible').count() === 3, 'Flavor objects remain searchable');
    await page.locator('#product-search').fill('');
    check(await page.locator('#selection-bar, #selection-dialog, #product-quantity, input[type="number"], #product-form').count() === 0, 'No basket, quantity, or purchase form');
    check(!/minha lista|adicionar à|total estimado|subtotal/i.test(await page.locator('body').innerText()), 'No basket copy or totals');
    check(await page.locator('.product-kind, .product-description, .steps-section, .promise-strip').count() === 0, 'No repeated marketing blocks');
    check(await page.locator('.product-details[open]').count() === 0, 'Long details collapsed initially');
    await page.locator('.product-open[data-open-product="logo-carimbada"]').click();
    check((await page.locator('#dialog-price').textContent()).includes('8,00'), 'Business unit price stays separate');
    check((await page.locator('#dialog-disclaimer').textContent()).includes('35,00'), 'Setup fee stays visible separately');
    check((await page.locator('#dialog-order').getAttribute('data-order-reference')) === 'Biscoito com logo carimbada', 'Business reference');
    await page.keyboard.press('Escape');
    for (const width of [320, 390, 540, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Page fits at ${width}`);
      for (const id of ['logo-carimbada', 'logo-impressa']) {
        const card = page.locator(`#${id}`);
        const fits = await card.evaluate(el => {
          const card = el.getBoundingClientRect();
          const targets = [el, ...el.querySelectorAll('h4, .product-content, .product-price, .fee-note, .product-order, .photo-label')];
          return targets.every(node => {
            const rect = node.getBoundingClientRect();
            return node.scrollWidth <= node.clientWidth + 1 && rect.left >= card.left - 1 && rect.right <= card.right + 1 && rect.bottom <= card.bottom + 1;
          });
        });
        check(fits, `${id}: content is not clipped at ${width}`);
        await card.locator('summary').click();
        check(await card.locator('.details-body').isVisible(), `${id}: details expand at ${width}`);
        await card.locator('summary').click();
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#product-search').fill('Biscoito decorado no saquinho');
    check(await page.locator('[data-product]:visible').count() === 1 && await page.locator('[data-product="biscoito-saquinho"][data-variant-index="1"]').isVisible(), 'Search by complete product name');
    await page.locator('#product-search').fill('biscoito saquinho carimbado');
    check(await page.locator('[data-product]:visible').count() === 1 && await page.locator('[data-product="biscoito-saquinho"][data-variant-index="0"]').isVisible(), 'Name search finds only matching version');
    await page.locator('#product-search').fill('pao mel grande');
    check(await page.locator('[data-product]:visible').count() === 1 && await page.locator('[data-product="pao-mel-saquinho"][data-variant-index="1"]').isVisible(), 'Size search finds only matching version');
    await page.locator('#product-search').fill('');
    check(errors.length === 0, `No JS errors: ${errors.join(', ')}`);
    await page.locator('[data-privacy-settings]').click();
    check(await page.locator('[data-privacy-banner]').isVisible(), 'Original cookie preferences open');
    await page.locator('[data-privacy-reject]').click();
    check(!await page.locator('[data-privacy-banner]').isVisible(), 'Cookie preferences close');
    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const fallback = await noJs.newPage();
    await fallback.goto(url, { waitUntil: 'domcontentloaded' });
    check(await fallback.locator('[data-product]:visible').count() === 22, 'Static catalogue without JS');
    check(!await fallback.locator('.catalog-tools').isVisible(), 'Nonfunctional controls hidden without JS');
    check(await fallback.locator('#product-links a').first().isVisible(), 'Navigation available without JS');
    check(await fallback.locator('[data-product="biscoito-saquinho"] .product-media img').count() === 2, 'Both separate card photos without JS');
    check(await fallback.locator('[data-product="biscoito-saquinho"] [data-order-reference="Biscoito carimbado no saquinho"]').isVisible() && await fallback.locator('[data-product="biscoito-saquinho"] [data-order-reference="Biscoito decorado no saquinho"]').isVisible(), 'Both direct variant orders without JS');
    await fallback.locator('#chocotone-trufado summary').click();
    check(await fallback.locator('#chocotone-trufado [data-order-reference="Chocotone trufado · Leite em pó"]').isVisible(), 'Flavor-specific WhatsApp without JS');
    await noJs.close();
    const original = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await original.goto(new URL('/', url).href, { waitUntil: 'domcontentloaded' });
    check(await original.locator('#mainNav a[data-bs-toggle="dropdown"]').count() === 1, 'Original site retains Bootstrap dropdown');
    check(await original.locator('.footer-gradient .social-link').count() === 5, 'Original footer remains intact');
    await original.close();
    const missingImages = await browser.newContext();
    await missingImages.route('https://placehold.co/**', route => route.abort());
    const imagePage = await missingImages.newPage();
    await imagePage.goto(url, { waitUntil: 'domcontentloaded' });
    await imagePage.waitForSelector('.hero-main .photo-fallback');
    check(await imagePage.locator('.hero-main .photo-frame').evaluate(el => el.clientHeight > 100), 'Image error preserves layout and label');
    await missingImages.close();
    const sitemap = fs.readFileSync(require('node:path').join(__dirname, '../dist/sitemap.xml'), 'utf8');
    check(!sitemap.includes('/natal/'), 'Preview excluded from sitemap');
    console.log(`${checks} checks passed: catalogue, references, direct WhatsApp, unclipped business cards, responsive layout, keyboard, no-JS and image fallback.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
