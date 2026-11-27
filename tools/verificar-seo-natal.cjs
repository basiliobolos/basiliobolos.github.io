'use strict';
// Fixtures sintéticas em memória. Nenhum cadastro/revisão real é alterado.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const lib = require('./natal-catalogo.cjs');
const ROOT = path.resolve(__dirname, '..');
const load = file => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', file), 'utf8'));
const clone = value => structuredClone(value);
function executarGerador(catalogo = load('natal.json'), site = load('site.json'), options = {}) {
  const output = new Map();
  const generator = path.join(__dirname, 'gerar.js');
  const realRequire = createRequire(generator);
  const virtualFs = { ...fs, rmSync() {}, mkdirSync() {}, cpSync() {}, copyFileSync() {},
    readFileSync(file, ...args) {
      if (path.resolve(file) === path.join(ROOT, 'data/natal.json')) return JSON.stringify(catalogo);
      if (path.resolve(file) === path.join(ROOT, 'data/site.json')) return JSON.stringify(site);
      return fs.readFileSync(file, ...args);
    },
    writeFileSync(file, content) { output.set(path.relative(path.join(ROOT, 'dist'), file), content); }
  };
  vm.runInNewContext(fs.readFileSync(generator, 'utf8'), { URL, process: { env: { NATAL_PREVIEW: options.preview ? '1' : '' } }, require: name => name === 'fs' ? virtualFs : name === './natal-catalogo.cjs' ? { ...lib, criarRegistro: (c, s) => lib.criarRegistro(c, s, options) } : realRequire(name), __dirname, console: { log() {} } }, { filename: generator });
  return output;
}
function aprovarFixture(catalogo, site, options = {}) {
  // Revisões rotuladas como fixture, jamais gravadas na fonte ou oferecidas como aprovação.
  const contexts = lib.criarRegistro(catalogo, site, { ...options, validarPublicacao: false });
  const ano = catalogo.ano;
  const rev = hash => ({ ano, responsavel: 'FIXTURE DE TESTE', revisadoEm: `${ano}-01-01`, assinatura: hash });
  site.revisao = rev(contexts[0].assinaturas.negocio);
  for (const ctx of contexts) {
    for (const [id, hash] of Object.entries(ctx.assinaturas.produtos)) catalogo.produtos.find(p => p.id === id).revisao = rev(hash);
    ctx.pagina.revisao = rev(ctx.assinaturas.pagina);
    if (ctx.pagina.tipo !== 'colecao') ctx.pagina.revisaoEditorial = { ...rev(ctx.assinaturas.pagina), aprovada: true, diferencaUtil: `Escolha própria da fixture ${ctx.pagina.id}` };
  }
  return { catalogo, site };
}
function fixtureAprovada(estado = 'aberta') {
  const catalogo = load('natal.json'); const site = load('site.json');
  const image = '/assets/images/brand/logo.jpeg'; // Teste de encanamento, não aprovação de foto comercial.
  catalogo.ano = Number(new Intl.DateTimeFormat('en', { timeZone: 'America/Sao_Paulo', year: 'numeric' }).format(new Date()));
  catalogo.publicado = true;
  catalogo.agenda = { estado, mensagem: estado === 'encerrada' ? 'Pedidos desta coleção encerrados.' : 'Agenda aberta somente nesta fixture.' };
  Object.assign(catalogo.hero, { imagem: image, imagemMenor: image, alt: 'Foto da fixture', altMenor: 'Foto menor da fixture', imagemProvisoria: false, imagemMenorProvisoria: false });
  for (const p of catalogo.produtos) {
    if (p.fotoGeral) Object.assign(p.fotoGeral, { imagem: image, alt: 'Foto dos modelos da fixture', imagemProvisoria: false });
    for (const v of p.variantes) Object.assign(v, { preco: v.preco ?? 1, precoStatus: 'confirmado', imagem: image, imagemProvisoria: false, galeria: [] });
    for (const s of p.sabores || []) Object.assign(s, { imagem: image, imagemProvisoria: false, galeria: [] });
    for (const c of p.componentes || []) if (c.quantidade == null) c.quantidade = 1;
  }
  for (const p of catalogo.paginas.filter(p => p.habilitada)) {
    Object.assign(p.hero ||= {}, {
      imagem: image, imagemMenor: p.hero.imagemMenor === null ? null : image,
      alt: 'Hero da fixture', altMenor: 'Detalhe da fixture',
      imagemProvisoria: false, imagemMenorProvisoria: false
    });
    p.publicada = true;
    delete p.updatedAt; // Esta fixture testa uma página sem data editorial.
    p.grupos = p.grupos.filter(g => !g.selecao.incluirRascunhos); // Fixture pública só seleciona itens prontos.
    p.seo.imagemSocial = image; p.seo.imagemSocialAlt = 'Imagem social da fixture';
  }
  return aprovarFixture(catalogo, site);
}
function jsonLd(html) { return [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m => JSON.parse(m[1])); }
function dataHtml(html) { return JSON.parse(html.match(/<script id="natal-data" type="application\/json">(.*?)<\/script>/s)[1]); }
function testar() {
  let checks = 0;
  const check = (condition, message) => { assert.ok(condition, message); checks++; };
  const rejects = (fn, expected) => { assert.throws(fn, expected); checks++; };
  const vigente = load('natal.json'); const site = load('site.json');
  const registro = lib.criarRegistro(vigente, site);
  const publicado = executarGerador(vigente, site);
  for (const ctx of registro.filter(c => c.publico)) {
    const html = publicado.get(`${ctx.pagina.rota.slice(1)}index.html`);
    check(html.includes('content="index, follow"') && html.includes(ctx.pagina.seo.imagemSocial), 'HTML público indexável com imagem aprovada');
    check(publicado.get('sitemap.xml').includes(`<loc>${site.url}${ctx.pagina.rota}</loc>`), 'Página pública está no sitemap real');
    check(ctx.itens.every(({ variante }) => variante.imagemProvisoria !== true), 'Versões públicas com imagens definitivas');
    check(html.includes(vigente.agenda.mensagem), 'Agenda visível no HTML público');
    check(publicado.get('llms.txt').includes(vigente.agenda.mensagem), 'Resumo traz a agenda publicada no catálogo');
  }
  const real = clone(vigente);
  real.publicado = false; // As simulações abaixo começam com a campanha fora do ar.
  const originalSource = fs.readFileSync(path.join(ROOT, 'data/natal.json'));
  const draftsPath = path.join(ROOT, 'data/natal-rascunhos.json');
  const lerRascunhos = () => fs.existsSync(draftsPath) ? fs.readFileSync(draftsPath, 'utf8') : null;
  const draftsSource = lerRascunhos();
  const previews = lib.criarRegistro(real, site);
  check(!real.produtos.some(p => p.id === 'globo-biscoito') && ['mini-chocotone', 'caneca-mini-chocotone'].every(id => real.produtos.find(p => p.id === id).variantes.every(v => v.nome !== 'Só cobertura')), 'Itens retirados não permanecem no catálogo');
  check(real.produtos.find(p => p.id === 'mini-chocotone-corporativo').variantes.some(v => v.nome === 'Só cobertura'), 'Mini corporativo mantém só cobertura');
  const previewOutput = executarGerador(real, site);
  const enabledHeroes = previews.map(ctx => ctx.hero);
  const imagensMenores = enabledHeroes.map(h => h.imagemMenor).filter(image => image !== null);
  check(new Set(enabledHeroes.map(h => h.imagem)).size === previews.length && new Set(imagensMenores).size === previews.length - 1, 'Cada rota tem imagens próprias');
  for (const { pagina, hero } of previews) {
    const html = previewOutput.get(`${pagina.rota.slice(1)}index.html`);
    const detalheCorreto = pagina.id === 'colecao'
      ? hero.imagemMenor === null && html.includes('class="hero-art hero-art--single"') && !html.includes('class="hero-small"')
      : html.includes('class="hero-small"') && html.includes(`src="${hero.imagemMenor}"`);
    check(html.includes(`src="${hero.imagem}"`) && html.includes(hero.alt) && detalheCorreto, `Hero específico renderizado em ${pagina.id}`);
  }
  const fallbackHero = clone(real); delete fallbackHero.paginas[1].hero;
  check(lib.criarRegistro(fallbackHero, site)[1].hero.imagem === fallbackHero.hero.imagem, 'Página sem hero próprio herda o comum');
  check(!previewOutput.get('sitemap.xml').includes('/natal/') && !previewOutput.get('llms.txt').includes('/natal/'), 'Prévia fora de descoberta');
  check(!previewOutput.get('index.html').includes('href="/natal/"'), 'Home pública não divulga prévia');
  check(!previewOutput.get('404.html').includes('class="not-found-natal"'), '404 do build normal não divulga catálogo em prévia');
  const local = executarGerador(real, site, { preview: true });
  for (const file of ['index.html', '404.html']) {
    check(local.get(file).includes('data-natal-promotion') && local.get(file).includes('content="noindex, nofollow"'), `${file}: divulgação local com noindex, sem aprovar publicação`);
  }
  for (const ctx of previews) {
    const html = previewOutput.get(`${ctx.pagina.rota.slice(1)}index.html`);
    check(html.includes('noindex, nofollow'), `${ctx.pagina.id}: prévia noindex`);
    check(!html.includes('"offers"'), `${ctx.pagina.id}: sem ofertas provisórias`);
    check(!html.includes('"revisao"') && !html.includes('"pendencias"'), 'Campos privados fora do JSON público');
    const dto = dataHtml(html);
    check(dto.produtos.reduce((n, p) => n + p.variantes.length, 0) === ctx.itens.length, 'JSON e cards derivam da mesma seleção');
  }
  const quotes = draftsSource ? JSON.parse(draftsSource) : { produtos: [] };
  const quoteById = id => quotes.produtos.find(p => p.id === id) || real.produtos.find(p => p.id === id);
  const expectedQuotes = [
    ['biscoitos-logo-mini-tubo-kraft', 27, 'tubo', 'nao-refrigerar', 10, 'confirmado', 'tubo'],
    ['cupcakes-logo-chantilly-quatro', 12, 'caixa', 'refrigerado', 3, 'confirmado']
  ];
  for (const [id, price, unit, storage, days, status = 'informado', variantId] of expectedQuotes) {
    const p = quoteById(id);
    const option = p?.variantes.find(v => (!variantId || v.id === variantId) && v.preco === price && v.unidade === unit && v.precoStatus === status);
    check(option, `${id}: preço por embalagem preservado`);
    check((option.conservacao || p.conservacao).refrigeracao === storage && (option.validade || p.validade).dias === days && p.taxaArte === undefined, `${id}: condições próprias, sem taxa herdada`);
  }
  for (const p of [...expectedQuotes.map(([id]) => quoteById(id)), ...quotes.produtos]) {
    const { id } = p;
    const selected = previews.some(ctx => ctx.produtos.some(p => p.id === id));
    check(selected ? previewOutput.get('natal/corporativo/index.html').includes(id) : [...previewOutput.values()].every(html => !html.includes(id)), `${id}: somente seleção explícita mostra rascunho na prévia`);
    const source = clone(real); source.produtos = source.produtos.filter(p => p.id !== id);
    for (const page of source.paginas) page.grupos = page.grupos.filter(g => !(g.selecao.ids || []).includes(id));
    const inputs = { ...quotes, produtos: [...quotes.produtos.filter(p => p.id !== id), p] };
    const moved = lib.promoverRascunho(source, inputs, id);
    const promoted = moved.catalogo.produtos.find(p => p.id === id);
    check(promoted.statusCatalogo === 'rascunho' && promoted.revisao === undefined && !moved.rascunhos.produtos.some(p => p.id === id), `${id}: promoção mantém identidade sem duplicação/aprovação`);
    const expected = { ...p, statusCatalogo: 'rascunho' };
    delete expected.revisao;
    assert.deepEqual(promoted, expected, `${id}: promoção preserva preço, composição e condições`);
    checks++;
    check(!lib.criarRegistro(moved.catalogo, site).some(c => c.produtos.some(p => p.id === id)), `${id}: promover não publica`);
  }
  check(!quoteById('cupcakes-logo-chantilly-quatro').cobertura.segueRecheio, 'Cobertura de chantilly independe do recheio');
  check(quoteById('cupcakes-logo-chantilly-quatro').cobertura.tipo === 'Chantilly' && quoteById('cupcakes-logo-chantilly-quatro').cobertura.logo.includes('papel'), 'Chantilly e topo de papel preservados');
  const cupcake = quoteById('cupcakes-logo-chantilly-quatro');
  const [avulso] = cupcake.variantes;
  check(cupcake.variantes.length === 1 && avulso.id === 'caixa-1' && avulso.conteudoEmbalagem.quantidade === 1, 'Cupcake em caixa individual');
  const tube = quoteById('biscoitos-logo-mini-tubo-kraft');
  check(real.produtos.filter(p => p.id === tube.id).length === 1 && !quotes.produtos.some(p => p.id === tube.id), 'Tubolata movido com fonte única');
  const [decoratedTube, paperRice] = tube.variantes;
  check(decoratedTube.preco === 27 && decoratedTube.precoStatus === 'confirmado' && decoratedTube.personalizacao.tecnica.includes('rótulo'), 'Tubolata natalina em primeiro lugar, com personalização do rótulo e preço confirmado');
  check(paperRice.tamanhoBiscoitosInformado === '5 x 5 cm', 'Medidas informadas nas opções com biscoitos em papel de arroz');
  check(paperRice.conteudoEmbalagem.quantidade === 4 && paperRice.personalizacao.tecnica.includes('papel arroz') && paperRice.personalizacao.condicoes.includes('clientes'), 'Versão de quatro biscoitos aceita logo da empresa ou clientes em papel de arroz');
  for (const id of ['colecao', 'corporativo']) check(previews.find(ctx => ctx.pagina.id === id).produtos.some(p => p.id === tube.id), 'Tubolata presente na coleção e no corporativo');
  const corporatePreview = previewOutput.get('natal/corporativo/index.html');
  check(/Caixa a partir de<\/small> <strong>R\$\s12,00/.test(corporatePreview) && !corporatePreview.includes('por cupcake'), 'Prévia exibe o preço da caixa individual sem repetir o valor por cupcake');
  const business = dataHtml(corporatePreview).produtos;
  const logos = ['logo-carimbada', 'logo-decorada', 'logo-impressa'].map(id => business.find(p => p.id === id));
  check(logos.every(p => p.minimo.estado === 'confirmado' && p.minimo.quantidade === 10), 'Pedido mínimo de 10 unidades para os biscoitos com logo');
  check(logos.map(p => p.variantes.length).join(',') === '1,1,3' && logos[0].variantes[0].opcoes.formato === 'Gorro carimbado', 'Logo carimbada oferece apenas o gorro');
  check(logos.slice(0, 2).every(p => p.variantes[0].alt.includes('Basilio Bolos')), 'Exemplos da Basilio Bolos abrem os cards carimbado e decorado');
  const invalid = clone(real); invalid.publicado = true; invalid.paginas[0].publicada = true;
  invalid.paginas[0].hero.imagemProvisoria = true;
  invalid.paginas[0].grupos = invalid.paginas[0].grupos.filter(g => !g.selecao.incluirRascunhos);
  rejects(() => executarGerador(invalid, site), /Publicação de Natal rejeitada[\s\S]*hero.imagem/);
  const approved = fixtureAprovada();
  const active = executarGerador(approved.catalogo, approved.site);
  const contexts = lib.criarRegistro(approved.catalogo, approved.site);
  check(lib.divulgacaoAtiva(approved.catalogo, contexts, { now: new Date('2027-01-01T02:59:59.999Z') }), 'Divulgação ativa até o último instante de 31/12 em São Paulo');
  check(!lib.divulgacaoAtiva(approved.catalogo, contexts, { now: new Date('2027-01-01T03:00:00.000Z') }), 'Divulgação encerra à meia-noite local de 01/01');
  check(!lib.divulgacaoAtiva(real, previews), 'Catálogo em rascunho não entra na divulgação pública');
  check(lib.divulgacaoAtiva(real, previews, { preview: true, now: new Date('2026-12-31T23:00:00-03:00') }), 'Prévia local permite conferir a divulgação sem mudar os gates');
  const disabledPromotion = clone(approved.catalogo); disabledPromotion.divulgacao.ativa = false;
  check(!lib.divulgacaoAtiva(disabledPromotion, contexts), 'Flag permite desligar divulgação antecipadamente');
  const closedPromotion = contexts.map(ctx => ({ ...ctx, encerrada: true }));
  check(!lib.divulgacaoAtiva(approved.catalogo, closedPromotion, { preview: true }), 'Agenda encerrada não recebe chamada de pedidos nem em prévia');
  check(active.get('index.html').includes('id="natal-em-destaque"') && active.get('404.html').includes('class="not-found-natal"'), 'Coleção pública ativa recebe divulgação na home e no 404');
  for (const ctx of contexts) {
    const html = active.get(`${ctx.pagina.rota.slice(1)}index.html`);
    check(html.includes('content="index, follow"') && !html.includes('preview-note'), `${ctx.pagina.id}: publicação revisada`);
    check(html.includes(`rel="canonical" href="${site.url}${ctx.pagina.rota}"`), 'Canonical próprio');
    const ld = jsonLd(html); const collection = ld.find(x => x['@type'] === 'CollectionPage');
    check(collection.mainEntity.numberOfItems === ctx.itens.length && collection.mainEntity.itemListElement.every((x, i) => x.position === i + 1), 'ItemList por seleção com posições consecutivas');
    check(ld.find(x => x['@type'] === 'BreadcrumbList').itemListElement.length === ctx.trail.length + 2, 'Trilha completa e sem URL duplicada');
    check(!html.includes('.br/https:') && !html.includes('placehold.co/800'), 'URLs válidas e fotos presentes');
    check(active.get('sitemap.xml').includes(`${site.url}${ctx.pagina.rota}</loc>`) && active.get('llms.txt').includes(`](${site.url}${ctx.pagina.rota})`), 'Registro público único no sitemap e resumo');
  }
  const cupcakeId = 'cupcakes-logo-chantilly-quatro';
  check(!quotes.produtos.some(p => p.id === cupcakeId) && real.produtos.filter(p => p.id === cupcakeId).length === 1, 'Cupcake tem fonte única após promoção');
  check(dataHtml(active.get('natal/corporativo/index.html')).produtos.some(p => p.id === cupcakeId), 'Cupcake aprovado disponível para empresas');
  const forced = clone(approved.catalogo);
  forced.paginas[0].grupos.push({ id: 'rascunho-forcado', titulo: 'Rascunho', funcao: 'principal', selecao: { modo: 'ids', ids: [cupcakeId], incluirRascunhos: true } });
  rejects(() => executarGerador(forced, approved.site), /rascunhos só podem ser incluídos explicitamente em prévia/);
  for (const ctx of previews) {
    const html = previewOutput.get(`${ctx.pagina.rota.slice(1)}index.html`);
    const cards = [...html.matchAll(/data-related-product="([^"]+)" data-related-variant="([^"]+)" href="([^"]+)"/g)];
    check(cards.length === new Set(ctx.itensRelacionados.map(({ produto }) => produto.id)).size, `${ctx.pagina.id}: recomendações selecionadas`);
    if (cards.length) check(html.indexOf('class="related-section"') > html.indexOf('id="retirada"'), 'Ver também ao final');
    for (const [, id, variant, href] of cards) {
      const url = new URL(href, site.url);
      const target = previewOutput.get(`${url.pathname.slice(1)}index.html`);
      check(target && target.includes(`id="${url.hash.slice(1)}"`) && target.includes(`data-product="${id}" data-variant-id="${variant}"`), 'Recomendação chega ao card completo certo');
    }
    const primaryIds = new Set(ctx.produtosPrincipais.map(p => p.id));
    check(ctx.itensRelacionados.every(item => !primaryIds.has(item.produto.id)), 'Relacionado não repete principal');
    const nav = html.match(/<nav class="selection-links"[^>]*>(.*?)<\/nav>/s)[1];
    check((nav.match(/<a /g) || []).length === (ctx.pagina.linksIds || []).length, 'Somente links escolhidos na navegação');
  }
  const badLinks = clone(real); badLinks.paginas[0].linksIds.push('pagina-ausente');
  rejects(() => executarGerador(badLinks, site), /linksIds/);
  const hubData = dataHtml(active.get('natal/index.html'));
  for (const ctx of contexts.slice(1)) for (const p of dataHtml(active.get(`${ctx.pagina.rota.slice(1)}index.html`)).produtos) {
    check(JSON.stringify(hubData.produtos.find(h => h.id === p.id)) === JSON.stringify(p), `${p.id}: mesmo cadastro entre seleções`);
  }
  check(executarGerador(approved.catalogo, approved.site).get('sitemap.xml') === active.get('sitemap.xml'), 'lastmod determinístico');
  check(!/<loc>[^<]*\/natal\/[^<]*<\/loc>\s*<lastmod>/.test(active.get('sitemap.xml')), 'Página natalina sem data editorial omite lastmod');
  for (const file of ['bolos/index.html', 'doces/index.html', 'biscoitos/index.html']) check(!active.get(file).includes('AggregateOffer'), 'Família não representa oferta única nem mistura unidades');
  const changedPrice = clone(approved.catalogo); changedPrice.produtos[0].variantes[0].preco += 1;
  rejects(() => executarGerador(changedPrice, approved.site), /produto.biscoito-saquinho.revisao/);
  const changedCommon = clone(approved.catalogo); changedCommon.seo.faqLocal.resposta = 'Texto comum alterado após revisão';
  rejects(() => executarGerador(changedCommon, approved.site), /pagina.colecao.revisao/);
  const changedBytes = file => String(file).endsWith('logo.jpeg') ? Buffer.from('bytes alterados em memória') : fs.readFileSync(file);
  rejects(() => executarGerador(approved.catalogo, approved.site, { readFile: changedBytes }), /revisao/);
  const badRevision = clone(approved.catalogo); badRevision.paginas[0].revisao.ano--;
  rejects(() => executarGerador(badRevision, approved.site), /pagina.colecao.revisao/);
  const future = clone(approved.catalogo); future.paginas[0].revisao.revisadoEm = `${future.ano + 1}-01-01`;
  rejects(() => executarGerador(future, approved.site), /pagina.colecao.revisao/);
  const noHero = clone(approved.catalogo); noHero.paginas[0].hero.imagem = null;
  rejects(() => executarGerador(noHero, approved.site), /hero.imagem/);
  const provisionalHero = clone(approved.catalogo); provisionalHero.paginas[0].hero.imagemProvisoria = true;
  rejects(() => executarGerador(provisionalHero, approved.site), /hero.imagem: imagem ilustrativa/);
  const invalidDetail = clone(approved.catalogo); invalidDetail.paginas[1].hero.imagemMenor = '';
  rejects(() => executarGerador(invalidDetail, approved.site), /pagina.biscoitos.hero.imagemMenor/);
  const changedHero = clone(approved.catalogo); changedHero.paginas[1].hero.alt = 'Outro hero após revisão';
  rejects(() => executarGerador(changedHero, approved.site), /pagina.biscoitos.revisao/);
  const unusedHero = clone(approved.catalogo); unusedHero.hero.imagem = null;
  check(executarGerador(unusedHero, approved.site).has('natal/index.html'), 'Hero próprio válido prevalece sobre o comum ausente');
  const closedFixture = fixtureAprovada('encerrada');
  const closed = executarGerador(closedFixture.catalogo, closedFixture.site);
  for (const ctx of lib.criarRegistro(closedFixture.catalogo, closedFixture.site)) {
    const html = closed.get(`${ctx.pagina.rota.slice(1)}index.html`);
    check(html.includes('Agenda de Natal encerrada.') && html.includes('Contato geral'), 'Encerramento útil');
    check(!html.includes('data-order-reference=') && !html.includes('"offers"') && Object.keys(dataHtml(html).pedidos).length === 0, 'Encerramento sem CTAs de campanha/Offer/pedidos');
  }
  const reordered = clone(real); reordered.produtos[0].variantes.reverse();
  const consultation = fixtureAprovada();
  Object.assign(consultation.catalogo.produtos[0].variantes[0], { preco: null, precoStatus: 'sob-consulta' });
  aprovarFixture(consultation.catalogo, consultation.site);
  const consultationHtml = executarGerador(consultation.catalogo, consultation.site).get('natal/index.html');
  check(consultationHtml.includes('Sob consulta') && !consultationHtml.includes('"offers"'), 'Consulta pública não vira oferta zero');
  const hours = fixtureAprovada();
  hours.site.horariosEspeciais = [
    { data: `${hours.catalogo.ano}-12-24`, fechado: false, abre: '09:00', fecha: '12:00', revisadoEm: `${hours.catalogo.ano}-01-01` },
    { data: `${hours.catalogo.ano}-12-25`, fechado: true, revisadoEm: `${hours.catalogo.ano}-01-01` }
  ];
  aprovarFixture(hours.catalogo, hours.site);
  const hoursHtml = executarGerador(hours.catalogo, hours.site).get('natal/index.html');
  const special = jsonLd(hoursHtml).find(x => x['@type'] === 'Bakery').specialOpeningHoursSpecification;
  check(hoursHtml.includes('09:00 às 12:00') && hoursHtml.includes('Fechado para retirada.'), 'Horários especiais no texto');
  check(special[0].opens === '09:00' && special[1].opens === undefined && special[1].closes === undefined, 'Dia fechado não ganha abre/fecha no schema');
  const reorderHtml = executarGerador(reordered, site).get('natal/index.html');
  for (const v of real.produtos[0].variantes) {
    const anchors = [lib.ancoraVersao(real.produtos[0], v), ...(v.ancorasLegadas || [])];
    check(anchors.every(id => reorderHtml.includes('id="' + id + '"')), 'Reordenar preserva âncoras antigas e novas');
  }
  const partial = clone(approved.catalogo);
  const draft = { id: 'rascunho-fixture', nome: 'Amostra', tipoProduto: 'cupcakes', statusCatalogo: 'rascunho',
    variantes: [{ id: 'amostra', referencia: 'Amostra não publicada' }] };
  partial.produtos.push(draft);
  partial.categorias.push({ id: 'categoria-rascunho', nome: 'Categoria ainda fora da seleção', icone: 'gift' });
  const partialOutput = executarGerador(partial, approved.site);
  check(![...partialOutput.values()].some(v => v.includes(draft.id)), 'Rascunho não selecionado não bloqueia nem vaza em público');
  check(!partialOutput.get('natal/index.html').includes('Categoria ainda fora da seleção'), 'Categoria de rascunho não selecionado não invalida nem vaza na página pronta');
  const explicit = clone(partial); explicit.paginas[0].grupos[0].selecao = { modo: 'ids', ids: [draft.id] };
  rejects(() => executarGerador(explicit, approved.site), /não está pronto/);
  const selectedBad = clone(approved.catalogo); selectedBad.produtos[0].variantes[0].imagem = null;
  rejects(() => executarGerador(selectedBad, approved.site), /biscoito-saquinho[\s\S]*imagem/);
  const synthetic = clone(approved.catalogo); synthetic.produtos[0].variantes[0].imagemProvisoria = true;
  rejects(() => executarGerador(synthetic, approved.site), /imagem ilustrativa não pode ser publicada/);
  const badGallery = clone(approved.catalogo);
  badGallery.produtos[0].variantes[0].galeria = [{ imagem: '/assets/images/ausente.webp', alt: 'Foto adicional' }];
  rejects(() => executarGerador(badGallery, approved.site), /galeria.*foto real e alt obrigatório/);
  const provisionalOverview = clone(approved.catalogo);
  provisionalOverview.produtos.find(p => p.fotoGeral).fotoGeral.imagemProvisoria = true;
  rejects(() => executarGerador(provisionalOverview, approved.site), /fotoGeral.*foto real e alt obrigatório/);
  const galleryPayload = { galeria: [{ imagem: '/assets/images/natal/exemplo-02.webp', alt: 'Outro ângulo' }] };
  check(lib.assinatura(galleryPayload, { readFile: () => Buffer.from('foto A') }) !== lib.assinatura(galleryPayload, { readFile: () => Buffer.from('foto B') }), 'Trocar bytes da galeria invalida revisão');
  const illustrated = dataHtml(previewOutput.get('natal/index.html')).produtos;
  check(illustrated.every(p => [...p.variantes, ...(p.sabores || [])].every(v =>
    v.imagem === null ? v.imagemProvisoria === true : v.imagem?.startsWith('/assets/images/natal/') && lib.fotoLocal(v.imagem)
  )), 'Prévia usa fotos locais ou sinaliza foto pendente');
  const basicFillings = ['Brigadeiro', 'Leite Ninho', 'Prestígio', 'Mousse de maracujá', 'Mousse de limão'];
  const allFillings = [...basicFillings, 'Leite Ninho com Nutella', 'Trufado', 'Paçoca', 'Kinder Bueno', 'Ferrero Rocher', 'Maracujá trufado'];
  assert.deepEqual(illustrated.find(p => p.id === 'chocotone-trufado').sabores.map(s => s.nome), allFillings);
  for (const pid of ['mini-chocotone', 'mini-chocotone-neve', 'caneca-mini-chocotone']) {
    const p = illustrated.find(p => p.id === pid);
    check(p.variantes.length === (pid === 'caneca-mini-chocotone' ? 3 : 1) && p.variantes.every(v => v.referencia.includes("com cobertura e recheio")), `${pid}: cobertura e recheio, com modelos e apresentações cadastrados`);
    for (const v of p.variantes) {
      const flavors = p.sabores.filter(s => s.varianteId === v.id);
      assert.deepEqual(flavors.map(s => s.nome), pid === 'mini-chocotone-neve' ? basicFillings : allFillings);
      check(flavors.every(s => s.saborId && previewOutput.get('natal/index.html').includes(s.referencia)), `${pid}: combinações explícitas por versão`);
    }
  }
  const badFlavor = clone(real); badFlavor.produtos.find(p => p.id === 'mini-chocotone').sabores[0].varianteId = 'ausente';
  for (const p of real.produtos.filter(p => p.id.startsWith('caneca-'))) {
    check(p.variantes.length === 3 && new Set(p.variantes.map(v => v.imagem)).size === 3, `${p.id}: três modelos com fotos próprias`);
  }
  const mugKits = real.produtos.filter(p => p.tipoProduto === 'kit' && p.id.startsWith('caneca-'));
  const mugOverview = illustrated.find(p => p.id === 'caneca-biscoitos').fotoGeral;
  check(lib.fotoLocal(mugOverview.imagem) && mugOverview.largura === 800 && mugOverview.altura === 800 && mugOverview.alt, 'Foto geral local com dimensões e descrição');
  check(mugOverview.imagemProvisoria === real.produtos.find(p => p.id === 'caneca-biscoitos').fotoGeral.imagemProvisoria, 'A prévia preserva a revisão da foto geral');
  const globeKits = mugKits.filter(p => p.id.startsWith('caneca-globo-'));
  check(globeKits.length === 2 && globeKits.every(p => p.variantes.every(v =>
    v.galeria?.length === 1 && v.galeria[0].imagem !== v.imagem
  )), 'Kits com globo mostram cada modelo dentro e fora da sacola');
  const mugKitPrices = mugKits.flatMap(p => p.variantes.map(v => v.preco));
  check(mugKits.length === 3 && mugKitPrices.length === 9 && mugKitPrices.every(price => Number.isFinite(price) && price > 0), 'As nove versões dos três kits com caneca têm preço');
  const pricedModels = clone(real);
  const pricedKit = pricedModels.produtos.find(p => p.id === 'caneca-globo-biscoitos');
  pricedKit.variantes.forEach((v, i) => Object.assign(v, { preco: [79, 59, 49][i], precoStatus: 'confirmado' }));
  const pricedOutput = executarGerador(pricedModels, site);
  check(dataHtml(pricedOutput.get('natal/kits/index.html')).produtos.find(p => p.id === pricedKit.id).variantes.map(v => v.preco).join(',') === '79,59,49', 'Preços distintos por caneca chegam à página sem somar componentes');
  rejects(() => lib.criarRegistro(badFlavor, site), /varianteId existente/);
  const ambiguousFlavor = clone(real); const ambiguous = ambiguousFlavor.produtos.find(p => p.id === 'mini-chocotone');
  ambiguous.variantes.push({ ...ambiguous.variantes[0], id: 'outra-versao', referencia: 'Outra versão de teste' });
  delete ambiguous.sabores[0].varianteId;
  rejects(() => lib.criarRegistro(ambiguousFlavor, site), /varianteId existente/);
  const emptyFlavor = clone(real); const flavored = emptyFlavor.produtos.find(p => p.id === 'mini-chocotone');
  flavored.variantes.push({ ...flavored.variantes[0], id: 'sem-sabores', referencia: 'Versão de teste sem sabores' });
  rejects(() => lib.criarRegistro(emptyFlavor, site), /sem sabores próprios/);
  const added = clone(real);
  const novel = clone(quoteById('cupcakes-logo-chantilly-quatro'));
  novel.variantes = [novel.variantes[0]];
  Object.assign(novel, { id: 'produto-novo-fixture', nome: 'Novo tipo da fixture', tipoProduto: 'tipo-novo', categoria: 'tipo-novo', statusCatalogo: 'pronto', familias: ['tipo-novo'] });
  novel.variantes[0].referencia = 'Produto novo de teste em caixa';
  const kit = { id: 'kit-fixture', nome: 'Kit da fixture', tipoProduto: 'kit', statusCatalogo: 'pronto', publicos: ['corporativo'], familias: ['kit'], detalhes: 'Composição de teste.', componentes: [{ produtoId: novel.id, varianteId: novel.variantes[0].id, quantidade: 2, unidade: 'caixa' }], conservacao: { texto: 'Sob consulta.' }, validade: { texto: 'Sob consulta.' }, variantes: [{ id: 'kit', nome: 'Kit', referencia: 'Kit com preço próprio de teste', preco: 17, precoStatus: 'informado', unidade: 'kit' }] };
  added.produtos.push(novel, kit);
  const addedRegistry = lib.criarRegistro(added, site);
  check(addedRegistry[0].itens.length === previews[0].itens.length + novel.variantes.length + kit.variantes.length, 'Novos produtos/tipos alteram contagem por dados');
  check(addedRegistry.find(c => c.pagina.id === 'corporativo').produtos.some(p => p.id === kit.id) && addedRegistry.find(c => c.pagina.id === 'corporativo').produtos.some(p => p.id === novel.id), 'Corporativo inclui tipo novo e kit por público');
  const addedHtml = executarGerador(added, site).get('natal/index.html');
  check(addedHtml.includes('Kit com preço próprio de teste') && dataHtml(addedHtml).produtos.find(p => p.id === kit.id).variantes[0].preco === 17, 'Kit tem preço próprio, não soma dos componentes');
  check(dataHtml(addedHtml).produtos.find(p => p.id === novel.id).variantes[0].cobertura.tipo === 'Chantilly', 'Regra própria é normalizada sem combinações inventadas');
  check(addedHtml.includes('Consumo sugerido') && addedHtml.includes('Chantilly') && addedHtml.includes('3 dias; após o preparo'), 'Condição de cupcake legível no HTML, sem prazo inferido');
  const openAdded = fixtureAprovada();
  for (const p of [clone(novel), clone(kit)]) {
    for (const v of p.variantes) { v.precoStatus = 'confirmado'; v.imagem = '/assets/images/brand/logo.jpeg'; v.alt = 'Imagem exclusiva da fixture de teste'; v.imagemProvisoria = false; v.galeria = []; }
    openAdded.catalogo.produtos.push(p);
  }
  aprovarFixture(openAdded.catalogo, openAdded.site);
  const openAddedOutput = executarGerador(openAdded.catalogo, openAdded.site);
  const openList = jsonLd(openAddedOutput.get('natal/index.html')).find(x => x['@type'] === 'CollectionPage').mainEntity;
  check(openList.numberOfItems === contexts[0].itens.length + novel.variantes.length + kit.variantes.length, 'Publicação de novo tipo/kit sem código por produto');
  check(openAddedOutput.get('llms.txt').includes('Kit com preço próprio de teste: R$ 17,00 por kit'), 'Resumo mantém preço próprio do kit');
  check(active.get('llms.txt').includes('Taxa adicional de R$ 35,00'), 'Resumo público preserva taxa por arte');
  const cycle = clone(added); cycle.produtos.at(-1).componentes[0].produtoId = kit.id; cycle.produtos.at(-1).componentes[0].varianteId = 'kit';
  rejects(() => executarGerador(cycle, site), /componentes.*ciclo/);
  const missing = clone(added); missing.produtos.at(-1).componentes[0].produtoId = 'inexistente';
  rejects(() => executarGerador(missing, site), /componentes.*inexistente/);
  const disabledOutput = executarGerador(real, site);
  check(real.paginas.filter(p => !p.habilitada).every(p => !disabledOutput.has(`${p.rota.slice(1)}index.html`)), 'Rotas sem gate editorial permanecem ausentes');
  const stopped = clone(approved.catalogo); stopped.produtos.find(p => p.id === 'globo-mini-biscoitos').statusCatalogo = 'pausado';
  rejects(() => executarGerador(stopped, approved.site), /componente.*não está pronto/);
  const duplicates = clone(real); duplicates.paginas[1].rota = duplicates.paginas[0].rota;
  rejects(() => executarGerador(duplicates, site), /rota.*repetido/);
  const badPath = clone(real); badPath.paginas[0].rota = '/natal/../escape/';
  rejects(() => executarGerador(badPath, site), /rota/);
  const missingId = clone(real); delete missingId.produtos[0].variantes[0].id;
  rejects(() => executarGerador(missingId, site), /ID deve ser slug/);
  check(lib.assinatura({ b: 2, a: 1 }) === lib.assinatura({ a: 1, b: 2 }), 'Assinatura independente da ordem de chaves');
  check(!lib.dataValida('2026-02-30') && !lib.dataValida('2099-01-01'), 'Datas inválidas/futuras rejeitadas');
  check(!lib.fotoLocal('/assets/images/../data/site.json') && !lib.fotoLocal('https://placehold.co/800'), 'Imagem pública exige caminho local seguro');
  const robots = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
  check(robots.includes('Disallow: /data/') && !robots.includes('Disallow: /natal'), 'Robôs podem ler noindex; dados internos bloqueados');
  check(originalSource.equals(fs.readFileSync(path.join(ROOT, 'data/natal.json'))) && draftsSource === lerRascunhos(), 'Fixtures não alteram dados reais');
  console.log(`${checks} verificações SEO/GEO aprovadas: estados, revisão, imagens, catálogo aberto, kits, orçamentos, identidade e descoberta.`);
}
if (require.main === module) { try { testar(); } catch (error) { console.error(error); process.exitCode = 1; } }
module.exports = { executarGerador, fixtureAprovada, aprovarFixture, jsonLd, dataHtml };
