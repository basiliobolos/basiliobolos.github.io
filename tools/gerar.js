/**
 * gerar.js - Gerador estático do site Basilio Bolos
 *
 * Uso:  node tools/gerar.js
 *
 * Lê os arquivos de data/*.json e gera o HTML final de todas as páginas
 * (com preços e textos embutidos, ideal para SEO e rastreadores de IA),
 * além de sitemap.xml e llms.txt.
 *
 * Não tem dependências externas: basta ter Node.js instalado.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// ---------- Carregamento dos dados ----------
const readJSON = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', file), 'utf8'));

const site = readJSON('site.json');
const produtosData = readJSON('produtos.json');
const produtos = produtosData.produtos;
const recomendacoes = produtosData.recomendacoes || {};
const produtoPorSlug = new Map(produtos.map((p) => [p.slug, p]));
const campanha = readJSON('campanhas.json');
const bolos = readJSON('bolos.json');
const bolosRetangulares = readJSON('bolos-retangulares.json');
const doces = readJSON('doces.json');
const paginasSimples = [
  readJSON('biscoitos.json'),
  readJSON('cupcakes.json'),
  readJSON('brownies.json'),
  readJSON('pipoca-gourmet.json'),
  readJSON('bolo-de-pote.json')
];

const hoje = new Date().toISOString().slice(0, 10);

// ---------- Helpers ----------
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

/** URL segura para atributos: aceita apenas http(s), com escape de atributo. */
const safeUrl = (u) => {
  const s = String(u == null ? '' : u).trim();
  return /^https?:\/\//i.test(s) ? esc(s) : '#';
};

/** Coordenadas do negócio (fonte única). */
const GEO = { lat: '-23.6621', lng: '-46.5308' };

const money = (n) => 'R$ ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const moneyCents = (n) => 'R$ ' + Number(n).toFixed(2).replace('.', ',');

/** Arredonda para o valor terminado em 9 mais próximo (ex.: 244,9 -> 249). */
const round9 = (v) => Math.max(9, Math.round((v + 1) / 10) * 10 - 1);

/** Menor preço de bolo por tamanho, calculado de precoKg x pesoKg. */
const minPorTamanho = {};
for (const t of bolos.tamanhos.filter((t) => t.pesoKg)) {
  minPorTamanho[t.id] = Math.min(...bolos.recheios.map((r) => round9(r.precoKg * t.pesoKg)));
}
const bentoPreco = (bolos.tamanhos.find((t) => t.id === 'bento') || {}).precoFixo || 39;

/** Junta lista em texto humano: "a, b, c e d". */
const joinHuman = (items) => items.length > 1
  ? items.slice(0, -1).join(', ') + ' e ' + items[items.length - 1]
  : (items[0] || '');

/** Resposta da FAQ de preços de bolo, sempre sincronizada com a tabela calculada. */
function faqPrecoBolos(comTabela) {
  const partes = bolos.tamanhos.filter((t) => t.pesoKg)
    .map((t) => `de ${t.diametro} (${t.nome}, ${t.fatias} fatias) a partir de ${money(minPorTamanho[t.id])}`);
  const base = `Na ${site.nome}, o bentô cake (10cm) sai a partir de ${money(bentoPreco)}, com página própria no site. Bolos redondos ${joinHuman(partes)}, conforme o recheio escolhido. Também temos bolos retangulares de 17x25cm (24 a 28 fatias) e 22x30cm (38 a 44 fatias), com página própria no site.`;
  return comTabela ? base + ' Veja a tabela completa na página de Bolos Redondos.' : base;
}

const waHref = (msg) => `https://wa.me/${site.whatsappNumero}?text=${encodeURIComponent(msg || site.mensagemPadrao)}`;

const waIcon = '<i class="fa-brands fa-whatsapp" aria-hidden="true"></i>';

/** Extrai o primeiro número de um texto de preço ("A partir de R$ 5" -> 5). */
const primeiroNumero = (texto) => {
  const m = String(texto).replace(/\./g, '').replace(',', '.').match(/(\d+(\.\d+)?)/);
  return m ? Number(m[1]) : null;
};

// ---------- SEO por página ----------
const SEO = {
  home: {
    title: 'Basilio Bolos | Confeitaria em Santo André SP - Bolos, Doces e Brownies',
    description: 'Confeitaria artesanal em Santo André/SP. Bentô cake a partir de R$ 39, bolos personalizados a partir de R$ 89, doces por cento, biscoitos decorados, cupcakes, brownies, pipoca gourmet e bolo de pote. Atendemos Santa Terezinha, Parque das Nações e região do ABC. Encomende pelo WhatsApp!',
    keywords: 'confeitaria santo andré, bolo personalizado santo andré, bolo aniversário santo andré, doces para festa santo andré, cento de doces, brownie santo andré, cupcake santo andré, biscoitos decorados, pipoca gourmet, bolo de pote, bentô cake santo andré, confeitaria santa terezinha, confeitaria parque das nações, doces abc'
  },
  bolos: {
    title: 'Bolos Redondos Personalizados em Santo André | Preços por Tamanho e Sabor | Basilio Bolos',
    description: 'Tabela de preços de bolos redondos em Santo André: bolos de 15cm a 30cm (10 a 48 fatias) a partir de R$ 89. 20 sabores de recheio, massa branca ou de chocolate, cobertura de chantilly ou ganache. Encomende pelo WhatsApp!',
    keywords: 'bolo personalizado santo andré, preço de bolo santo andré, bolo aniversário santo andré, bolo redondo, bolo 15cm, bolo 20cm, bolo 25cm, bolo 30cm, bolo trufado, bolo leite ninho com morango, bolo mousse de maracujá, quanto custa um bolo'
  },
  'bolos-retangulares': {
    title: 'Bolos Retangulares em Santo André | 17x25 e 22x30 | Basilio Bolos',
    description: 'Bolos retangulares em Santo André: 17x25cm (24 a 28 fatias) a partir de R$ 229 e 22x30cm (38 a 44 fatias) a partir de R$ 359. 20 sabores de recheio, massa branca ou de chocolate, cobertura de chantilly ou ganache. Encomende pelo WhatsApp!',
    keywords: 'bolo retangular santo andré, bolo retangular 17x25, bolo retangular 22x30, bolo de festa retangular, preço de bolo retangular, bolo aniversário santo andré, bolo para muitas pessoas'
  },
  'bento-cake': {
    title: 'Bentô Cake em Santo André | A partir de R$ 39 | Basilio Bolos',
    description: 'Bentô cake em Santo André a partir de R$ 39: o bolinho individual de 10cm, ideal para presentear. 20 sabores de recheio, decoração personalizada. Encomende pelo WhatsApp!',
    keywords: 'bentô cake santo andré, bento cake, bolinho individual, bolo de 10cm, presente bolo, bento cake personalizado abc'
  },
  doces: {
    title: 'Doces para Festa em Santo André | Cento a partir de R$ 190 | Basilio Bolos',
    description: 'Cento de doces em Santo André a partir de R$ 190: brigadeiro, beijinho, ninho, churros e mais. Doces premium por unidade a partir de R$ 3,20. Encomendas para festas e eventos no ABC pelo WhatsApp.',
    keywords: 'cento de doces santo andré, doces para festa santo andré, brigadeiro santo andré, doces finos, doces premium, docinhos de festa abc, quanto custa cento de doces'
  },
  biscoitos: {
    title: 'Biscoitos Decorados em Santo André | Unidade e Caixas | Basilio Bolos',
    description: 'Biscoitos amanteigados decorados à mão em Santo André, a partir de R$ 5 a unidade. Caixas fechadas com 6 ou 12 unidades e pacotinhos para lembrancinhas, com o tema da sua festa.',
    keywords: 'biscoitos decorados santo andré, biscoito personalizado, lembrancinhas santo andré, biscoito amanteigado decorado, caixa de biscoitos'
  },
  cupcakes: {
    title: 'Cupcakes Decorados em Santo André | Unidade e Caixa com 2 | Basilio Bolos',
    description: 'Cupcakes recheados e decorados em Santo André: unidade R$ 13 e caixa com 2 por R$ 24. Decoração personalizada com o tema da sua festa. Encomende pelo WhatsApp!',
    keywords: 'cupcake santo andré, cupcake decorado, cupcake personalizado, caixa de cupcake presente, cupcake temático abc'
  },
  brownies: {
    title: 'Brownies Artesanais em Santo André | Basilio Bolos',
    description: 'Brownie bem chocolatudo em Santo André: marmitinha a partir de R$ 12, versões com nozes e recheada, e caixa de bites por R$ 48. Encomende pelo WhatsApp!',
    keywords: 'brownie santo andré, brownie artesanal, marmitinha de brownie, caixa de brownie presente, bites de brownie'
  },
  'pipoca-gourmet': {
    title: 'Pipoca Gourmet em Santo André | Chocolate e Leite Ninho | Basilio Bolos',
    description: 'Pipoca gourmet fresca e crocante em Santo André, a partir de R$ 15 o pacote de 100g. Sabores chocolate e leite ninho, pacotes de até 500g e versões temáticas para presente.',
    keywords: 'pipoca gourmet santo andré, pipoca de chocolate, pipoca de leite ninho, pipoca para presente, lembrancinha pipoca'
  },
  'bolo-de-pote': {
    title: 'Bolo de Pote em Santo André | A partir de R$ 15 | Basilio Bolos',
    description: 'Bolo de pote em Santo André a partir de R$ 15 (250ml). Sabores brigadeiro, ninho com morango, prestígio, maracujá e trufado. O clássico que começou nossa história. Peça pelo WhatsApp!',
    keywords: 'bolo de pote santo andré, bolo no pote, sobremesa pote, bolo de pote brigadeiro, bolo de pote ninho com morango'
  }
};

