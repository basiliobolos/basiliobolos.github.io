'use strict';
// QA local, sem screenshots, tráfego de analytics ou mudanças nos dados comerciais.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const { ancoraVersao, criarRegistro } = require('./natal-catalogo.cjs');
const { executarGerador, fixtureAprovada } = require('./verificar-seo-natal.cjs');
const data = require('../data/natal.json');
const site = require('../data/site.json');
const registro = criarRegistro(data, site);
const servers = [];
let checks = 0;
const check = (value, label) => { assert.ok(value, label); checks++; };
async function servir(output) {
  const base = path.resolve(__dirname, '../dist');
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    const rel = pathname.slice(1) + (pathname.endsWith('/') ? 'index.html' : '');
    const target = path.resolve(base, rel);
    if (!target.startsWith(base + path.sep)) { res.writeHead(403).end(); return; }
    const content = output?.get(rel);
    if (content !== undefined) { res.writeHead(200, { 'content-type': types[path.extname(rel)] || 'text/plain' }).end(content); return; }
    if (output && !/^(css|js|assets)\//.test(rel)) { res.writeHead(404).end(); return; }
    try { const body = fs.readFileSync(target); res.writeHead(200, { 'content-type': types[path.extname(rel)] || 'application/octet-stream' }).end(body); }
    catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}`;
}
async function pagina(browser, ctx, origin) {
  const products = ctx.produtosPrincipais;
  const main = ctx.itensPrincipais.filter(({ produto, variante }) => variante === produto.variantes[0]);
  const relatedCount = new Set(ctx.itensRelacionados.map(({ produto }) => produto.id)).size;
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const activePhoto = page.locator('#dialog-photo .photo-frame:not([aria-hidden]) img');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const url = `${origin}${ctx.pagina.rota}?utm_source=qa`;
  check((await page.goto(url, { waitUntil: 'domcontentloaded' })).status() === 200, 'Acesso direto');
  await page.waitForSelector('body.js-ready');
  await page.locator('[data-privacy-reject]').click();
  check(await page.locator('[data-product]').count() === main.length, 'Contagem só dos produtos principais');
  check(await page.locator('[data-related-product]').count() === relatedCount, 'Relacionados separados da contagem principal');
  check(await page.locator('h1').count() === 1 && await page.locator('h1').textContent() === ctx.pagina.h1, 'H1 único por intenção');
  check(await page.title() === ctx.pagina.seo.title, 'Título por intenção');
  const imagensHero = page.locator('.hero-art img');
  const esperadas = [{ src: ctx.hero.imagem, alt: ctx.hero.alt }];
  if (ctx.hero.imagemMenor !== null) esperadas.push({ src: ctx.hero.imagemMenor, alt: ctx.hero.altMenor });
  const renderizadas = await imagensHero.evaluateAll(images => images.map(image => ({ src: image.getAttribute('src'), alt: image.alt })));
  assert.deepEqual(renderizadas, esperadas, 'Hero usa as fotos e descrições da rota');
  checks++;
  check(await imagensHero.evaluateAll(images => Promise.all(images.map(async image => { await image.decode(); return image.naturalWidth === 800 && image.naturalHeight === 800; })).then(values => values.every(Boolean))), 'Fotos do hero carregam em 800 × 800');
  check(await page.locator('.hero-main img').getAttribute('fetchpriority') === 'high' && await page.locator('.hero-main img').getAttribute('loading') === 'eager', 'Foto principal do hero carrega com prioridade');
  check(await page.locator('.breadcrumb [aria-current="page"]').count() === 1, 'Trilha acessível');
  check(await page.locator('link[rel="canonical"]').getAttribute('href') === `${site.url}${ctx.pagina.rota}`, 'Canonical sem query');
  check(await page.locator('meta[name="robots"]').getAttribute('content') === (ctx.publico ? 'index, follow' : 'noindex, nofollow'), 'Robots corresponde ao estado da página');
  const ids = await page.locator('[id]').evaluateAll(els => els.map(e => e.id));
  check(ids.length === new Set(ids).size, 'IDs únicos em todo o documento');
  check(await page.locator('.footer-gradient .social-link').count() === 5 && await page.locator('.whatsapp-float').isVisible(), 'Rodapé e WhatsApp originais');
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${ctx.pagina.id}: sem overflow ${width}`);
    if (ctx.hero.imagemMenor === null) {
      check(await page.locator('.hero-main img').evaluate(image => {
        const { width, height } = image.getBoundingClientRect();
        return width > 0 && Math.abs(width - height) <= 1;
      }), `Composição inteira em ${width}px`);
    }
    check(await page.locator('.product-grid, .company-grid').evaluateAll(grids => grids.every(grid => getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length === (innerWidth >= 1024 ? 4 : 2))), `${ctx.pagina.id}: quatro colunas no desktop e duas no celular ${width}`);
    check(await page.locator('.product-card').evaluateAll(cards => cards.every(card => [...card.querySelectorAll('h4, .product-price, .fee-note, .product-order, .product-open, .product-details summary')].every(el => el.scrollWidth <= el.clientWidth + 1))), `${ctx.pagina.id}: preço/taxa/ação sem corte ${width}`);
    check(await page.locator('.product-card').evaluateAll(cards => cards.every(card => {
      const title = card.querySelector('.product-title'), price = card.querySelector('.product-price strong');
      const ts = getComputedStyle(title), ps = getComputedStyle(price);
      const photoBox = card.querySelector('.product-media').getBoundingClientRect(), titleBox = title.getBoundingClientRect();
      const priceBox = price.getBoundingClientRect(), buttonBox = card.querySelector('.product-order').getBoundingClientRect();
      return photoBox.bottom <= titleBox.top + 1 && titleBox.bottom <= priceBox.top + 1 && priceBox.bottom <= buttonBox.top + 1 && Math.abs(titleBox.height - 2 * parseFloat(ts.lineHeight)) <= 1 && parseFloat(ts.fontSize) > parseFloat(ps.fontSize);
    })), `${ctx.pagina.id}: foto, título, valor e botão; duas linhas fixas e título maior que preço ${width}`);
    check(await page.locator('.product-card .product-price').evaluateAll(prices => prices.every(row => {
      const value = row.querySelector('strong').getBoundingClientRect();
      const prefix = row.querySelector('small');
      const label = prefix.getBoundingClientRect();
      return Math.abs(value.right - row.getBoundingClientRect().right) <= 1
        && (prefix.hidden || (label.bottom <= value.top && Math.abs(label.right - value.right) <= 1));
    })), `${ctx.pagina.id}: rótulo e preço em linhas distintas, alinhados à direita ${width}`);
    check(await page.locator('.product-grid, .company-grid').evaluateAll(grids => grids.every(grid => {
      const rows = new Map();
      for (const card of grid.querySelectorAll('.product-card')) {
        const row = Math.round(card.getBoundingClientRect().top);
        const position = [card.querySelector('.product-price').getBoundingClientRect().top, card.querySelector('.product-order').getBoundingClientRect().top];
        if (rows.has(row) && position.some((value, index) => Math.abs(value - rows.get(row)[index]) > 1)) return false;
        rows.set(row, position);
      }
      return true;
    })), `${ctx.pagina.id}: preços e botões alinhados em cada linha ${width}`);
    check(await page.locator('.related-card').evaluateAll(cards => cards.every(el => el.scrollWidth <= el.clientWidth + 1 && el.querySelector('h3').scrollWidth <= el.querySelector('h3').clientWidth + 1)), `${ctx.pagina.id}: recomendação sem corte ${width}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-menu-toggle]').click();
  check(await page.locator('#navbarContent').isVisible(), 'Menu mobile');
  await page.locator('[data-natal-dropdown]').click();
  check(await page.locator('#product-links').isVisible(), 'Submenu de produtos');
  await page.keyboard.press('Escape');
  check(await page.locator('[data-menu-toggle]').getAttribute('aria-expanded') === 'true', 'Primeiro Escape fecha submenu');
  await page.keyboard.press('Escape');
  check(await page.locator('[data-menu-toggle]').getAttribute('aria-expanded') === 'false', 'Segundo Escape fecha menu');
  check(await page.locator('[data-menu-toggle]').evaluate(el => el === document.activeElement), 'Foco do menu restaurado');
  await page.setViewportSize({ width: 320, height: 568 });
  for (const { produto: p, variante: v } of main) {
    const card = page.locator(`[data-product="${p.id}"][data-variant-id="${v.id}"]`);
    check(await card.locator('h4').textContent() === p.nome, `${p.id}: nome completo`);
    const href = new URL(await card.locator('.product-order').getAttribute('href'));
    const amounts = [...new Set(p.variantes.filter(option => option.precoStatus !== 'sob-consulta' && Number.isFinite(option.preco)).map(option => option.preco))];
    const varies = amounts.length > 1;
    const amount = varies || p.fotoGeral && amounts.length ? Math.min(...amounts) : v.preco;
    const label = await card.locator('.product-price small').textContent();
    check(amount == null ? !label : /a partir de$/i.test(label), `${p.id}: preço com a partir de; consulta sem rótulo`);
    check(await card.locator('.product-price strong').textContent() === (amount == null ? 'Sob consulta' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)), `${p.id}: valor correto na vitrine`);
    const orderLabel = ctx.pagina.id === 'corporativo' ? 'Orçar' : 'Pedir';
    check((await card.locator('.product-order').textContent()).trim() === orderLabel && await card.locator('.product-order .fa-whatsapp').count() === 1, 'Pedido curto com ícone no card');
    check(href.origin === 'https://wa.me' && href.pathname === `/${site.whatsappNumero}` && href.searchParams.get('text').includes(varies || p.fotoGeral ? p.nome : v.referencia), 'Destino e referência WhatsApp');
    check(await card.locator('.product-order').getAttribute('target') === '_blank' && (await card.locator('.product-order').getAttribute('rel')).includes('noopener'), 'Contato em nova aba protegida');
    check(await card.locator('.product-media > .product-open[aria-haspopup="dialog"]').count() === 1 && await card.locator('.product-open').textContent() === '', 'Só a foto tem ação de abrir detalhes, sem texto extra');
    check(await card.locator('.product-open').evaluate(button => {
      const hit = button.getBoundingClientRect(), photo = button.parentElement.querySelector('.photo-frame').getBoundingClientRect();
      return ['left', 'top', 'right', 'bottom'].every(edge => Math.abs(hit[edge] - photo[edge]) <= 1);
    }), 'Área de clique coincide com a foto inteira');
    await card.locator('.product-open').click();
    const modalOrder = page.locator('#dialog-order');
    const modalPricePrefix = page.locator('#dialog-price .product-price small');
    const modalHasPrice = p.fotoGeral ? amount != null : v.precoStatus !== 'sob-consulta' && Number.isFinite(v.preco);
    check(modalHasPrice ? /a partir de$/i.test(await modalPricePrefix.textContent()) : await modalPricePrefix.isHidden(), 'Detalhes usam a partir de quando há preço');
    const minimum = p.minimo?.estado === 'confirmado' ? p.minimo.mensagem : '';
    const minimumNote = page.locator('#dialog-minimum');
    check(await minimumNote.textContent() === minimum && await minimumNote.isVisible() === Boolean(minimum), `${p.id}: mínimo confirmado em destaque no modal`);
    if (minimum) {
      const cardNote = card.locator('.product-pricing .fee-note').filter({ hasText: minimum });
      check(await cardNote.isVisible() && await cardNote.textContent() === minimum, 'Mínimo junto ao preço no card');
    }
    check((await modalOrder.textContent()).trim() === (ctx.pagina.id === 'corporativo' ? 'Pedir orçamento' : 'Pedir pelo WhatsApp'), 'Ação completa nos detalhes');
    check(await page.locator('#product-dialog').evaluate(dialog => {
      const close = dialog.querySelector('[data-close-dialog]');
      const button = close.getBoundingClientRect();
      const bounds = dialog.getBoundingClientRect();
      const style = getComputedStyle(close);
      const luminance = rgb => rgb.match(/\d+/g).slice(0, 3).map(Number)
        .map(v => (v /= 255) <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
        .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      const contrast = (luminance(style.color) + .05) / (luminance(style.backgroundColor) + .05);
      return !dialog.textContent.includes('Detalhes do presente')
        && dialog.scrollHeight <= dialog.clientHeight + 1
        && Math.abs(button.right - bounds.right + 9) <= 1
        && Math.abs(button.top - bounds.top - 9) <= 1
        && contrast >= 4.5;
    }), `${p.id}: modal 320 × 568 sem rolagem, com botão no canto`);
    if (p.fotoGeral) {
      check(await page.locator('#variant-select').inputValue() === '' && await modalOrder.getAttribute('aria-disabled') === 'true', 'A foto geral abre sem modelo escolhido');
      check(await activePhoto.getAttribute('src') === p.fotoGeral.imagem && await modalOrder.getAttribute('href') === null, 'Foto geral sem pedido de versão');
    } else {
      check(await page.locator('#variant-select').inputValue() === v.id && await modalOrder.getAttribute('data-order-reference') === (p.sabores?.find(s => !s.varianteId || s.varianteId === v.id)?.referencia || v.referencia), 'Modal abre versão correta');
      check(await modalOrder.getAttribute('data-variant-id') === v.id, 'Contexto da versão no modal');
    }
    await page.keyboard.press('Escape');
    check(await card.locator('.product-open').evaluate(el => el === document.activeElement), 'Foco do modal restaurado');
    for (const option of p.variantes) {
      const anchors = [ancoraVersao(p, option), ...(option.ancorasLegadas || [])];
      for (const anchor of anchors) check(await card.evaluate((el, id) => el.contains(document.getElementById(id)), anchor), 'Âncora preservada no card do produto');
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  check(await page.locator('.product-card .product-details:visible').count() === 0, 'Menu Detalhes não aparece fora da janela');
  check(await page.locator('.product-open').evaluateAll(buttons => buttons.every(button => getComputedStyle(button).cursor === 'pointer')), 'Cursor pointer nas fotos');
  const first = main[0];
  const card = page.locator(`[data-product="${first.produto.id}"][data-variant-id="${first.variante.id}"]`);
  await card.locator('h4').click();
  await card.locator('.product-price').click();
  check(!await page.locator('#product-dialog').isVisible(), 'Título e preço não abrem o modal');
  await page.context().route('https://wa.me/**', route => route.fulfill({ contentType: 'text/html', body: '<title>WhatsApp simulado no QA</title>' }));
  const popupReady = page.waitForEvent('popup');
  await card.locator('.product-order').click();
  const popup = await popupReady;
  await popup.waitForLoadState('domcontentloaded');
  check(popup.url() === await card.locator('.product-order').getAttribute('href'), 'Clique nativo abre URL exata em aba simulada');
  await popup.close();
  await card.locator('.product-open').click();
  await page.locator('#dialog-details summary').click();
  check(await page.locator('#dialog-details-body').isVisible(), 'Detalhes nativos dentro da janela da foto');
  await page.keyboard.press('Escape');
  await card.locator('.product-open').focus(); await page.keyboard.press('Enter');
  check(await page.locator('#product-dialog').isVisible(), 'Modal por teclado');
  check(!await page.locator('#dialog-details').evaluate(el => el.open), 'Menu volta recolhido ao reabrir a janela');
  await page.keyboard.press('Escape');
  await page.locator('#product-search').fill('zzzzzz');
  check(await page.locator('#empty-state').isVisible(), 'Busca vazia');
  await page.locator('#clear-filters').click();
  check(await page.locator('[data-product]:visible').count() === main.length, 'Limpar restaura seleção principal');
  for (const category of [...new Set(products.flatMap(p => p.familias))]) {
    await page.locator(`[data-category="${category}"]`).click();
    check(await page.locator('[data-product]:visible').count() === products.filter(p => p.familias.includes(category)).length, 'Filtro deriva somente dos principais');
  }
  await page.locator('[data-category="todos"]').click();
  if (ctx.pagina.id === 'colecao') {
    await page.locator('#product-search').fill('pao mel pequeno');
    check(await page.locator('[data-product]:visible').count() === 1 && await page.locator('[data-product="pao-mel-saquinho"]').isVisible(), 'Busca sem acento por versão');
    await page.locator('#product-search').fill('');
    const mugs = products.find(p => p.id === 'caneca-biscoitos');
    const mugButton = page.locator('[data-open-product="caneca-biscoitos"]');
    const variantSelect = page.locator('#variant-select');
    const mugOrder = page.locator('#dialog-order');
    const mugPhoto = activePhoto;
    const photoViewport = page.locator('#dialog-photo');
    const nextPhoto = page.locator('.gallery-next');
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await mugButton.click();
      check(await variantSelect.locator('option:checked').textContent() === 'Selecione...', 'Foto geral tem opção neutra visível');
      const photoBox = await photoViewport.boundingBox();
      const nextBox = await nextPhoto.boundingBox();
      const orderBox = await mugOrder.boundingBox();
      const { x, y, width: buttonWidth, height: buttonHeight } = nextBox;
      const clickNext = () => page.mouse.click(x + buttonWidth / 2, y + buttonHeight / 2);
      for (const v of mugs.variantes) {
        await clickNext();
        check(await variantSelect.inputValue() === v.id && await mugPhoto.getAttribute('src') === v.imagem, 'Cada foto seleciona seu próprio modelo');
        check(await mugOrder.getAttribute('data-variant-id') === v.id, 'Pedido segue o modelo escolhido');
        check([photoBox, nextBox, orderBox].every(Boolean)
          && JSON.stringify(await photoViewport.boundingBox()) === JSON.stringify(photoBox)
          && JSON.stringify(await nextPhoto.boundingBox()) === JSON.stringify(nextBox)
          && JSON.stringify(await mugOrder.boundingBox()) === JSON.stringify(orderBox), `Foto e botões mantêm posição a ${width}px`);
      }
      await clickNext();
      check(await variantSelect.inputValue() === '' && await mugPhoto.getAttribute('src') === mugs.fotoGeral.imagem
        && await mugOrder.getAttribute('href') === null, 'Voltar à foto geral limpa modelo e pedido');
      await photoViewport.locator('.photo-frame:only-child').waitFor();
      await variantSelect.selectOption(mugs.variantes[2].id);
      check(await mugPhoto.getAttribute('src') === mugs.variantes[2].imagem, 'Seletor abre a foto do modelo');
      await page.keyboard.press('Escape');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-open-product="chocotone-trufado"]').click();
    await page.locator('#flavor-select').selectOption('leite-em-po');
    const milkFlavor = products.find(p => p.id === 'chocotone-trufado').sabores.find(s => s.id === 'leite-em-po');
    check(await activePhoto.getAttribute('src') === milkFlavor.imagem, 'Recheio usa a foto cadastrada, inclusive embalagem fechada compartilhada');
    check(new URL(await page.locator('#dialog-order').getAttribute('href')).searchParams.get('text').includes(milkFlavor.referencia), 'Recheio no pedido');
    await page.locator('#flavor-select').selectOption('mousse-limao');
    check(await page.locator('#dialog-order').getAttribute('data-flavor-id') === 'mousse-limao', 'Seletor muda recheio por ID');
    await page.keyboard.press('Escape');
    const colors = await page.locator('.catalog-group').evaluateAll(groups => groups.map(g => getComputedStyle(g).backgroundColor));
    check(new Set(colors).size === 2 && colors.every((c, i) => c === colors[i % 2]), 'Duas cores alternadas');
    await page.locator('.hero-main img').dispatchEvent('error');
    check(await page.locator('.hero-main .photo-fallback').isVisible(), `Falha da foto mantém texto e espaço: ${await page.locator('.hero-main').innerHTML()}`);
  }
  for (const p of products.filter(p => p.sabores?.length && p.variantes.some(v => v.id === 'cobertura') && p.variantes.some(v => v.id === 'recheado'))) {
    const [plain, filled] = p.variantes;
    await page.locator(`[data-product="${p.id}"][data-variant-id="${plain.id}"] .product-open`).click();
    const firstFlavor = p.sabores.find(s => s.varianteId === plain.id && s.saborId === 'leite-em-po');
    await page.locator('#flavor-select').selectOption(firstFlavor.id);
    await page.locator('#variant-select').selectOption(filled.id);
    const filledFlavor = p.sabores.find(s => s.varianteId === filled.id && s.saborId === 'leite-em-po');
    check(await page.locator('#flavor-select').inputValue() === filledFlavor.id, 'Trocar para recheado preserva sabor');
    check((await page.locator('#dialog-price').textContent()).includes(filled.preco.toFixed(2).replace('.', ',')), 'Recheado mostra preço maior da versão');
    check(await activePhoto.getAttribute('src') === filledFlavor.imagem, 'Recheado mostra foto da combinação');
    check(new URL(await page.locator('#dialog-order').getAttribute('href')).searchParams.get('text').includes(filledFlavor.referencia), 'WhatsApp leva versão recheada e sabor');
    check(await page.locator('#flavor-select option').count() === 3, 'Seletores mostram só sabores da versão');
    await page.locator('#variant-select').selectOption(plain.id);
    check(await page.locator('#flavor-select').inputValue() === firstFlavor.id && await activePhoto.getAttribute('src') === firstFlavor.imagem, 'Voltar para só cobertura preserva sabor e corrige foto');
    check(new URL(await page.locator('#dialog-order').getAttribute('href')).searchParams.get('text').includes(firstFlavor.referencia), 'WhatsApp volta para versão sem recheio');
    await page.keyboard.press('Escape');
  }
  for (const p of products.filter(p => p.id.startsWith('caneca-'))) {
    await page.locator(`[data-product="${p.id}"][data-variant-id="${p.variantes[0].id}"] .product-open`).click();
    for (const v of p.variantes) {
      await page.locator('#variant-select').selectOption(v.id);
      const fillings = (p.sabores || []).filter(s => !s.varianteId || s.varianteId === v.id);
      for (const visual of fillings.length ? fillings : [v]) {
        if (fillings.length) await page.locator('#flavor-select').selectOption(visual.id);
        check(await activePhoto.getAttribute('src') === visual.imagem, `${p.id}/${v.id}: foto corresponde à caneca e ao recheio`);
        check(await activePhoto.evaluate(async image => { await image.decode(); return image.naturalWidth === 800 && image.naturalHeight === 800; }), 'Foto da combinação carrega');
        const price = v.precoStatus === 'sob-consulta' || v.preco == null ? 'Sob consulta' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v.preco);
        check(await page.locator('#dialog-price strong').textContent() === price, `${p.id}/${v.id}: preço próprio do modelo`);
        check(new URL(await page.locator('#dialog-order').getAttribute('href')).searchParams.get('text').includes(visual.referencia), 'WhatsApp mantém modelo e recheio da combinação');
      }
    }
    await page.keyboard.press('Escape');
  }
  check(await page.locator('.thumb-option, .variant-thumbnails, #dialog-variant-photos').count() === 0, 'Sem miniaturas no catálogo');
  check(!/imagem (meramente )?ilustrativa/i.test(await page.locator('main').innerText()), 'Sem legenda de imagem ilustrativa');
  const galleryItem = main.find(({ produto, variante }) => !produto.sabores?.length && variante.galeria?.length);
  if (galleryItem) {
    const { produto, variante } = galleryItem;
    const trigger = page.locator(`[data-product="${produto.id}"] .product-open`);
    await trigger.click();
    const orderBefore = await page.locator('#dialog-order').getAttribute('href');
    const variantBefore = await page.locator('#variant-select').inputValue();
    const priceBefore = await page.locator('#dialog-price').textContent();
    const dots = page.locator('#gallery-dots button');
    const photo = activePhoto;
    const length = await dots.count();
    await dots.nth(1).click();
    check(await photo.getAttribute('src') === variante.galeria[0].imagem, 'Ponto abre foto adicional local');
    check(await photo.evaluate(async image => { await image.decode(); return image.naturalWidth === 800 && image.naturalHeight === 800; }), 'Foto adicional carrega em 800 × 800');
    check(await dots.nth(1).getAttribute('aria-pressed') === 'true' && await page.locator('.gallery-status').textContent() === `Foto 2 de ${length}`, 'Galeria informa foto ativa');
    check(await page.locator('#dialog-order').getAttribute('href') === orderBefore && await page.locator('#variant-select').inputValue() === variantBefore && await page.locator('#dialog-price').textContent() === priceBefore, 'Outra foto da mesma versão preserva preço e pedido');
    check(await page.locator('#dialog-photo .photo-label').count() === 0, 'Sem rótulo de imagem ilustrativa no modal');
    await page.keyboard.press('ArrowLeft');
    check(await dots.first().getAttribute('aria-pressed') === 'true', 'Teclado volta à foto anterior');
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      check(await page.locator('#product-dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1), `Galeria sem overflow ${width}`);
    }
    await page.keyboard.press('Escape'); await trigger.click();
    check(await dots.first().getAttribute('aria-pressed') === 'true', 'Reabrir retorna à primeira foto');
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 390, height: 844 });
  }
  const pricedGallery = products.find(p => !p.fotoGeral && !p.sabores?.length && p.variantes.length > 1 && p.variantes[0].preco !== p.variantes[1].preco);
  if (pricedGallery) {
    const [first, second] = pricedGallery.variantes;
    await page.locator(`[data-product="${pricedGallery.id}"] .product-open`).click();
    for (let step = 0; step <= new Set((first.galeria || []).map(photo => photo.imagem).filter(imagem => imagem !== first.imagem)).size; step++) await page.locator('.gallery-next').click();
    check(await page.locator('#variant-select').inputValue() === second.id, 'Avançar fotos seleciona a próxima versão');
    check(await page.locator('#dialog-price strong').textContent() === new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(second.preco), 'Foto da versão mostra o preço próprio');
    check(await page.locator('#dialog-order').getAttribute('data-order-reference') === second.referencia, 'Foto da versão também troca o pedido');
    await page.locator('#variant-select').selectOption(first.id);
    check(await activePhoto.getAttribute('src') === first.imagem, 'Select volta à foto da sua versão');
    await page.keyboard.press('Escape');
  }
  if (ctx.pagina.id === 'biscoitos') check(await page.locator('[data-group-role="principal"] [data-product]').count() === products.length, 'Principal separada de relacionados');
  if (['colecao', 'corporativo'].includes(ctx.pagina.id)) {
    const business = page.locator('[data-group="empresas"] [data-product]');
    const ids = await business.evaluateAll(cards => cards.map(card => card.dataset.product));
    check(['logo-carimbada', 'logo-decorada', 'logo-impressa', 'cupcakes-logo-chantilly-quatro'].every(id => ids.includes(id)), 'Cupcake e três cards de biscoito com logo ficam juntos');
    check(await page.locator('#grupo-cupcakes').count() === 1, 'Âncora anterior do grupo de cupcakes preservada');
  }
  if (ctx.pagina.id === 'corporativo') {
    const text = await card.innerText();
    check(!text.includes('Quantidade mínima sob consulta.') && !text.includes('Prazo de produção sob consulta.') && !text.includes('Logo carimbada em relevo'), 'Card corporativo mostra só o essencial');
    await card.locator('.product-open').click();
    await page.locator('#dialog-details summary').click();
    const businessDetails = await page.locator('#dialog-details-body').innerText();
    check(businessDetails.includes('Pedido mínimo de 10 unidades.') && businessDetails.includes('Prazo de produção sob consulta.') && businessDetails.includes('Logo carimbada em relevo') && businessDetails.includes('cortador e carimbo'), 'Detalhes informam técnica, mínimo de 10, prazo e composição da taxa');
    await page.keyboard.press('Escape');
    const artFee = card.locator('.product-pricing .fee-note').filter({ hasText: '35,00' });
    const unitPrice = await card.locator('.product-price strong').textContent();
    check(await artFee.isVisible() && unitPrice === 'R$\u00a02,90', 'Taxa separada do valor unitário de R$ 2,90');
    check(new URL(await card.locator('.product-order').getAttribute('href')).searchParams.get('text').includes('quantidade desejada, data'), 'Orçamento com quantidade e data');
    const cupcake = page.locator('[data-product="cupcakes-logo-chantilly-quatro"]');
    const content = await cupcake.innerText();
    await cupcake.locator('.product-open').click();
    const cupcakeOption = page.locator('#variant-select option');
    check(await cupcakeOption.count() === 1 && await cupcakeOption.getAttribute('value') === 'caixa-1' && !await page.locator('#variant-field').isVisible(), 'Cupcake avulso tem uma única opção');
    await page.locator('#dialog-details summary').click();
    const details = await page.locator('#dialog-details-body').innerText();
    const order = new URL(await page.locator('#dialog-order').getAttribute('href'));
    check(content.includes('12,00') && content.includes('Caixa a partir de') && !content.includes('por cupcake') && !content.includes('35,00'), 'Cupcake: preço da caixa individual em duas linhas');
    check(details.includes('Quantidade: 1;') && details.includes('topo de papel') && details.includes('Manter na geladeira.') && details.includes('3 dias; após o preparo'), 'Cupcake mantém conteúdo, cobertura e conservação');
    check(order.searchParams.get('text').includes('Caixa com 1 cupcake'), 'Pedido corresponde ao cupcake avulso');
    check(await activePhoto.evaluate(async image => { await image.decode(); return image.naturalWidth === 800; }), 'Foto do cupcake avulso carrega');
    await page.keyboard.press('Escape');
    const tube = page.locator('[data-product="biscoitos-logo-mini-tubo-kraft"]');
    await tube.locator('.product-open').click();
    const tubePrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(27);
    check(await page.locator('#variant-select').inputValue() === 'biscoitos-natalinos' && await page.locator('#dialog-price strong').textContent() === tubePrice, 'Tubolata abre com os biscoitos redondos e o preço de R$ 27');
    check(await activePhoto.evaluate(async image => { await image.decode(); return image.naturalWidth === 800; }), 'Imagem da tubolata carrega');
    await page.locator('#variant-select').selectOption('tubo');
    await page.locator('#dialog-details summary').click();
    const tubeDetails = await page.locator('#dialog-details-body').innerText();
    check(tubeDetails.includes('papel arroz') && tubeDetails.includes('clientes') && tubeDetails.includes('Quantidade: 4;') && !tubeDetails.includes('35,00'), 'A outra versão mostra quatro biscoitos com logo em papel de arroz');
    check(await page.locator('#dialog-price strong').textContent() === tubePrice, 'Versão de quatro biscoitos também custa R$ 27');
    await page.keyboard.press('Escape');

  }
  await page.evaluate(() => {
    window.qaEvents = []; window.gtag = (...args) => window.qaEvents.push(args);
    document.addEventListener('click', event => { if (event.target.closest('a[href*="wa.me"]')) event.preventDefault(); });
  });
  const events = () => page.evaluate(() => window.qaEvents.filter(e => e[0] === 'event' && e[1] === 'whatsapp_click'));
  await card.locator('.product-order').click();
  check((await events()).length === 0, 'Recusa: zero evento');
  await page.locator('[data-privacy-settings]').click(); await page.locator('[data-privacy-accept]').click();
  await card.locator('.product-order').click();
  let captured = await events();
  check(captured.length === 1, 'Aceite: um evento por clique');
  const payload = captured[0][2];
  const cardPrices = new Set(first.produto.variantes
    .filter(option => option.precoStatus !== 'sob-consulta' && Number.isFinite(option.preco))
    .map(option => option.preco));
  const cardVariant = cardPrices.size > 1 || first.produto.fotoGeral ? undefined : first.variante.id;
  check(payload.page === ctx.pagina.rota && payload.catalog_page === ctx.pagina.id && payload.product_id === first.produto.id && payload.variant_id === cardVariant, 'Evento do card usa IDs públicos e inclui versão apenas quando escolhida');
  check(Object.keys(payload).every(k => ['page', 'catalog_page', 'product_id', 'variant_id', 'flavor_id', 'placement', 'campaign_year'].includes(k)), 'Sem mensagem ou dados de cliente');
  await card.locator('.product-open').click(); await page.locator('#dialog-order').click();
  captured = await events();
  check(captured.length === 2 && captured[1][2].placement === 'modal' && captured[1][2].variant_id === first.variante.id, 'Modal sem duplicação');
  await page.keyboard.press('Escape');
  if (ctx.pagina.id === 'colecao') {
    await page.locator('[data-open-product="chocotone-trufado"]').click();
    await page.locator('#flavor-select').selectOption('leite-em-po'); await page.locator('#dialog-order').click();
    captured = await events();
    check(captured.at(-1)[2].flavor_id === 'leite-em-po' && captured.at(-1)[2].product_id === 'chocotone-trufado', 'Recheio atualiza evento');
    await page.keyboard.press('Escape');
  }
  await page.locator('[data-privacy-settings]').click(); await page.locator('[data-privacy-reject]').click();
  const before = (await events()).length;
  await card.locator('.product-order').click();
  check((await events()).length === before, 'Revogação interrompe eventos');
  check(errors.length === 0, `${ctx.pagina.id}: sem erro JavaScript`);
  check(await page.locator('.selection-links a').count() === (ctx.pagina.linksIds || []).length, 'Links cruzados só quando escolhidos');
  if (ctx.itensRelacionados.length) {
    check(await page.locator('main').evaluate(el => el.lastElementChild.classList.contains('related-section')), 'Ver também é a última seção');
    check(await page.locator('.related-card').first().evaluate(el => el.querySelector('img').getBoundingClientRect().width <= 96), 'Card relacionado usa foto menor');
    const mainPhoto = await card.locator('.product-media img').boundingBox();
    const relatedPhoto = await page.locator('.related-card img').first().boundingBox();
    check(relatedPhoto.width < mainPhoto.width && relatedPhoto.height < mainPhoto.height, 'Recomendação é menor que o card principal');
  }
  console.log(`${ctx.pagina.rota}: DOMContentLoaded local ${await page.evaluate(() => Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd))} ms; ${main.length} cards principais + ${relatedCount} relacionados; fontes externas bloqueadas no QA.`);
  if (ctx.itensRelacionados.length) {
    const link = page.locator('.related-card').first();
    const expected = new URL(await link.getAttribute('href'), url);
    await link.focus(); await page.keyboard.press('Enter');
    await page.waitForURL(expected.href);
    check(await page.locator(`[id="${expected.hash.slice(1)}"][data-product]`).count() === 1, 'Recomendação abre o card completo por teclado');
  }
  if (ctx.pagina.id === 'colecao') {
    const enlarged = products.find(p => p.id === 'pao-mel-saquinho-grande').variantes[0];
    const anchored = page.locator('[data-product="pao-mel-saquinho-grande"]');
    await page.goto(url + '#produto-pao-mel-saquinho-grande', { waitUntil: 'domcontentloaded' });
    check(await anchored.locator('#produto-pao-mel-saquinho-grande').count() === 1, 'Âncora antiga aponta para o card grande');
    check(await anchored.locator('.product-media img').getAttribute('src') === enlarged.imagem, 'Link direto mantém a foto da versão');
    const expectedPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(enlarged.preco);
    check(await anchored.locator('.product-price strong').textContent() === expectedPrice, 'Link direto mantém o preço da versão');
    check(new URL(await anchored.locator('.product-order').getAttribute('href')).searchParams.get('text').includes(enlarged.referencia), 'Link direto mantém o pedido da versão');
    await anchored.locator('.product-open').click();
    check(await page.locator('#variant-select').inputValue() === enlarged.id, 'O modal abre na versão do link direto');
    await page.keyboard.press('Escape');
  }
  await page.close();
  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const fallback = await noJs.newPage(); await fallback.goto(url);
  check(await fallback.locator('[data-product]:visible').count() === main.length, 'Seleção principal completa sem scripts');
  check(await fallback.locator('.product-order:visible').count() === main.length, 'Pedidos nativos sem scripts');
  check(await fallback.locator('.product-media .photo-frame:visible').count() === main.length && await fallback.locator('.product-open:visible').count() === 0, 'Fotos visíveis sem controles inativos quando não há JavaScript');
  check(await fallback.locator('[data-related-product]:visible').count() === relatedCount, 'Recomendações visíveis sem scripts');
  check(!await fallback.locator('.catalog-tools').isVisible() && await fallback.locator('#product-links a').first().isVisible(), 'Navegação sem scripts, controles locais ocultos');
  for (const link of await fallback.locator('.selection-links a').all()) check((await fallback.request.get(new URL(await link.getAttribute('href'), url).href)).status() === 200, 'Links HTML resolvem');
  await fallback.locator('.product-details summary').first().click();
  check(await fallback.locator('.details-body').first().isVisible(), 'Detalhes sem scripts');
  check(await fallback.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Sem scripts: sem overflow 390px');
  if (ctx.itensRelacionados.length) {
    const link = fallback.locator('.related-card').first();
    const expected = new URL(await link.getAttribute('href'), url);
    await link.click();
    check(fallback.url() === expected.href && await fallback.locator(`[id="${expected.hash.slice(1)}"][data-product]`).count() === 1, 'Recomendação navega sem JavaScript');
  }
  await noJs.close();
}
async function estados(browser) {
  const f = fixtureAprovada();
  const origin = await servir(executarGerador(f.catalogo, f.site));
  const page = await browser.newPage(); await page.goto(origin);
  check(await page.locator('#mainNav a[href="/natal/"]').count() === 1, 'Natal público na home');
  await page.locator('#mainNav a[href="/natal/"]').click(); check(page.url() === `${origin}/natal/`, 'Coleção em um link');
  await page.locator('.selection-links a[href="/natal/biscoitos/"]').click(); check(page.url() === `${origin}/natal/biscoitos/`, 'Biscoitos em dois links');
  check((await page.request.get(`${origin}/natal/pao-de-mel/`)).status() === 404, 'Desabilitada: HTTP 404 real');
  const closed = fixtureAprovada('encerrada');
  const closedOrigin = await servir(executarGerador(closed.catalogo, closed.site));
  for (const ctx of criarRegistro(closed.catalogo, closed.site)) {
    await page.goto(`${closedOrigin}${ctx.pagina.rota}`); await page.waitForSelector('body.js-ready');
    check(await page.locator('.agenda-note').isVisible() && await page.locator('[data-order-reference]').count() === 0, 'Encerrada: sem pedido de campanha');
    await page.locator('.product-open').first().click();
    check(await page.locator('#dialog-order').textContent() === 'Contato geral', 'Encerrada: contato geral no modal');
    check(!new URL(await page.locator('#dialog-order').getAttribute('href')).searchParams.get('text').includes('Natal'), 'Encerrada: mensagem geral');
    await page.keyboard.press('Escape');
  }
  await page.close();
}
async function chamadas(browser) {
  const output = executarGerador(undefined, undefined, { preview: true });
  const origin = await servir(output);
  const end = Date.parse(data.divulgacao.fimExclusivo);
  const readNavigation = nav => ({
    items: [...nav.querySelectorAll('.navbar-nav > li')].map(item => item.querySelector(':scope > a, :scope > button').textContent.replace(/\s+/g, ' ').trim()),
    products: [...nav.querySelectorAll('.dropdown-item')].map(link => ({ label: link.textContent.trim(), href: link.getAttribute('href') }))
  });
  for (const route of ['/', '/404.html']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.context().addInitScript(({ now }) => {
      const NativeDate = Date;
      window.qaNow = now;
      window.Date = class extends NativeDate {
        constructor(...args) { super(...(args.length ? args : [window.qaNow])); }
        static now() { return window.qaNow; }
      };
    }, { now: end - 5000 });
    await page.goto(`${origin}${route}`, { waitUntil: 'domcontentloaded' });
    if (await page.locator('[data-privacy-reject]').isVisible()) await page.locator('[data-privacy-reject]').click();
    const promotion = page.locator(route === '/' ? '#natal-em-destaque' : '.not-found-natal');
    const link = promotion.locator('a[href="/natal/"]');
    check(await promotion.isVisible() && await link.isVisible(), `${route}: chamada sazonal visível até 31/12`);
    check(await page.locator('meta[name="robots"]').getAttribute('content') === 'noindex, nofollow', 'Home/404 locais continuam noindex');
    if (route === '/') {
      check(!/pr[eé]via/iu.test(await page.locator('#natal-em-destaque').innerText()), 'Chamada da home sem rótulo de prévia');
      const commonNavigation = await page.locator('#mainNav').evaluate(readNavigation);
      check(commonNavigation.items.includes('Natal'), 'Prévia tem o item Natal também fora da coleção');
      for (const ctx of registro) {
        await page.goto(`${origin}${ctx.pagina.rota}`, { waitUntil: 'domcontentloaded' });
        const navigation = await page.locator('#mainNav').evaluate(readNavigation);
        check(JSON.stringify(navigation) === JSON.stringify(commonNavigation), `${ctx.pagina.id}: mesmos itens, ordem e submenu da navbar principal`);
        check(await page.locator('.preview-note').count() === 0 && !/pr[eé]via/iu.test(await page.locator('body').innerText()), `${ctx.pagina.id}: faixa de prévia removida`);
      }
      await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
      check(await promotion.evaluate(el => el.previousElementSibling.id === 'hero'), 'Chamada fica logo após a abertura da home');
      await page.mouse.move(0, 0);
      const colors = await page.locator('.natal-callout-card').evaluate(el => ({ light: getComputedStyle(el).backgroundColor, red: getComputedStyle(el.querySelector('.natal-callout-button')).backgroundColor, text: getComputedStyle(el).color, buttonText: getComputedStyle(el.querySelector('.natal-callout-button')).color }));
      check(colors.light === 'rgb(255, 251, 245)' && colors.red === 'rgb(112, 42, 53)', 'Destaques em creme com ação em vermelho escuro');
      const luminance = rgb => rgb.match(/\d+/g).slice(0, 3).map(Number).map(v => (v /= 255) <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
      check(contrast(colors.light, colors.text) >= 4.5 && contrast(colors.red, colors.buttonText) >= 4.5, 'Texto e ação preservam contraste legível');
      const highlights = page.locator('[data-feature-product]');
      check(await page.locator('#natal-callout-title').textContent() === 'Um doce presente', 'Título da coleção na home');
      check(await highlights.count() === data.divulgacao.destaques.length, 'Destaques usam a curadoria de dados');
      for (const ref of data.divulgacao.destaques) {
        const feature = page.locator(`[data-feature-product="${ref.produtoId}"][data-feature-variant="${ref.varianteId}"]`);
        const product = registro.find(ctx => ctx.pagina.id === 'colecao').produtosPrincipais.find(p => p.id === ref.produtoId);
        const variant = product.variantes.find(v => v.id === ref.varianteId);
        check(await feature.locator('h3').textContent() === ref.titulo, 'Destaque usa título curto');
        check(await feature.locator('img').getAttribute('src') === (ref.imagem || variant.imagem), 'Destaque usa a foto escolhida no cadastro');
        const target = await feature.getAttribute('href');
        await page.goto(`${origin}${target}`);
        check(await page.locator(`[id="${target.split('#')[1]}"]`).count() === 1, 'Destaque chega ao produto exato');
        await page.goto(`${origin}/`);
      }
      const logo = page.locator('.hero-natal-logo');
      await logo.evaluate(el => el.decode());
      check(await logo.isVisible() && await logo.evaluate(el => el.naturalWidth === Number(el.getAttribute('width')) && el.naturalHeight === Number(el.getAttribute('height'))), 'PNG com gorro carrega nas dimensões aparadas');
      check(!await page.locator('.hero-default-logo').isVisible(), 'Só um logo visível no hero sazonal');
      for (const width of [320, 390, 768, 991, 992, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Home com destaques sem overflow a ${width}`);
        check(await highlights.locator('img').evaluateAll(images => images.every(image => {
          const frame = image.parentElement.getBoundingClientRect();
          const box = image.getBoundingClientRect();
          return getComputedStyle(image).objectFit === 'contain'
            && ['left', 'right', 'top', 'bottom'].every(edge => Math.abs(frame[edge] - box[edge]) <= 1);
        })), `Fotos dos destaques usam toda a área sem corte a ${width}`);
        const visual = await logo.evaluate(el => {
          const image = getComputedStyle(el), wrapper = getComputedStyle(el.closest('.hero-visual-wrapper'));
          const hero = el.closest('#hero').getBoundingClientRect(), bounds = el.getBoundingClientRect();
          const clip = el.closest('.hero-visual-wrapper').getBoundingClientRect();
          return { filter: image.filter, position: wrapper.position, opacity: Number(wrapper.opacity), events: wrapper.pointerEvents, logoLeft: bounds.left - hero.left, logoWidth: bounds.width, rightGap: hero.right - bounds.right, topGap: bounds.top - hero.top, heightGap: hero.height - bounds.height, clipStart: clip.left - hero.left, heroWidth: hero.width, clipOverflow: wrapper.overflowX };
        });
        if (width < 992) {
          check(/blur\((\d+(?:\.\d+)?)px\)/.test(visual.filter) && Number(visual.filter.match(/blur\(([^p]+)px/)[1]) >= 10 && visual.position === 'absolute' && visual.opacity <= .2 && visual.events === 'none', `Logo no fundo bem embaçado a ${width}`);
          const expectedLeft = Math.max(visual.heroWidth / 2, visual.heroWidth - visual.logoWidth);
          check(Math.abs(visual.logoLeft - expectedLeft) <= 1 && visual.rightGap <= 1 && Math.abs(visual.topGap) <= 1 && Math.abs(visual.heightGap) <= 1, `Borda esquerda do logo não passa do meio; corte só à direita a ${width}: ${JSON.stringify(visual)}`);
          check(visual.clipStart >= visual.heroWidth / 2 - 1 && visual.clipOverflow === 'hidden', `Logo limitado à metade direita a ${width}`);
        } else check(!visual.filter.includes('blur') && visual.opacity === 1 && visual.position !== 'absolute', `Logo nítido ao lado no desktop a ${width}`);
        check(await page.locator('.hero-cta-stack a').evaluateAll(links => links.every(link => {
          const b = link.getBoundingClientRect();
          const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
          return hit?.closest('a') === link;
        })), `Logo não cobre nem intercepta os botões a ${width}`);
      }
    } else check(await promotion.evaluate(el => el.previousElementSibling.matches('a[href="/"]')), '404: Natal logo abaixo do link de início');
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route}: sem overflow a ${width}`);
      check(await link.evaluate(el => el.scrollWidth <= el.clientWidth + 1), `${route}: ação sem corte a ${width}`);
      check(await promotion.evaluate(el => [...el.querySelectorAll('h2, p, a')].every(node => node.scrollWidth <= node.clientWidth + 1)), `${route}: textos cabem a ${width}`);
    }
    await page.evaluate(now => { window.qaNow = now; document.dispatchEvent(new Event('visibilitychange')); }, end);
    check(!await promotion.isVisible(), `${route}: some em 01/01, inclusive em aba aberta`);
    if (route === '/') {
      check(!await page.locator('.hero-natal-logo').isVisible() && await page.locator('.hero-default-logo').isVisible(), 'Ano novo restaura logo original em aba aberta');
      check(!await page.locator('.hero-natal-eyebrow').isVisible(), 'Ano novo remove chamada natalina do hero');
      check(await page.locator('.hero-title').evaluate(el => getComputedStyle(el).color === 'rgb(56, 34, 27)'), 'Ano novo restaura cor original do hero');
    }
    await page.evaluate(now => { window.qaNow = now; document.dispatchEvent(new Event('visibilitychange')); }, end - 1);
    await link.focus(); await page.keyboard.press('Enter');
    await page.waitForURL(`${origin}/natal/`);
    check(await page.locator('h1').count() === 1, `${route}: ação por teclado abre a coleção`);
    check(errors.length === 0, `${route}: sem erros JavaScript na divulgação`);
    await page.close();
  }
  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await noJs.newPage();
  for (const route of ['/', '/404.html']) {
    await page.goto(`${origin}${route}`);
    check(await page.locator('[data-natal-promotion] a[href="/natal/"]').isVisible(), 'Divulgação ativa também é link HTML sem JavaScript');
    if (route === '/') {
      const feature = page.locator('[data-feature-product]').first();
      const target = await feature.getAttribute('href');
      await feature.click();
      check(page.url() === `${origin}${target}`, 'Produto em destaque funciona sem JavaScript');
      check(await page.locator(`[id="${target.split('#')[1]}"]`).count() === 1, 'Âncora do destaque existe sem JavaScript');
    }
  }
  await noJs.close();
}
(async () => {
  let browser;
  try {
    const origin = process.env.NATAL_URL ? new URL(process.env.NATAL_URL).origin : await servir();
    browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
    const qa = {
      async newContext(options) { const context = await browser.newContext(options); await context.route('https://**', route => route.abort()); return context; },
      async newPage(options) { const context = await this.newContext(options); return context.newPage(); }
    };
    if (!process.argv.includes('--chamadas')) {
      for (const ctx of registro) await pagina(qa, ctx, origin);
      await estados(qa);
    }
    await chamadas(qa);
    console.log(`${checks} verificações DOM/fluxos aprovadas: ${process.argv.includes('--chamadas') ? 'home, 404 e divulgação sazonal' : `${registro.length} rotas, pedidos, relacionados, consentimento, encerramento e divulgação sazonal`}; teclado, responsividade e sem scripts.`);
  } finally {
    await browser?.close(); await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