// ---------- Componentes de layout ----------
function head({ seo, canonical, jsonLd, ogType = 'website', usaSwiper = false }) {
  const ogImage = `${site.url}/assets/images/hero/hero-placeholder.jpeg`;
  // </script> não é escapado por JSON.stringify; < vira < (válido em JSON, seguro em script)
  const safeLd = (obj) => JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');
  const ldScripts = (jsonLd || []).map((obj) => `  <script type="application/ld+json">\n${safeLd(obj).split('\n').map((l) => '  ' + l).join('\n')}\n  </script>`).join('\n');
  const swiperCss = usaSwiper ? '\n  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">' : '';
  return `<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(seo.title)}</title>
  <meta name="description" content="${esc(seo.description)}" />
  <meta name="keywords" content="${esc(seo.keywords)}" />
  <meta name="robots" content="index, follow" />
  <meta name="author" content="${esc(site.nome)}" />
  <meta name="geo.region" content="BR-SP" />
  <meta name="geo.placename" content="Santo André" />
  <meta name="geo.position" content="${GEO.lat};${GEO.lng}" />
  <meta name="ICBM" content="${GEO.lat}, ${GEO.lng}" />
  <link rel="canonical" href="${site.url}${canonical}" />
  <meta property="og:locale" content="pt_BR" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:title" content="${esc(seo.title)}" />
  <meta property="og:description" content="${esc(seo.description)}" />
  <meta property="og:url" content="${site.url}${canonical}" />
  <meta property="og:site_name" content="${esc(site.nome)}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:alt" content="Seleção de bolos e doces artesanais ${esc(site.nome)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(seo.title)}" />
  <meta name="twitter:description" content="${esc(seo.description)}" />
  <meta name="twitter:image" content="${ogImage}" />
  <meta name="twitter:site" content="@basiliobolos" />
  <link rel="icon" type="image/png" sizes="96x96" href="/favicon-v2-96x96.png">
  <link rel="icon" href="/favicon-v2.ico">
  <link rel="icon" type="image/svg+xml" href="/favicon-v2.svg">
  <link rel="manifest" href="/manifest.json" />
  <link rel="shortcut icon" href="/favicon-v2.ico" />
  <meta name="theme-color" content="#54382F" />
  <meta name="msapplication-TileColor" content="#54382F" />
  <meta name="msapplication-config" content="/browserconfig.xml" />

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://cdn.jsdelivr.net">
  <link rel="preconnect" href="https://cdnjs.cloudflare.com">

  <script async src="https://www.googletagmanager.com/gtag/js?id=G-C07W6E0102"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-C07W6E0102');
  </script>

  <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700;800&family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />${swiperCss}
  <link rel="stylesheet" href="/css/styles.css">
${ldScripts}
</head>`;
}

function navbar(active) {
  const item = (href, label, slug) => `
          <li class="nav-item">
            <a class="nav-link${active === slug ? ' active' : ''}" href="${href}"${active === slug ? ' aria-current="page"' : ''}>${label}</a>
          </li>`;
  const dropdownItems = produtos.map((p) => `
              <li><a class="dropdown-item${active === p.slug ? ' active' : ''}" href="/${esc(p.url)}">${esc(p.titulo)}</a></li>`).join('');
  return `
  <nav id="mainNav" class="navbar navbar-expand-lg navbar-light fixed-top navbar-glass" aria-label="Navegação principal">
    <div class="container">
      <a class="navbar-brand fw-bold d-flex align-items-center gap-2" href="/" style="color:#54382F;">
        <img src="/assets/images/brand/logo.jpeg" alt="Logo ${esc(site.nome)}" class="brand-icon" width="34" height="34" loading="eager">
        <span class="brand-text">${esc(site.nome)}</span>
      </a>
      <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarContent"
              aria-controls="navbarContent" aria-expanded="false" aria-label="Abrir menu">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarContent">
        <ul class="navbar-nav ms-auto mb-2 mb-lg-0 align-items-lg-center gap-lg-1">${item('/#hero', '<i class="fa-solid fa-home" aria-hidden="true"></i> Início', active === 'home' ? 'home' : null)}
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle${active && active !== 'home' ? ' active' : ''}" href="/#produtos" id="produtosDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
              <i class="fa-solid fa-cake-candles" aria-hidden="true"></i> Produtos
            </a>
            <ul class="dropdown-menu" aria-labelledby="produtosDropdown">${dropdownItems}
            </ul>
          </li>${item('/#sobre', '<i class="fa-solid fa-heart" aria-hidden="true"></i> Sobre')}${item('/#contato', '<i class="fa-solid fa-envelope" aria-hidden="true"></i> Contato')}
          <li class="nav-item ms-lg-2">
            <a class="btn btn-sm btn-whatsapp" href="${waHref()}" target="_blank" rel="noopener" data-track="nav">
              ${waIcon} Fazer Pedido
            </a>
          </li>
        </ul>
      </div>
    </div>
  </nav>`;
}

function footer() {
  return `
  <footer class="py-4 footer-gradient">
    <div class="container footer-bar d-flex justify-content-between align-items-center">
      <div class="footer-note">© <span id="anoAtual">2026</span> ${esc(site.nome)} · Confeitaria artesanal em Santo André/SP</div>
      <div class="d-flex gap-3 social-links">
        <a href="${safeUrl(site.social.instagram)}" class="social-link" aria-label="Instagram" target="_blank" rel="noopener"><i class="fa-brands fa-instagram"></i></a>
        <a href="${safeUrl(site.social.facebook)}" class="social-link" aria-label="Facebook" target="_blank" rel="noopener"><i class="fa-brands fa-facebook"></i></a>
        <a href="${safeUrl(site.social.tiktok)}" class="social-link" aria-label="TikTok" target="_blank" rel="noopener"><i class="fa-brands fa-tiktok"></i></a>
        <a href="${waHref()}" target="_blank" rel="noopener" aria-label="WhatsApp" class="social-link"><i class="fa-brands fa-whatsapp"></i></a>
        <a href="${safeUrl(site.endereco.mapsUrl)}" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="Ver endereço no Google Maps"><i class="fa-solid fa-location-dot"></i></a>
      </div>
    </div>
  </footer>`;
}

function waFloat() {
  return `
  <a href="${waHref()}" target="_blank" rel="noopener" class="whatsapp-float" aria-label="Fale conosco no WhatsApp" data-track="float">
    ${waIcon}
    <span class="pulse-ring"></span>
  </a>`;
}

const scripts = (usaSwiper = false) => `
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>${usaSwiper ? '\n  <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>' : ''}
  <script src="/js/app.js"></script>`;

function layout({ seo, canonical, active, jsonLd, body, usaSwiper = false }) {
  return `<!doctype html>
<html lang="pt-BR">
${head({ seo, canonical, jsonLd, ogType: active === 'home' ? 'website' : 'product', usaSwiper })}
<body>
  <a class="skip-link" href="#conteudoPrincipal">Pular para o conteúdo principal</a>
${navbar(active)}
  <main id="conteudoPrincipal" tabindex="-1">
${body}
  </main>
${footer()}
${waFloat()}
${scripts(usaSwiper)}
</body>
</html>
`;
}

// ---------- Blocos reutilizáveis ----------
function breadcrumb(items) {
  const lis = items.map((it, i) => it.url
    ? `<li class="breadcrumb-item"><a href="${it.url}">${esc(it.nome)}</a></li>`
    : `<li class="breadcrumb-item active" aria-current="page">${esc(it.nome)}</li>`).join('\n        ');
  return `
    <nav aria-label="Você está em" class="breadcrumb-nav">
      <ol class="breadcrumb">
        ${lis}
      </ol>
    </nav>`;
}

function pageHero(data, seo) {
  return `
    <header class="page-hero page-hero--with-image" style="--hero-image:url('/${esc(data.imagem)}')">
      <div class="container">
        ${breadcrumb([{ nome: 'Início', url: '/' }, { nome: data.titulo }])}
        <div class="row align-items-center g-4">
          <div class="col-lg-7">
            <h1 class="page-hero-title">${esc(data.tituloCompleto)}</h1>
            <p class="page-hero-subtitle">${esc(data.subtitulo)}</p>
            <p class="page-hero-price">${esc(data.precoDestaque)}</p>
            <div class="d-flex flex-wrap gap-3 mt-3">
              <a href="${waHref(data.mensagemWhatsApp)}" class="btn btn-lg btn-whatsapp page-hero-btn-secondary" target="_blank" rel="noopener" data-track="hero">
                ${waIcon} Encomendar pelo WhatsApp
              </a>
            </div>
          </div>
          <div class="col-lg-5 text-center">
            <div class="page-hero-image">
              <img src="/${esc(data.imagem)}" alt="${esc(data.tituloCompleto)} - ${esc(site.nome)}" loading="eager" fetchpriority="high" width="600" height="600">
            </div>
          </div>
        </div>
      </div>
    </header>`;
}

function ctaBand(data) {
  return `
    <section class="cta-band" aria-label="Faça sua encomenda">
      <div class="container text-center">
        <h2 class="cta-band-title">Pronto para encomendar ${esc(data.titulo.toLowerCase())}?</h2>
        <p class="cta-band-text">Atendemos Santo André e região com retirada no local.</p>
        <a href="${waHref(data.mensagemWhatsApp)}" class="btn btn-lg cta-band-btn" target="_blank" rel="noopener" data-track="cta-band">
          ${waIcon} Pedir pelo WhatsApp
        </a>
      </div>
    </section>`;
}

function policiesSection() {
  const p = site.politicas;
  const items = [
    { icon: 'fa-calendar-check', titulo: 'Antecedência', texto: p.antecedencia },
    { icon: 'fa-circle-check', titulo: 'Confirmação', texto: p.confirmacao },
    { icon: 'fa-money-bill-wave', titulo: 'Pagamento', texto: p.pagamento },
    { icon: 'fa-bag-shopping', titulo: 'Retirada', texto: p.retirada }
  ];
  return `
    <section class="py-5 section-soft" aria-labelledby="info-title">
      <div class="container">
        <div class="section-header text-center mb-4">
          <h2 id="info-title" class="section-badge-title">Informações importantes</h2>
        </div>
        <div class="row g-4">
          ${items.map((it) => `
          <div class="col-md-6 col-lg-3">
            <div class="info-card">
              <i class="fa-solid ${it.icon}" aria-hidden="true"></i>
              <h3>${esc(it.titulo)}</h3>
              <p>${esc(it.texto)}</p>
            </div>
          </div>`).join('')}
        </div>
        <p class="text-center mt-4 mb-0 info-address">
          <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
          Retiradas em <strong>${esc(site.endereco.rua)} - ${esc(site.endereco.bairro)}, ${esc(site.endereco.cidade)}/${esc(site.endereco.uf)}</strong>, com horário marcado · ${esc(site.horario)}
        </p>
      </div>
    </section>`;
}

function faqSection(faq) {
  if (!faq || !faq.length) return '';
  return `
    <section class="py-5" aria-labelledby="faq-title">
      <div class="container faq-container">
        <div class="section-header text-center mb-4">
          <h2 id="faq-title" class="section-badge-title">Perguntas frequentes</h2>
        </div>
        <div class="faq-list">
          ${faq.map((f) => `
          <details class="faq-item">
            <summary>${esc(f.q)}</summary>
            <p>${esc(f.a)}</p>
          </details>`).join('')}
        </div>
      </div>
    </section>`;
}

function relatedSection(currentSlug) {
  const outros = (recomendacoes[currentSlug] || [])
    .map((slug) => produtoPorSlug.get(slug))
    .filter((p) => p && p.slug !== currentSlug)
    .slice(0, 4);
  const listaId = `lista-relacionados-${currentSlug}`;
  const relacionadosIniciais = outros.slice(0, 3);
  const relacionadosRestantes = outros.slice(3);
  return `
    <section class="py-5 section-soft" aria-labelledby="rel-title">
      <div class="container">
        <div class="section-header text-center mb-4">
          <h2 id="rel-title" class="section-badge-title">Você também vai gostar</h2>
        </div>
        <div id="${esc(listaId)}" class="prod-grid" data-lista-relacionados>
          ${relacionadosIniciais.map((p) => prodCard(p)).join('\n          ')}
          ${relacionadosRestantes.map((p) => prodCard(p, { extra: true })).join('\n          ')}
        </div>${relacionadosRestantes.length ? `
        <div class="text-center mt-4">
          <button type="button" class="btn btn-lg page-hero-btn-secondary" data-ver-mais-relacionados hidden aria-controls="${esc(listaId)}" aria-expanded="false">
            Ver mais sugestões <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
          </button>
        </div>` : ''}
        <div class="text-center mt-4">
          <a href="/#produtos" class="btn btn-lg page-hero-btn-secondary">Ver mais produtos <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
        </div>
      </div>
    </section>`;
}

function prodCard(p, { extra = false } = {}) {
  return `<a class="prod-card${extra ? ' produto-extra' : ''}"${extra ? ' data-produto-extra hidden' : ''} href="/${esc(p.url)}">
            <div class="prod-card-image" style="--media-image:url(/${esc(p.imagem)})">
              <img src="/${esc(p.imagem)}" alt="${esc(p.titulo)} em Santo André - ${esc(site.nome)}" loading="lazy" width="400" height="300">
            </div>
            <div class="prod-card-body">
              <h3>${esc(p.titulo)}</h3>
              <p class="prod-card-desc">${esc(p.descricao)}</p>
              <p class="prod-card-price">${esc(p.precoDestaque)}</p>
              <span class="prod-card-link">Ver detalhes e preços <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
            </div>
          </a>`;
}

// ---------- JSON-LD ----------
function localBusinessLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Bakery',
    '@id': `${site.url}/#organization`,
    name: site.nome,
    alternateName: 'Basilio Bolos Confeitaria',
    url: `${site.url}/`,
    logo: { '@type': 'ImageObject', url: `${site.url}/assets/images/brand/logo.jpeg` },
    image: [`${site.url}/assets/images/hero/hero-placeholder.jpeg`],
    description: site.descricao,
    telephone: `+${site.whatsappNumero}`,
    priceRange: '$$',
    paymentAccepted: 'Dinheiro, Pix, Cartão de débito e crédito',
    currenciesAccepted: 'BRL',
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.endereco.rua,
      addressLocality: site.endereco.cidade,
      addressRegion: site.endereco.uf,
      postalCode: site.endereco.cep,
      addressCountry: 'BR',
      addressNeighborhood: site.endereco.bairro
    },
    geo: { '@type': 'GeoCoordinates', latitude: GEO.lat, longitude: GEO.lng },
    areaServed: [
      { '@type': 'City', name: 'Santo André' },
      ...site.bairrosAtendidos.map((b) => ({ '@type': 'Neighborhood', name: b, containedIn: 'Santo André, SP' }))
    ],
    openingHoursSpecification: [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: site.horarioSchema.opens,
      closes: site.horarioSchema.closes
    }],
    hasMap: site.endereco.mapsUrl,
    sameAs: [site.social.instagram, site.social.facebook, site.social.tiktok, site.endereco.mapsUrl],
    servesCuisine: 'Confeitaria'
  };
}

function faqLd(faq) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };
}

function breadcrumbLd(pageTitle, pageUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: `${site.url}/` },
      { '@type': 'ListItem', position: 2, name: pageTitle, item: `${site.url}/${pageUrl}` }
    ]
  };
}

function productLd(data, url, lowPrice, highPrice, extra = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${data.tituloCompleto} | ${site.nome}`,
    description: data.subtitulo,
    image: [`${site.url}/${data.imagem}`],
    brand: { '@type': 'Brand', name: site.nome },
    category: 'Confeitaria',
    offers: {
      '@type': 'AggregateOffer',
      url: `${site.url}/${url}`,
      priceCurrency: 'BRL',
      lowPrice: lowPrice,
      highPrice: highPrice,
      offerCount: extra.offerCount || 4,
      availability: 'https://schema.org/MadeToOrder',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${site.url}/#organization` },
      areaServed: { '@type': 'City', name: 'Santo André' }
    },
    ...extra.props
  };
}

// ---------- Página inicial ----------
function renderHome() {
  const faqHome = [
    { q: 'Quais produtos a Basilio Bolos oferece?', a: 'Oferecemos bentô cake, bolos personalizados do P ao GG, doces por cento e doces premium, biscoitos decorados, cupcakes, brownies, pipoca gourmet e bolo de pote. Todos artesanais e personalizáveis, em Santo André/SP.' },
    { q: 'Quais bairros vocês atendem em Santo André?', a: `Atendemos principalmente os bairros ${site.bairrosAtendidos.join(', ')} em Santo André/SP. Para outros bairros e cidades do ABC, consulte disponibilidade pelo WhatsApp.` },
    { q: 'Como faço um pedido?', a: `Clique no botão de WhatsApp em qualquer página do site, descreva o produto, quantidade e/ou tamanho. Retornamos com orçamento e disponibilidade no mesmo dia. Atendimento das 8h às 20h, todos os dias.` },
    { q: 'Vocês fazem bolos e doces personalizados para festas?', a: 'Sim! Criamos bolos personalizados, doces temáticos, biscoitos decorados e kits festa sob medida. Basta enviar a referência e a data pelo WhatsApp para montarmos a proposta.' },
    { q: 'A Basilio Bolos tem loja física?', a: `Somos uma confeitaria caseira que trabalha sob encomenda, com retirada no local. Estamos na ${site.endereco.rua} - ${site.endereco.bairro}, ${site.endereco.cidade}/${site.endereco.uf}. Agende sua encomenda pelo WhatsApp ${site.telefoneDisplay}.` },
    { q: 'Quanto custa um bolo de aniversário na Basilio Bolos?', a: faqPrecoBolos(true) }
  ];

  const campanhaAtiva = campanha && campanha.ativo && Array.isArray(campanha.produtos) && campanha.produtos.length;
  const produtosIniciais = produtos.slice(0, 8);
  const produtosRestantes = produtos.slice(8);

  const campanhaSection = campanhaAtiva ? `
    <section id="campanhas" class="py-5 section-campaign" style="background:linear-gradient(135deg, ${campanha.cor_fundo}, ${campanha.cor_secundaria});color:${campanha.cor_texto};">
      <div class="container">
        <div class="section-header">
          <p class="section-eyebrow" style="color:${campanha.cor_texto};">Campanha em destaque</p>
          <h2 class="mb-3" style="color:${campanha.cor_texto};">${esc(campanha.campanha)}</h2>
          <p class="mb-4" style="color:${campanha.cor_texto};">${esc(campanha.descricao)}</p>
        </div>
        <div class="carousel-container">
          <div class="swiper-button-prev"></div>
          <div class="carousel-wrapper">
            <div class="swiper campSwiper">
              <div class="swiper-wrapper">
                ${campanha.produtos.map((prod) => `
                <div class="swiper-slide">
                  <article class="flip-card">
                    <div class="flip-inner">
                      <div class="flip-front">
                        <div class="card-image-wrapper" style="--media-image:url(/${esc(prod.imagem)})">
                          <img src="/${esc(prod.imagem)}" alt="${esc(prod.titulo)}" loading="lazy" width="400" height="240">
                        </div>
                        <div class="card-content">
                          <h3 class="h5">${esc(prod.titulo)}</h3>
                          <p class="card-description">${esc(prod.descricao)}</p>
                          <p class="price">${esc(prod.valor)}</p>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>`).join('')}
              </div>
            </div>
          </div>
          <div class="swiper-button-next"></div>
          <div class="swiper-pagination"></div>
        </div>
      </div>
    </section>` : '';

  const body = `
    <header id="hero" class="hero-surface">
      <div class="container">
        <div class="row align-items-center g-4">
          <div class="col-lg-6 hero-copy">
            <h1 class="display-4 fw-bold hero-title">${esc(site.nome)}</h1>
            <p class="hero-subtitle">${esc(site.slogan)} · Confeitaria artesanal em Santo André/SP</p>
            <div class="hero-cta-stack">
              <a href="${waHref()}" class="btn btn-lg hero-cta-primary" target="_blank" rel="noopener" data-track="hero">
                ${waIcon} Fazer Pedido
              </a>
              <a href="#produtos" class="btn btn-lg hero-cta-secondary">Ver Produtos</a>
            </div>
          </div>
          <div class="col-lg-6 hero-visual-wrapper">
            <div class="hero-visual" aria-hidden="true">
              <img src="/assets/images/hero/hero-placeholder-circle.png" alt="" loading="eager" fetchpriority="high" width="502" height="497">
            </div>
          </div>
        </div>
      </div>
      <div class="hero-decoration"></div>
    </header>
${campanhaSection}
    <section id="produtos" class="py-5 section-soft">
      <div class="container">
        <div class="section-header text-center mb-5">
          <h2 class="section-badge-title">Nossos Produtos</h2>
          <p class="mb-4 lead mx-auto" style="max-width:720px;color:#6b4f46;">
            Do bentô cake ao bolo de festa, dos docinhos por cento à pipoca gourmet: tudo artesanal,
            feito sob encomenda em <strong>Santo André/SP</strong>. Escolha um produto para ver detalhes e preços.
          </p>
        </div>
        <div id="lista-produtos" class="prod-grid">
          ${produtosIniciais.map((p) => prodCard(p)).join('\n          ')}
          ${produtosRestantes.map((p) => prodCard(p, { extra: true })).join('\n          ')}
        </div>${produtosRestantes.length ? `
        <div class="text-center mt-4">
          <button type="button" class="btn btn-lg page-hero-btn-secondary" data-ver-mais-produtos hidden aria-controls="lista-produtos" aria-expanded="false">
            Ver mais produtos <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
          </button>
        </div>` : ''}
      </div>
    </section>

    <section id="sobre" class="py-5 section-gradient-sand">
      <div class="container sobre-container">
        <div class="section-header text-center mb-5">
          <h2 class="section-badge-title">Nossa História</h2>
        </div>
        <div class="row align-items-center g-5 sobre-grid">
          <div class="col-lg-5 text-center sobre-image">
            <div class="image-frame">
              <img src="/assets/images/sobre/irmas-placeholder.jpeg" class="img-fluid" alt="Fundadoras da ${esc(site.nome)}, confeitaria artesanal de Santo André" width="1024" height="1024" loading="lazy">
            </div>
          </div>
          <div class="col-lg-7 sobre-text">
            <p class="lead">
              A <strong>${esc(site.nome)}</strong> nasceu há <strong>10 anos</strong>, quando começamos a vender bolo no pote de porta em porta em Santo André.
              Com paixão, estudo e dedicação, hoje oferecemos uma confeitaria artesanal especializada, com produtos altamente
              personalizáveis, feitos com carinho e atenção aos detalhes.
            </p>
            <p>
              Nosso prazer é fazer parte dos melhores momentos das pessoas, mesmo que nos bastidores: alegrar e adoçar histórias,
              uma encomenda por vez.
            </p>
            <div class="sobre-features mt-4">
              <div class="feature-item">
                <i class="fa-solid fa-heart" aria-hidden="true"></i>
                <div>
                  <strong>100% Artesanal</strong>
                  <span>Feito com amor e ingredientes selecionados</span>
                </div>
              </div>
              <div class="feature-item">
                <i class="fa-solid fa-star" aria-hidden="true"></i>
                <div>
                  <strong>10 Anos de Tradição</strong>
                  <span>Experiência e dedicação em cada receita</span>
                </div>
              </div>
              <div class="feature-item">
                <i class="fa-solid fa-cake-candles" aria-hidden="true"></i>
                <div>
                  <strong>Personalização Total</strong>
                  <span>Seu pedido exatamente como você imaginou</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
${faqSection(faqHome)}

    <section id="contato" class="py-5 section-contato">
      <div class="container">
        <div class="section-header text-center mb-5">
          <h2 class="section-badge-title-dark">Contatos</h2>
          <p class="lead text-center mx-auto" style="max-width:650px;color:rgba(255,255,255,0.9);">
            Estamos prontos para criar algo especial para você
          </p>
        </div>

        <div class="row g-4 justify-content-center mb-5">
          <div class="col-md-4">
            <a href="${waHref()}" class="contact-card" target="_blank" rel="noopener" data-track="contato">
              <div class="contact-icon"><i class="fa-brands fa-whatsapp"></i></div>
              <h3 class="h4">WhatsApp</h3>
              <p>${esc(site.telefoneDisplay)}</p>
              <span class="contact-arrow">→</span>
            </a>
          </div>
          <div class="col-md-4">
            <a href="${safeUrl(site.social.instagram)}" class="contact-card" target="_blank" rel="noopener">
              <div class="contact-icon"><i class="fa-brands fa-instagram"></i></div>
              <h3 class="h4">Instagram</h3>
              <p>@basiliobolos</p>
              <span class="contact-arrow">→</span>
            </a>
          </div>
          <div class="col-md-4">
            <a href="${safeUrl(site.endereco.mapsUrl)}" class="contact-card" target="_blank" rel="noopener">
              <div class="contact-icon"><i class="fa-solid fa-location-dot"></i></div>
              <h3 class="h4">Localização</h3>
              <p>Ver no mapa</p>
              <span class="contact-arrow">→</span>
            </a>
          </div>
        </div>

        <div class="text-center">
          <address class="contact-address-modern" aria-label="Endereço físico">
            <h3 class="h5" style="color:#fff;margin-bottom:1.5rem;font-size:1.3rem;font-weight:bold;">
              <i class="fa-solid fa-map-marker-alt" aria-hidden="true"></i> Nosso Endereço
            </h3>
            <p style="color:rgba(255,255,255,0.95);font-size:1rem;margin:0 0 1.5rem 0;">
              ${esc(site.endereco.rua)} <span class="d-none d-md-inline">·</span><br class="d-md-none"> ${esc(site.endereco.bairro)}<br>
              ${esc(site.endereco.cidade)}/${esc(site.endereco.uf)} · CEP ${esc(site.endereco.cep)}
            </p>
            <p style="color:rgba(255,255,255,0.85);margin:0;font-size:0.9rem;">
              <i class="fa-regular fa-clock" aria-hidden="true"></i> ${esc(site.horario)}
            </p>
          </address>
        </div>
      </div>
    </section>`;

  const jsonLd = [
    localBusinessLd(),
    faqLd(faqHome),
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Produtos da Basilio Bolos',
      itemListElement: produtos.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: p.titulo,
        url: `${site.url}/${p.url}`
      }))
    }
  ];

  return layout({ seo: SEO.home, canonical: '/', active: 'home', jsonLd, body, usaSwiper: campanhaAtiva });
}

// ---------- Página de Bolos (redondos e retangulares) ----------
function renderBolos(data, seoKey) {
  const fator = data.fatorPreco || 1;
  const tamanhosCalc = data.tamanhos.filter((t) => t.pesoKg);
  const precoTamanho = (r, t) => round9(r.precoKg * t.pesoKg * fator);
  const minLocal = Math.min(...tamanhosCalc.map((t) => Math.min(...bolos.recheios.map((r) => precoTamanho(r, t)))));
  const maxLocal = Math.max(...tamanhosCalc.map((t) => Math.max(...bolos.recheios.map((r) => precoTamanho(r, t)))));
  const url = `${data.slug}/`;
  const ehRetangular = data.slug === 'bolos-retangulares';

  // FAQ de preço sempre sincronizada com a tabela calculada
  const faqPreco = ehRetangular
    ? { q: 'Quanto custa um bolo retangular em Santo André?', a: `Na ${site.nome}, o bolo retangular de 17x25cm (24 a 28 fatias) sai a partir de ${money(Math.min(...bolos.recheios.map((r) => precoTamanho(r, tamanhosCalc[0]))))} e o de 22x30cm (38 a 44 fatias) a partir de ${money(Math.min(...bolos.recheios.map((r) => precoTamanho(r, tamanhosCalc[1]))))}, conforme o recheio escolhido.` }
    : { q: 'Quanto custa um bolo de aniversário em Santo André?', a: faqPrecoBolos(false) };
  const faqBolos = [
    faqPreco,
    ...bolos.faq.filter((f) => !/quanto custa/i.test(f.q))
  ];

  // Tabela recheio x tamanho (preço calculado pelo kg, fatia de 100g, terminado em 9)
  const linhasRecheios = bolos.recheios.map((r) => {
    const celulas = tamanhosCalc.map((t) => `<td data-label="${esc(t.nome)}">${money(precoTamanho(r, t))}</td>`).join('');
    return `
              <tr>
                <th scope="row">
                  <span class="recheio-nome">${esc(r.nome)}</span>
                  <span class="recheio-desc">${esc(r.descricao)}</span>
                </th>
                ${celulas}
              </tr>`;
  }).join('');

  const coberturas = data.coberturas || bolos.coberturas;
  const ganache = coberturas.find((c) => c.nome === 'Ganache');
  const ganacheTiers = Object.entries(ganache.acrescimoPorTamanho)
    .map(([tam, valor]) => `<span class="tier-badge"><span class="tier-size">${esc(tam)}</span> <span class="tier-price">+ ${money(valor)}</span></span>`).join('\n                  ');

  const tamanhosTradicionais = data.tamanhos.filter((t) => t.id !== 'bento');
  const colunaMedida = ehRetangular ? 'Medidas' : 'Diâmetro';

  const body = `
${pageHero(data, SEO[seoKey])}

    <section id="precos" class="py-5" aria-labelledby="tamanhos-title">
      <div class="container">
        <div class="section-header text-center mb-4">
          <h2 id="tamanhos-title" class="section-badge-title">${ehRetangular ? 'Bolos retangulares: tamanhos e fatias' : 'Bolos tradicionais: tamanhos e fatias'}</h2>
          <p class="mx-auto" style="max-width:680px;color:#6b4f46;">${esc(data.notaTamanhos)}</p>
        </div>
        <div class="table-responsive">
          <table class="price-table">
            <caption class="sr-only">Tamanhos de bolo por ${ehRetangular ? 'medidas' : 'diâmetro'} e quantidade de fatias</caption>
            <thead>
              <tr>
                <th scope="col">Tamanho</th>
                <th scope="col">${colunaMedida}</th>
                <th scope="col">Fatias</th>
              </tr>
            </thead>
            <tbody>
              ${tamanhosTradicionais.map((t) => `
              <tr>
                <th scope="row">${esc(t.nome)}${t.obs ? `<span class="recheio-desc">${esc(t.obs)}</span>` : ''}</th>
                <td data-label="${colunaMedida}">${esc(t.diametro)}</td>
                <td data-label="Fatias">${esc(t.fatias)}</td>
              </tr>`).join('')}            </tbody>
          </table>
        </div>
        <p class="table-note">Outros formatos: ${data.formatos.map(esc).join(' · ')}.</p>
      </div>
    </section>

    <section class="py-5 section-soft" aria-labelledby="recheios-title">
      <div class="container">
        <div class="section-header text-center mb-4">
          <h2 id="recheios-title" class="section-badge-title">Sabores de recheio e preços</h2>
          <p class="mx-auto" style="max-width:680px;color:#6b4f46;">${esc(data.notaRecheios)}</p>
        </div>
        <div class="table-responsive">
          <table class="price-table price-table-matrix">
            <caption class="sr-only">Preço de cada sabor de recheio por tamanho de bolo</caption>
            <thead>
              <tr>
                <th scope="col">Recheio</th>
                ${tamanhosCalc.map((t) => `<th scope="col">${esc(t.nome)} <span class="th-sub">${esc(t.diametro)}</span></th>`).join('\n                ')}
              </tr>
            </thead>
            <tbody>${linhasRecheios}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="py-5" aria-labelledby="massas-title">
      <div class="container">
        <div class="section-header text-center mb-4">
          <h2 id="massas-title" class="section-badge-title">Massas e coberturas</h2>
        </div>
        <div class="massas-coberturas-grid">
          <div class="mc-card">
            <div class="mc-card-icon"><i class="fa-solid fa-bread-slice"></i></div>
            <h3 class="mc-card-title">Massas</h3>
            <p class="mc-card-sub">Escolha a massa do seu bolo</p>
            <div class="massas-pills">
              ${bolos.massas.map((m) => {
                const cls = m.toLowerCase() === 'branca' ? 'massa-pill massa-branca' : 'massa-pill massa-chocolate';
                return `<span class="${cls}">${esc(m)}</span>`;
              }).join('\n              ')}
            </div>
          </div>
          <div class="mc-card">
            <div class="mc-card-icon"><i class="fa-solid fa-ice-cream"></i></div>
            <h3 class="mc-card-title">Coberturas</h3>
            <p class="mc-card-sub">Escolha a cobertura do seu bolo</p>
            <div class="coberturas-list">
              <div class="cobertura-row cobertura-row--free">
                <div class="cobertura-info">
                  <span class="cobertura-nome">Chantilly</span>
                  <span class="cobertura-tag cobertura-tag--free">sem acréscimo</span>
                </div>
              </div>
              <div class="cobertura-row cobertura-row--paid">
                <div class="cobertura-info">
                  <span class="cobertura-nome">Ganache</span>
                  <span class="cobertura-tag cobertura-tag--paid">com acréscimo</span>
                </div>
                <div class="ganache-tiers">
                  ${ganacheTiers}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="py-5 section-soft" aria-labelledby="acrescimos-title">
      <div class="container">
        <div class="section-header text-center mb-4">
          <h2 id="acrescimos-title" class="section-badge-title">Acréscimos e decoração</h2>
          <p class="mx-auto" style="max-width:680px;color:#6b4f46;">${esc(bolos.notaAcrescimos)}</p>
        </div>
        <div class="row g-3 justify-content-center">
          ${bolos.acrescimos.map((a) => `
          <div class="col-6 col-md-4 col-lg-3">
            <div class="addon-card">
              <h3>${esc(a.nome)}</h3>
              <p>${esc(a.preco)}${a.obs ? ` <span>(${esc(a.obs)})</span>` : ''}</p>
            </div>
          </div>`).join('')}
        </div>
      </div>
    </section>
${policiesSection()}
${faqSection(faqBolos)}
${ctaBand(data)}
${relatedSection(data.slug)}`;

  const jsonLd = [
    localBusinessLd(),
    productLd(data, url, minLocal, maxLocal, { offerCount: bolos.recheios.length }),
    faqLd(faqBolos),
    breadcrumbLd(data.titulo, url)
  ];

  return layout({ seo: SEO[seoKey], canonical: `/${url}`, active: data.slug, jsonLd, body });
}

// ---------- Página de Bentô Cake ----------
function renderBentoCake() {
  const bento = bolos.tamanhos.find((t) => t.id === 'bento');
  // Preço do bentô por sabor: proporcional ao preço/kg do recheio,
  // com o sabor mais barato saindo pelo preço base ("a partir de")
  const minPrecoKg = Math.min(...bolos.recheios.map((r) => r.precoKg));
  const precoPorSabor = (r) => round9(bento.precoFixo * r.precoKg / minPrecoKg);
  const minBento = Math.min(...bolos.recheios.map(precoPorSabor));
  const maxBento = Math.max(...bolos.recheios.map(precoPorSabor));

  const data = {
    slug: 'bento-cake',
    titulo: 'Bentô Cake',
    tituloCompleto: 'Bentô Cake em Santo André',
    subtitulo: 'O bolinho individual de 10cm que virou febre: perfeito para presentear, celebrar a dois ou matar a vontade de um bolo só seu. Recheio generoso e decoração personalizada.',
    imagem: 'assets/images/produtos/bento-cake.webp',
    precoDestaque: `A partir de ${money(minBento)}`,
    mensagemWhatsApp: 'Olá! Quero encomendar um bentô cake. Podem me passar as opções?'
  };

  const faqBento = [
    { q: 'Quanto custa um bentô cake em Santo André?', a: `Na ${site.nome}, o bentô cake (10cm) sai de ${money(minBento)} a ${money(maxBento)}, conforme o sabor do recheio, com massa branca ou de chocolate e cobertura de chantilly inclusos. Adicionais de decoração têm valor sob consulta.` },
    { q: 'Quantas pessoas serve um bentô cake?', a: `O bentô cake tem 10cm de diâmetro e serve de ${bento.fatias} pessoas. É ideal para presentes e comemorações íntimas.` },
    { q: 'Com quanta antecedência devo encomendar?', a: 'Pedimos no mínimo 3 dias úteis de antecedência. O pedido é confirmado após o pagamento de 30% do valor.' }
  ];

  const linhasSabores = bolos.recheios.map((r) => `
              <tr>
                <th scope="row">
                  <span class="recheio-nome">${esc(r.nome)}</span>
                  <span class="recheio-desc">${esc(r.descricao)}</span>
                </th>
                <td data-label="Valor" class="price-cell">${money(precoPorSabor(r))}</td>
              </tr>`).join('');

  const body = `
${pageHero(data, SEO['bento-cake'])}

    <section id="precos" class="py-5" aria-labelledby="como-funciona-title">
      <div class="container">
        <div class="section-header text-center mb-4">
          <h2 id="como-funciona-title" class="section-badge-title">Como é o bentô cake</h2>
        </div>
        <div class="row g-4 justify-content-center">
          <div class="col-md-4">
            <div class="info-card">
              <i class="fa-solid fa-ruler-combined" aria-hidden="true"></i>
              <h3>Tamanho</h3>
              <p>${esc(bento.diametro)} de diâmetro, servido em uma embalagem própria tipo marmitinha, com colher.</p>
            </div>
          </div>
          <div class="col-md-4">
            <div class="info-card">
              <i class="fa-solid fa-utensils" aria-hidden="true"></i>
              <h3>Porções</h3>
              <p>Serve de ${esc(bento.fatias)} pessoas. O tamanho certo para presentear sem desperdício.</p>
            </div>
          </div>
          <div class="col-md-4">
            <div class="info-card">
              <i class="fa-solid fa-tag" aria-hidden="true"></i>
              <h3>Preço</h3>
              <p>De ${money(minBento)} a ${money(maxBento)}, conforme o sabor do recheio. Cobertura de chantilly inclusa.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="py-5 section-soft" aria-labelledby="sabores-bento-title">
      <div class="container">
        <div class="section-header text-center mb-4">
          <h2 id="sabores-bento-title" class="section-badge-title">Sabores e preços</h2>
          <p class="mx-auto" style="max-width:680px;color:#6b4f46;">Escolha um dos 20 recheios artesanais, com massa branca ou de chocolate e cobertura de chantilly inclusa.</p>
        </div>
        <div class="table-responsive">
          <table class="price-table">
            <caption class="sr-only">Sabores de recheio do bentô cake e respectivos valores</caption>
            <thead>
              <tr>
                <th scope="col">Sabor</th>
                <th scope="col">Valor</th>
              </tr>
            </thead>
            <tbody>${linhasSabores}
            </tbody>
          </table>
        </div>
        <p class="table-note">Massas disponíveis: ${bolos.massas.map(esc).join(' e ')}. Cobertura sempre em chantilly, sem acréscimo.</p>
      </div>
    </section>

    <section class="py-5" aria-labelledby="decor-bento-title">
      <div class="container">
        <div class="section-header text-center mb-4">
          <h2 id="decor-bento-title" class="section-badge-title">Decoração e adicionais</h2>
          <p class="mx-auto" style="max-width:680px;color:#6b4f46;">O bentô pode ser decorado com frases, desenhos e o tema da sua comemoração. Estes adicionais também estão disponíveis, com valor a consultar:</p>
        </div>
        <div class="row g-3 justify-content-center">
          ${bolos.acrescimos.map((a) => `
          <div class="col-6 col-md-4 col-lg-3">
            <div class="addon-card">
              <h3>${esc(a.nome)}</h3>
              <p>A consultar</p>
            </div>
          </div>`).join('')}
        </div>
      </div>
    </section>
${policiesSection()}
${faqSection(faqBento)}
${ctaBand(data)}
${relatedSection('bento-cake')}`;

  const jsonLd = [
    localBusinessLd(),
    productLd(data, 'bento-cake/', minBento, maxBento, { offerCount: bolos.recheios.length }),
    faqLd(faqBento),
    breadcrumbLd('Bentô Cake', 'bento-cake/')
  ];

  return layout({ seo: SEO['bento-cake'], canonical: '/bento-cake/', active: 'bento-cake', jsonLd, body });
}

// ---------- Página de Doces ----------
function renderDoces() {
  const minCento = Math.min(...doces.centos.map((d) => d.precoCento));
  const maxCento = Math.max(...doces.centos.map((d) => d.precoCento));
  const minUn = Math.min(...doces.premium.map((d) => d.precoUnidade));

  const menuItem = (d, precoHtml) => `
          <li class="menu-item menu-item-com-img">
            <div class="menu-item-media" style="--media-image:url(/${esc(d.imagem)})">
              <img class="menu-item-img" src="/${esc(d.imagem)}" alt="${esc(d.nome)} - ${esc(site.nome)}" loading="lazy" width="72" height="72" onerror="this.closest('.menu-item-media').style.display='none'">
            </div>
            <div class="menu-item-body">
              <div class="menu-item-head">
                <h3 class="menu-item-name">${esc(d.nome)}</h3>
                <span class="menu-item-dots" aria-hidden="true"></span>
                <span class="menu-item-price">${precoHtml}</span>
              </div>
              <p class="menu-item-desc">${esc(d.descricao)}</p>
            </div>
          </li>`;

  const body = `
${pageHero(doces, SEO.doces)}

    <section id="precos" class="py-5" aria-labelledby="centos-title">
      <div class="container">
        <div class="section-header text-center mb-4">
          <h2 id="centos-title" class="section-badge-title">Doces por cento</h2>
          <p class="mx-auto" style="max-width:680px;color:#6b4f46;">Ideais para festas e eventos. ${esc(doces.notaCentos)}</p>
        </div>
        <ul class="menu-list">${doces.centos.map((d) => menuItem(d, `${money(d.precoCento)} <small>o cento</small>`)).join('')}
        </ul>
      </div>
    </section>

    <section class="py-5 section-soft" aria-labelledby="premium-title">
      <div class="container">
        <div class="section-header text-center mb-4">
          <h2 id="premium-title" class="section-badge-title">Doces premium (por unidade)</h2>
          <p class="mx-auto" style="max-width:680px;color:#6b4f46;">${esc(doces.notaPremium)}</p>
        </div>
        <ul class="menu-list">${doces.premium.map((d) => menuItem(d, `${moneyCents(d.precoUnidade)} <small>a unidade</small>`)).join('')}
        </ul>
      </div>
    </section>
${policiesSection()}
${faqSection(doces.faq)}
${ctaBand(doces)}
${relatedSection('doces')}`;

  const jsonLd = [
    localBusinessLd(),
    productLd(doces, 'doces/', minUn, maxCento, { offerCount: doces.centos.length + doces.premium.length }),
    faqLd(doces.faq),
    breadcrumbLd(doces.titulo, 'doces/')
  ];

  return layout({ seo: SEO.doces, canonical: '/doces/', active: 'doces', jsonLd, body });
}

// ---------- Páginas simples (biscoitos, cupcakes, brownies, pipoca, bolo de pote) ----------
function renderSimples(data) {
  const precos = data.opcoes.map((o) => primeiroNumero(o.preco)).filter((n) => n != null);
  const low = primeiroNumero(data.precoDestaque) || Math.min(...precos);
  const high = Math.max(...precos);

  const saboresBlock = data.sabores ? `
        <div class="flavor-chips" aria-label="Sabores disponíveis">
          ${data.sabores.map((s) => `<span class="flavor-chip">${esc(s)}</span>`).join('\n          ')}
        </div>` : '';

  const body = `
${pageHero(data, SEO[data.slug])}

    <section id="precos" class="py-5" aria-labelledby="opcoes-title">
      <div class="container">
        <div class="section-header text-center mb-4">
          <h2 id="opcoes-title" class="section-badge-title">Opções e preços</h2>
        </div>
        ${saboresBlock}
        <div class="row g-3 justify-content-center">
          ${data.opcoes.map((o) => `
          <div class="col-md-6 col-lg-5">
            <div class="option-card">
              <div class="option-card-head">
                <h3>${esc(o.nome)}</h3>
                <span class="option-price">${esc(o.preco)}</span>
              </div>
              <p>${esc(o.descricao)}</p>
            </div>
          </div>`).join('')}
        </div>
        <p class="table-note text-center mt-4">${esc(data.nota)}</p>
      </div>
    </section>
${policiesSection()}
${faqSection(data.faq)}
${ctaBand(data)}
${relatedSection(data.slug)}`;

  const jsonLd = [
    localBusinessLd(),
    productLd(data, `${data.slug}/`, low, high, { offerCount: data.opcoes.length }),
    faqLd(data.faq),
    breadcrumbLd(data.titulo, `${data.slug}/`)
  ];

  return layout({ seo: SEO[data.slug], canonical: `/${data.slug}/`, active: data.slug, jsonLd, body });
}

// ---------- Sitemap e llms.txt ----------
function renderSitemap() {
  const urls = [
    {
      loc: '/', priority: '1.0', changefreq: 'weekly',
      images: [
        { loc: '/assets/images/hero/hero-placeholder.jpeg', title: 'Basilio Bolos - Confeitaria Artesanal' },
        { loc: '/assets/images/brand/logo.jpeg', title: 'Logo Basilio Bolos' }
      ]
    },
    ...produtos.filter((p) => !p.url.includes('#')).map((p) => ({
      loc: `/${p.url}`, priority: '0.9', changefreq: 'weekly',
      images: [{ loc: `/${p.imagem}`, title: `${p.titulo} - ${site.nome}` }]
    }))
  ];
  const imageTags = (u) => (u.images || []).map((img) => `
    <image:image>
      <image:loc>${site.url}${img.loc}</image:loc>
      <image:title>${esc(img.title)}</image:title>
    </image:image>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map((u) => `  <url>
    <loc>${site.url}${u.loc}</loc>
    <lastmod>${hoje}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>${imageTags(u)}
  </url>`).join('\n')}
</urlset>
`;
}

// ---------- Página 404 ----------
function render404() {
  const body = `
    <header class="page-hero">
      <div class="container text-center">
        <h1 class="page-hero-title">Página não encontrada</h1>
        <p class="page-hero-subtitle mx-auto">Ops! A página que você procurou não existe ou foi movida. Mas os doces continuam por aqui:</p>
        <div class="d-flex flex-wrap gap-3 justify-content-center mt-3">
          <a href="/" class="btn btn-lg page-hero-btn-secondary">Voltar ao início</a>
          <a href="${waHref()}" class="btn btn-lg btn-whatsapp" target="_blank" rel="noopener">${waIcon} Fazer Pedido</a>
        </div>
      </div>
    </header>
    <section class="py-5 section-soft">
      <div class="container">
        <div class="prod-grid">
          ${produtos.map((p) => prodCard(p)).join('\n          ')}
        </div>
      </div>
    </section>`;
  return layout({
    seo: {
      title: `Página não encontrada | ${site.nome}`,
      description: 'A página que você procurou não existe. Volte ao início e confira nossos bolos, doces e sobremesas artesanais em Santo André/SP.',
      keywords: ''
    },
    canonical: '/404.html',
    active: null,
    jsonLd: [],
    body
  });
}

function renderLlms() {
  const linhas = produtos.map((p) => `- [${p.titulo}](${site.url}/${p.url}): ${p.descricao} ${p.precoDestaque}.`);
  return `# ${site.nome}

> ${site.descricao}

Confeitaria artesanal que trabalha sob encomenda em Santo André/SP (Brasil), há 10 anos.
Endereço de retirada: ${site.endereco.rua} - ${site.endereco.bairro}, ${site.endereco.cidade}/${site.endereco.uf} - CEP ${site.endereco.cep}.
Atendimento: ${site.horario}. Pedidos pelo WhatsApp ${site.telefoneDisplay}.
Bairros atendidos: ${site.bairrosAtendidos.join(', ')}.
Pedidos com no mínimo 3 dias úteis de antecedência; confirmação mediante pagamento de 30% do valor. Não fazemos entregas (retirada no local ou Uber/99 por conta do cliente).

## Produtos

${linhas.join('\n')}

## Links

- [Site](${site.url}/)
- [Instagram](${site.social.instagram})
- [Facebook](${site.social.facebook})
- [TikTok](${site.social.tiktok})
- [Google Maps](${site.endereco.mapsUrl})
`;
}

// ---------- Escrita dos arquivos ----------
function writeFile(relPath, content) {
  const full = path.join(ROOT, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('✔', relPath);
}

writeFile('index.html', renderHome());
writeFile('bolos/index.html', renderBolos(bolos, 'bolos'));
writeFile('bolos-retangulares/index.html', renderBolos(bolosRetangulares, 'bolos-retangulares'));
writeFile('bento-cake/index.html', renderBentoCake());
writeFile('doces/index.html', renderDoces());
for (const data of paginasSimples) {
  writeFile(`${data.slug}/index.html`, renderSimples(data));
}
writeFile('sitemap.xml', renderSitemap());
writeFile('llms.txt', renderLlms());
writeFile('404.html', render404());

console.log('\nSite gerado com sucesso! Páginas: /, ' + produtos.map((p) => '/' + p.url).join(', ') + ', /404.html');
