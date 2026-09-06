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
const DIST = path.join(ROOT, 'dist');

const PUBLIC_DIRECTORIES = ['css', 'js', 'assets'];
const PUBLIC_FILES = [
  'manifest.json',
  'browserconfig.xml',
  'favicon.ico',
  'favicon-v2.ico',
  'favicon-v2.svg',
  'favicon-v2-96x96.png',
  'robots.txt',
  'CNAME'
];

function prepareDist() {
  const expectedDist = path.join(ROOT, 'dist');
  if (DIST !== expectedDist || path.basename(DIST) !== 'dist' || path.dirname(DIST) !== ROOT) {
    throw new Error(`Caminho de build inseguro: ${DIST}`);
  }

  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
}

function copyPublicDirectory(relPath) {
  const source = path.join(ROOT, relPath);
  const destination = path.join(DIST, relPath);
  if (!fs.existsSync(source)) throw new Error(`Recurso público não encontrado: ${relPath}`);
  fs.cpSync(source, destination, { recursive: true });
  console.log('✔', `${relPath}/`);
}

function copyPublicFile(relPath) {
  const source = path.join(ROOT, relPath);
  const destination = path.join(DIST, relPath);
  if (!fs.existsSync(source)) throw new Error(`Arquivo público não encontrado: ${relPath}`);
  fs.copyFileSync(source, destination);
  console.log('✔', relPath);
}

prepareDist();

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
const topoBolo = bolos.acrescimos.find((a) => a.nome === 'Topos de bolo');
const outrosAcrescimos = bolos.acrescimos.filter((a) => a !== topoBolo);
const outrosAcrescimosBento = outrosAcrescimos.filter((a) => a.nome !== 'Brigadeiros');
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

const temPrecoPorTamanho = (t) => Boolean(t.pesoKg || t.precoReferencia);

/** Calcula o preço de um tamanho, permitindo que um formato reutilize outro. */
const precoTamanhoCalculado = (data, r, t) => {
  const referenciaP = bolos.tamanhos.find((tamanho) => tamanho.id === 'P');
  const faixaP = round9(r.precoKg * (referenciaP?.pesoKg || 1));
  const precosDaPagina = data.precosPorFaixaP?.[faixaP];
  if (precosDaPagina?.[t.nome] != null) return precosDaPagina[t.nome];
  if (t.precoReferencia) {
    const precoReferencia = precosDaPagina?.[t.precoReferencia]
      ?? bolos.precosPorFaixaP?.[faixaP]?.[t.precoReferencia];
    if (precoReferencia != null) return precoReferencia;
    const referencia = bolos.tamanhos.find((tamanho) => tamanho.id === t.precoReferencia);
    return round9(r.precoKg * (referencia?.pesoKg || t.pesoKg || 1));
  }
  return round9(r.precoKg * (t.pesoKg || 0) * (data.fatorPreco || 1));
};

/** Menor preço de bolo por tamanho, calculado de precoKg x pesoKg. */
const minPorTamanho = {};
for (const t of bolos.tamanhos.filter((t) => t.pesoKg)) {
  minPorTamanho[t.id] = Math.min(...bolos.recheios.map((r) => {
    return precoTamanhoCalculado(bolos, r, t);
  }));
}
const minPorTamanhoRetangular = {};
for (const t of bolosRetangulares.tamanhos.filter(temPrecoPorTamanho)) {
  minPorTamanhoRetangular[t.id] = Math.min(...bolos.recheios.map((r) => {
    return precoTamanhoCalculado(bolosRetangulares, r, t);
  }));
}
const bentoPreco = (bolos.tamanhos.find((t) => t.id === 'bento') || {}).precoFixo || 39;

const formatosBolo = [
  {
    id: 'redondo',
    titulo: 'Redondo',
    descricao: 'Do P ao GG, o formato clássico para aniversários e celebrações.',
    fatiasResumo: '10 a 48 fatias',
    icone: 'fa-circle',
    imagem: 'assets/images/formatos/bolo-redondo.svg',
    imagemAlt: 'Imagem ilustrativa de um bolo redondo',
    data: bolos,
    tamanhos: bolos.tamanhos.filter((t) => t.pesoKg),
    minimos: minPorTamanho,
    notaTamanhos: bolos.notaTamanhos,
    colunaMedida: 'Diâmetro'
  },
  {
    id: 'retangular',
    titulo: 'Retangular',
    descricao: '17x25cm ou 22x30cm.',
    fatiasResumo: '24 a 44 fatias',
    icone: 'fa-square',
    imagem: 'assets/images/formatos/bolo-retangular.svg',
    imagemAlt: 'Imagem ilustrativa de um bolo retangular',
    data: bolosRetangulares,
    tamanhos: bolosRetangulares.tamanhos.filter((t) => t.id !== 'coracao'),
    minimos: minPorTamanhoRetangular,
    notaTamanhos: bolosRetangulares.notaTamanhos,
    colunaMedida: 'Medidas'
  },
  {
    id: 'coracao',
    titulo: 'Coração',
    descricao: 'Formato especial para celebrar.',
    fatiasResumo: '10 a 14 fatias',
    icone: 'fa-heart',
    imagem: 'assets/images/formatos/bolo-coracao.svg',
    imagemAlt: 'Imagem ilustrativa de um bolo em formato de coração',
    data: bolosRetangulares,
    tamanhos: bolosRetangulares.tamanhos.filter((t) => t.id === 'coracao'),
    minimos: minPorTamanhoRetangular,
    notaTamanhos: bolosRetangulares.notaTamanhos,
    colunaMedida: 'Medidas'
  }
];

const precoMinimoFormato = (formato) => Math.min(...formato.tamanhos.map((t) => formato.minimos[t.id]));
const precoMaximoFormato = (formato) => Math.max(...formato.tamanhos.map((t) => {
  return Math.max(...bolos.recheios.map((r) => precoTamanhoCalculado(formato.data, r, t)));
}));
const minBolosPersonalizados = Math.min(...formatosBolo.map(precoMinimoFormato));
const maxBolosPersonalizados = Math.max(...formatosBolo.map(precoMaximoFormato));
const boloUnificado = {
  slug: 'bolos',
  titulo: 'Bolos personalizados',
  tituloVisivel: 'Bolos de aniversário personalizados',
  tituloCompleto: 'Bolos de aniversário personalizados para cada comemoração',
  subtitulo: bolos.subtitulo,
  imagem: bolos.imagem,
  precoDestaque: `A partir de ${money(minBolosPersonalizados)}`,
  mensagemWhatsApp: 'Olá! Quero encomendar um bolo personalizado. Podem me ajudar a escolher o formato e montar?'
};

const nomeTamanhoHtml = (t) => t.id === 'coracao'
  ? '<span class="heart-size-name"><span class="sr-only">Coração</span><i class="fa-solid fa-heart heart-size-icon" aria-hidden="true"></i></span>'
  : esc(t.nome);

/** Junta lista em texto humano: "a, b, c e d". */
const joinHuman = (items) => items.length > 1
  ? items.slice(0, -1).join(', ') + ' e ' + items[items.length - 1]
  : (items[0] || '');

/** Resposta da FAQ de preços de bolo, sempre sincronizada com as tabelas calculadas. */
function faqPrecoBolos(comTabela) {
  const iniciaisPorFormato = formatosBolo.map((formato) => `${money(precoMinimoFormato(formato))} no formato ${formato.titulo.toLowerCase()}`);
  const base = `Na ${site.nome}, o bentô cake de 10cm custa a partir de ${money(bentoPreco)}. Os bolos personalizados custam de ${money(minBolosPersonalizados)} a ${money(maxBolosPersonalizados)}; os preços começam em ${joinHuman(iniciaisPorFormato)}. O valor final varia conforme o tamanho e o recheio; ganache e decoração podem ter acréscimo.`;
  return comTabela ? base + ' Veja todos os formatos e preços na página de Bolos personalizados.' : base;
}

/** Resposta curta sobre formatos, tamanhos e rendimento dos bolos. */
function faqFormatosBolos() {
  const formatos = formatosBolo.map((formato) => {
    const medidas = formato.tamanhos.map((t) => t.diametro);
    if (formato.id === 'coracao') return `em formato de coração (${formato.fatiasResumo})`;
    const nome = formato.id === 'redondo' ? 'redondos' : 'retangulares';
    return `${nome} de ${joinHuman(medidas)} (${formato.fatiasResumo})`;
  });
  return `Estão disponíveis bolos ${joinHuman(formatos)}. O número de fatias é uma estimativa e pode variar conforme o corte.`;
}

const waHref = (msg) => `https://wa.me/${site.whatsappNumero}?text=${encodeURIComponent(msg || site.mensagemPadrao)}`;

const waIcon = '<i class="fa-brands fa-whatsapp" aria-hidden="true"></i>';

/** Superfícies de conteúdo: alternância neutra definida pelo guia de UX. */
const surface = (tone) => tone === 'dark' ? 'section-surface-dark' : 'section-surface-light';

/** Extrai o primeiro número de um texto de preço ("A partir de R$ 5" -> 5). */
const primeiroNumero = (texto) => {
  const m = String(texto).replace(/\./g, '').replace(',', '.').match(/(\d+(\.\d+)?)/);
  return m ? Number(m[1]) : null;
};

// ---------- SEO por página ----------
const SEO = {
  home: {
    title: 'Basilio Bolos | Confeitaria em Santo André',
    description: 'Bolos de aniversário e doces sob encomenda no Parque das Nações, em Santo André, perto de Santa Terezinha e Vila Curuçá. Peça pelo WhatsApp!'
  },
  bolos: {
    title: 'Bolos de Aniversário em Santo André | Basilio Bolos',
    description: `Bolos de aniversário em Santo André: formatos redondo, coração e retangular, com ${bolos.recheios.length} sabores, ${bolos.massas.length} massas e cobertura de chantilly ou ganache. Peça pelo WhatsApp!`
  },
  'bento-cake': {
    title: 'Bentô Cake em Santo André | Basilio Bolos',
    description: `Bentô cake em Santo André a partir de R$ ${bentoPreco}: bolo individual de 10cm, com ${bolos.recheiosBento.length} sabores e decoração personalizada. Peça pelo WhatsApp!`
  },
  doces: {
    title: 'Doces para Festa em Santo André | Basilio Bolos',
    description: 'Doces para festa em Santo André: cento a partir de R$ 189 e doces premium a partir de R$ 3,20. Escolha os sabores e peça pelo WhatsApp.'
  },
  biscoitos: {
    title: 'Biscoitos Decorados em Santo André | Basilio Bolos',
    description: 'Biscoitos decorados em Santo André a partir de R$ 4: unidades, caixas e lembrancinhas personalizadas para sua festa.'
  },
  cupcakes: {
    title: 'Cupcakes Decorados em Santo André | Basilio Bolos',
    description: 'Cupcakes recheados e decorados em Santo André: unidade R$ 13 ou caixa com 2 por R$ 24. Personalize o tema e encomende pelo WhatsApp!'
  },
  brownies: {
    title: 'Brownies Artesanais em Santo André | Basilio Bolos',
    description: 'Brownies artesanais em Santo André: marmitinhas a partir de R$ 12 e caixa de bites por R$ 48. Encomende pelo WhatsApp!'
  },
  'pipoca-gourmet': {
    title: 'Pipoca Gourmet em Santo André | Basilio Bolos',
    description: 'Pipoca gourmet em Santo André a partir de R$ 15 (100g), nos sabores chocolate e leite ninho. Pacotes de até 500g e versões para lembrancinhas.'
  },
  'bolo-de-pote': {
    title: 'Bolo de Pote em Santo André | Basilio Bolos',
    description: 'Bolo de pote em Santo André a partir de R$ 15 (250ml), nos sabores brigadeiro, ninho com morango, prestígio, maracujá e trufado.'
  }
};

// ---------- Componentes de layout ----------
function head({ seo, canonical, jsonLd, ogType = 'website', robots = 'index, follow', usaSwiper = false }) {
  const ogImage = `${site.url}/assets/images/hero/hero.jpeg`;
  // </script> não é escapado por JSON.stringify; < vira < (válido em JSON, seguro em script)
  const safeLd = (obj) => JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');
  const ldScripts = (jsonLd || []).map((obj) => `  <script type="application/ld+json">\n${safeLd(obj).split('\n').map((l) => '  ' + l).join('\n')}\n  </script>`).join('\n');
  const swiperCss = usaSwiper ? '\n  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">' : '';
  return `<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(seo.title)}</title>
  <meta name="description" content="${esc(seo.description)}" />
  <meta name="robots" content="${esc(robots)}" />
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
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1002" />
  <meta property="og:image:height" content="991" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(seo.title)}" />
  <meta name="twitter:description" content="${esc(seo.description)}" />
  <meta name="twitter:image" content="${ogImage}" />
  <meta name="twitter:image:alt" content="Seleção de bolos e doces artesanais ${esc(site.nome)}" />
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

  <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700;800&family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />${swiperCss}
  <link rel="stylesheet" href="/css/styles.css">
${ldScripts}
</head>`;
}

function navbar(active) {
  const isProductPage = produtos.some((p) => p.slug === active);
  const item = (href, label, slug) => `
          <li class="nav-item">
            <a class="nav-link${slug && active === slug ? ' active' : ''}" href="${href}"${slug && active === slug ? ' aria-current="page"' : ''}>${label}</a>
          </li>`;
  const dropdownItems = produtos.map((p) => `
              <li><a class="dropdown-item${active === p.slug ? ' active' : ''}" href="/${esc(p.url)}"${active === p.slug ? ' aria-current="page"' : ''}>${esc(p.titulo)}</a></li>`).join('');
  return `
  <nav id="mainNav" class="navbar navbar-expand-lg navbar-light fixed-top navbar-glass" aria-label="Navegação principal">
    <div class="container">
      <a class="navbar-brand fw-bold d-flex align-items-center gap-2" href="/">
        <img src="/assets/images/brand/logo.jpeg" alt="Logo ${esc(site.nome)}" class="brand-icon" width="34" height="34" loading="eager" decoding="async">
        <span class="brand-text">${esc(site.nome)}</span>
      </a>
      <button class="navbar-toggler border-0" type="button" data-menu-toggle
              aria-controls="navbarContent" aria-expanded="false" aria-label="Abrir menu">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="navbar-collapse" id="navbarContent" data-menu-panel>
        <ul class="navbar-nav ms-auto mb-2 mb-lg-0 align-items-lg-center gap-lg-1">${item('/#hero', '<i class="fa-solid fa-home" aria-hidden="true"></i> Início', active === 'home' ? 'home' : null)}
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle${isProductPage ? ' active' : ''}" href="/#produtos" id="produtosDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
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
      <div class="footer-note">
        <span>© <span id="anoAtual">2026</span> ${esc(site.nome)} · Confeitaria artesanal em Santo André/SP</span>
        <span class="footer-legal-links">
          <a href="/privacidade/">Privacidade e cookies</a>
          <button type="button" class="footer-privacy-button" data-privacy-settings>Preferências de cookies</button>
        </span>
      </div>
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

function privacyBanner() {
  return `
  <aside class="privacy-banner" data-privacy-banner aria-labelledby="privacy-banner-title" aria-describedby="privacy-banner-description" aria-hidden="true" hidden>
    <div class="privacy-banner-inner">
      <div class="privacy-banner-copy">
        <p id="privacy-banner-title" class="privacy-banner-title">Cookies</p>
        <p id="privacy-banner-description">Usamos cookies. <a href="/privacidade/">Saiba mais</a>.</p>
      </div>
      <div class="privacy-banner-actions">
        <button type="button" class="btn privacy-button privacy-button-secondary" data-privacy-reject>Recusar cookies</button>
        <button type="button" class="btn privacy-button privacy-button-primary" data-privacy-accept>Aceitar cookies</button>
      </div>
    </div>
  </aside>`;
}

function layout({ seo, canonical, active, jsonLd, body, usaSwiper = false, ogType = active === 'home' ? 'website' : 'product', robots = 'index, follow', minimal = false }) {
  return `<!doctype html>
<html lang="pt-BR">
${head({ seo, canonical, jsonLd, ogType, robots, usaSwiper })}
<body>
  <a class="skip-link" href="#conteudoPrincipal">Pular para o conteúdo principal</a>
${navbar(active)}
  <main id="conteudoPrincipal" tabindex="-1">
${body}
  </main>
${minimal ? '' : footer()}
${minimal ? '' : waFloat()}
${minimal ? '' : privacyBanner()}
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
  const tituloHero = data.tituloVisivel || data.tituloCompleto;
  const heroCtaLabel = data.slug === 'bolos' ? 'Pedir pelo WhatsApp' : 'Encomendar pelo WhatsApp';
  const boloOrderAttrs = data.slug === 'bolos'
    ? ` data-bolo-order data-bolo-order-base="${esc(data.mensagemWhatsApp)}"`
    : '';
  return `
    <header class="page-hero page-hero--with-image" style="--hero-image:url('/${esc(data.imagem)}')">
      <div class="container">
        ${breadcrumb([{ nome: 'Início', url: '/' }, { nome: data.titulo }])}
        <div class="row align-items-center g-4">
          <div class="col-lg-7">
            <h1 class="page-hero-title">${esc(tituloHero)}</h1>
            <p class="page-hero-subtitle">${esc(data.subtitulo)}</p>
            <p class="page-hero-price">${esc(data.precoDestaque)}</p>
            <div class="d-flex flex-wrap gap-3 mt-3">
              <a href="${waHref(data.mensagemWhatsApp)}" class="btn btn-lg btn-whatsapp page-hero-btn-secondary" target="_blank" rel="noopener" data-track="hero"${boloOrderAttrs}>
                ${waIcon} ${heroCtaLabel}
              </a>
            </div>
          </div>
          <div class="col-lg-5 text-center">
            <div class="page-hero-image">
              <img src="/${esc(data.imagem)}" alt="${esc(tituloHero)} em Santo André - ${esc(site.nome)}" loading="eager" fetchpriority="high" decoding="async" width="600" height="600">
            </div>
          </div>
        </div>
      </div>
    </header>`;
}

function ctaBand(data) {
  const ctaTitle = data.slug === 'bolos'
    ? 'Peça seu bolo'
    : `Pronto para encomendar ${data.titulo.toLowerCase()}?`;
  const ctaText = data.slug === 'bolos'
    ? 'Retirada em Santo André.'
    : 'Atendemos Santo André e região com retirada no local.';
  const boloOrderAttrs = data.slug === 'bolos'
    ? ` data-bolo-order data-bolo-order-base="${esc(data.mensagemWhatsApp)}"`
    : '';
  return `
    <section class="cta-band" aria-label="Faça sua encomenda">
      <div class="container text-center">
        <h2 class="cta-band-title">${esc(ctaTitle)}</h2>
        <p class="cta-band-text">${esc(ctaText)}</p>
        <a href="${waHref(data.mensagemWhatsApp)}" class="btn btn-lg cta-band-btn" target="_blank" rel="noopener" data-track="cta-band"${boloOrderAttrs}>
          ${waIcon} Pedir pelo WhatsApp
        </a>
      </div>
    </section>`;
}

function topoBoloSection({ compact = false, tone = 'dark' } = {}) {
  if (!topoBolo) return '';
  const sectionClass = ' section-topo';
  const titulo = compact ? 'Topo personalizado' : 'Topo de bolo personalizado';
  const status = compact ? 'À parte' : 'Cobrado à parte';
  const nota = compact
    ? `${topoBolo.preco} · conforme modelo e tema.`
    : `${topoBolo.preco}, conforme o modelo e o tema.`;
  return `
    <section class="py-5 ${surface(tone)}${sectionClass}" aria-labelledby="topo-bolo-title">
      <div class="container">
        <div class="section-header text-center mb-4">
          <h2 id="topo-bolo-title" class="section-badge-title">Topo de bolo</h2>
        </div>
        <div class="topo-bolo-destaque" role="note" aria-label="Topo de bolo cobrado à parte">
          <div class="topo-bolo-destaque-icon"><i class="fa-solid fa-cake-candles" aria-hidden="true"></i></div>
          <div class="topo-bolo-destaque-content">
            <h3>${titulo}</h3>
            <p class="topo-bolo-destaque-status">${status}</p>
            <p class="topo-bolo-destaque-note">${esc(nota)}</p>
          </div>
        </div>
      </div>
    </section>`;
}

function policiesSection({ tone = 'dark' } = {}) {
  const p = site.politicas;
  const items = [
    { icon: 'fa-calendar-check', titulo: 'Antecedência', texto: p.antecedencia },
    { icon: 'fa-circle-check', titulo: 'Confirmação', texto: p.confirmacao },
    { icon: 'fa-money-bill-wave', titulo: 'Pagamento', texto: p.pagamento },
    { icon: 'fa-bag-shopping', titulo: 'Retirada', texto: p.retirada }
  ];
  return `
    <section class="py-5 ${surface(tone)} section-policies" aria-labelledby="info-title">
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

function sliceSuggestionsSection() {
  const sugestoes = [
    {
      nome: 'Redondo P',
      fatias: '10 a 12 fatias',
      imagem: 'assets/images/slice-sugestions/redondo-p.svg',
      alt: 'Sugestão visual de corte para bolo redondo P'
    },
    {
      nome: 'Redondo M',
      fatias: '18 a 22 fatias',
      imagem: 'assets/images/slice-sugestions/redondo-m.svg',
      alt: 'Sugestão visual de corte para bolo redondo M'
    },
    {
      nome: 'Redondo G',
      fatias: '28 a 34 fatias',
      imagem: 'assets/images/slice-sugestions/redondo-g.svg',
      alt: 'Sugestão visual de corte para bolo redondo G'
    },
    {
      nome: 'Redondo GG',
      fatias: '40 a 48 fatias',
      imagem: 'assets/images/slice-sugestions/redondo-gg.svg',
      alt: 'Sugestão visual de corte para bolo redondo GG'
    },
    {
      nome: 'Retangular G',
      fatias: '24 a 28 fatias',
      imagem: 'assets/images/slice-sugestions/retangular-g.svg',
      alt: 'Sugestão visual de corte para bolo retangular G'
    },
    {
      nome: 'Retangular GG',
      fatias: '38 a 44 fatias',
      imagem: 'assets/images/slice-sugestions/retangular-gg.svg',
      alt: 'Sugestão visual de corte para bolo retangular GG'
    },
    {
      nome: 'Coração',
      fatias: '10 a 14 fatias',
      imagem: 'assets/images/slice-sugestions/coracao.svg',
      alt: 'Sugestão visual de corte para bolo em formato de coração'
    }
  ];

  return `
    <section class="py-5 ${surface('light')} section-slice-suggestions" aria-labelledby="cortes-title">
      <div class="container">
        <div class="section-header text-center mb-4">
          <h2 id="cortes-title" class="section-badge-title">Sugestões de corte</h2>
          <p class="mx-auto section-support">Uma referência visual para aproveitar cada pedaço. O rendimento pode variar conforme o corte.</p>
        </div>
        <div class="slice-suggestions-grid">
          ${sugestoes.map((sugestao) => `
          <article class="slice-suggestion-card">
            <div class="slice-suggestion-visual">
              <img src="/${esc(sugestao.imagem)}" alt="${esc(sugestao.alt)}" width="1000" height="680" loading="lazy" decoding="async">
            </div>
            <div class="slice-suggestion-copy">
              <h3>${esc(sugestao.nome)}</h3>
              <span>${esc(sugestao.fatias)}</span>
            </div>
          </article>`).join('')}
        </div>
      </div>
    </section>`;
}

function faqSection(faq, { tone = 'light' } = {}) {
  if (!faq || !faq.length) return '';
  return `
    <section class="py-5 ${surface(tone)} section-faq" aria-labelledby="faq-title">
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

function relatedSection(currentSlug, { tone = 'dark' } = {}) {
  const outros = (recomendacoes[currentSlug] || [])
    .map((slug) => produtoPorSlug.get(slug))
    .filter((p) => p && p.slug !== currentSlug)
    .slice(0, 4);
  const listaId = `lista-relacionados-${currentSlug}`;
  const relacionadosIniciais = outros.slice(0, 3);
  const relacionadosRestantes = outros.slice(3);
  const compactCards = currentSlug !== 'bolos';
  return `
    <section class="py-5 ${surface(tone)} section-related" aria-labelledby="rel-title">
      <div class="container">
        <div class="section-header text-center mb-4">
          <h2 id="rel-title" class="section-badge-title">Você também vai gostar</h2>
        </div>
        <div id="${esc(listaId)}" class="prod-grid" data-lista-relacionados>
          ${relacionadosIniciais.map((p) => prodCard(p, { compact: compactCards })).join('\n          ')}
          ${relacionadosRestantes.map((p) => prodCard(p, { extra: true, compact: compactCards })).join('\n          ')}
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

function prodCard(p, { extra = false, compact = false } = {}) {
  const descricao = compact ? (p.descricaoCurta || p.descricao) : p.descricao;
  return `<a class="prod-card${extra ? ' produto-extra' : ''}"${extra ? ' data-produto-extra hidden' : ''} href="/${esc(p.url)}">
            <div class="prod-card-image" style="--media-image:url(/${esc(p.imagem)})">
              <img src="/${esc(p.imagem)}" alt="${esc(p.titulo)} em Santo André - ${esc(site.nome)}" loading="lazy" decoding="async" width="400" height="300">
            </div>
            <div class="prod-card-body">
              <h3>${esc(p.titulo)}</h3>
              <p class="prod-card-desc">${esc(descricao)}</p>
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
    image: [`${site.url}/assets/images/hero/hero.jpeg`],
    description: site.descricao,
    telephone: `+${site.whatsappNumero}`,
    contactPoint: [{
      '@type': 'ContactPoint',
      telephone: `+${site.whatsappNumero}`,
      contactType: 'customer service',
      availableLanguage: ['Portuguese']
    }],
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
    sameAs: [site.social.instagram, site.social.facebook, site.social.tiktok],
    servesCuisine: 'Confeitaria'
  };
}

function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${site.url}/#website`,
    url: `${site.url}/`,
    name: site.nome,
    description: site.descricao,
    inLanguage: 'pt-BR',
    publisher: { '@id': `${site.url}/#organization` }
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
  const productUrl = `${site.url}/${url}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    name: `${data.tituloCompleto} | ${site.nome}`,
    description: data.subtitulo,
    url: productUrl,
    image: [`${site.url}/${data.imagem}`],
    brand: { '@type': 'Brand', name: site.nome },
    category: 'Confeitaria',
    offers: {
      '@type': 'AggregateOffer',
      url: productUrl,
      priceCurrency: 'BRL',
      lowPrice: lowPrice,
      highPrice: highPrice,
      offerCount: extra.offerCount || 4,
      seller: { '@id': `${site.url}/#organization` },
      areaServed: { '@type': 'City', name: 'Santo André' }
    },
    ...extra.props
  };
}

// ---------- Página inicial ----------
function renderHome() {
  const faqHome = [
    { q: 'Onde fica a Basilio Bolos e quais bairros de Santo André vocês atendem?', a: `A ${site.nome} fica na ${site.endereco.rua} - ${site.endereco.bairro}, ${site.endereco.cidade}/${site.endereco.uf}. Atendemos principalmente ${site.bairrosAtendidos.join(', ')} e toda a região do ABC.` },
    { q: 'Como encomendar um bolo ou doce em Santo André?', a: `Peça pelo WhatsApp informando o produto, a quantidade ou o tamanho e a data do evento. Trabalhamos sob encomenda com pelo menos 3 dias úteis de antecedência; enviamos o orçamento e confirmamos a disponibilidade.` },
    { q: 'Vocês fazem bolos, doces e lembrancinhas personalizados para festas?', a: 'Sim. A Basilio Bolos personaliza bolos, doces, biscoitos, cupcakes, pipoca gourmet e kits conforme o tema. Envie a referência, a quantidade e a data pelo WhatsApp para receber uma proposta.' },
    { q: 'A Basilio Bolos tem loja física ou faz entrega em Santo André?', a: `Não temos loja aberta ao público nem fazemos entregas próprias. A retirada é feita na ${site.endereco.rua} - ${site.endereco.bairro}, ${site.endereco.cidade}/${site.endereco.uf}, com horário marcado; também é possível enviar Uber/99 por conta e responsabilidade do cliente.` },
    { q: 'Quanto custa um bolo de aniversário na Basilio Bolos?', a: faqPrecoBolos(true) }
  ];

  const campanhaAtiva = campanha && campanha.ativo && Array.isArray(campanha.produtos) && campanha.produtos.length;
  const produtosIniciais = produtos.slice(0, 8);
  const produtosRestantes = produtos.slice(8);

  const campanhaSection = campanhaAtiva ? `
    <section id="campanhas" class="py-5 ${surface('light')} section-campaign" aria-labelledby="campanha-title">
      <div class="container">
        <div class="section-header">
          <p class="section-eyebrow">Campanha em destaque</p>
          <h2 id="campanha-title" class="mb-3">${esc(campanha.campanha)}</h2>
          <p class="mb-4 section-support">${esc(campanha.descricao)}</p>
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
                          <img src="/${esc(prod.imagem)}" alt="${esc(prod.titulo)}" loading="lazy" decoding="async" width="400" height="240">
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
            <p class="hero-subtitle">${esc(site.slogan)} · Bolos de aniversário e confeitaria artesanal em Santo André/SP</p>
            <div class="hero-cta-stack">
              <a href="${waHref()}" class="btn btn-lg hero-cta-primary" target="_blank" rel="noopener" data-track="hero">
                ${waIcon} Fazer Pedido
              </a>
              <a href="#produtos" class="btn btn-lg hero-cta-secondary">Ver Produtos</a>
            </div>
          </div>
          <div class="col-lg-6 hero-visual-wrapper">
            <div class="hero-visual" aria-hidden="true">
              <img src="/assets/images/hero/hero-circle.png" alt="" loading="eager" fetchpriority="high" decoding="async" width="502" height="497">
            </div>
          </div>
        </div>
      </div>
      <div class="hero-decoration"></div>
    </header>
${campanhaSection}
    <section id="produtos" class="py-5 ${surface(campanhaAtiva ? 'dark' : 'light')}">
      <div class="container">
        <div class="section-header text-center mb-5">
          <h2 class="section-badge-title">Nossos Produtos</h2>
          <p class="mb-4 lead mx-auto section-support">
            Escolha um produto para consultar opções, preços e condições de encomenda.
          </p>
        </div>
        <div id="lista-produtos" class="prod-grid">
          ${produtosIniciais.map((p) => prodCard(p, { compact: true })).join('\n          ')}
${produtosRestantes.length ? `          ${produtosRestantes.map((p) => prodCard(p, { extra: true, compact: true })).join('\n          ')}` : ''}
        </div>${produtosRestantes.length ? `
        <div class="text-center mt-4">
          <button type="button" class="btn btn-lg page-hero-btn-secondary" data-ver-mais-produtos hidden aria-controls="lista-produtos" aria-expanded="false">
            Ver mais produtos <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
          </button>
        </div>` : ''}
      </div>
    </section>

    <section id="sobre" class="py-5 ${surface(campanhaAtiva ? 'light' : 'dark')}">
      <div class="container sobre-container">
        <div class="section-header text-center mb-5">
          <h2 class="section-badge-title">Nossa História</h2>
        </div>
        <div class="row align-items-center g-5 sobre-grid">
          <div class="col-lg-5 text-center sobre-image">
            <div class="image-frame">
              <img src="/assets/images/sobre/fundadoras.jpeg" class="img-fluid" alt="Fundadoras da ${esc(site.nome)}, confeitaria artesanal de Santo André" width="1024" height="1024" loading="lazy" decoding="async">
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
${faqSection(faqHome, { tone: campanhaAtiva ? 'dark' : 'light' })}

    <section id="contato" class="py-5 section-cta-contact" aria-labelledby="contato-title">
      <div class="container">
        <div class="section-header text-center mb-5">
          <h2 id="contato-title" class="section-badge-title-dark">Fale com a gente</h2>
          <p class="lead text-center mx-auto section-support">
            Escolha um canal para tirar dúvidas ou fazer sua encomenda.
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
             <h3 class="h5 contact-address-title">
               <i class="fa-solid fa-map-marker-alt" aria-hidden="true"></i> Nosso Endereço
             </h3>
             <p class="contact-address-text">
               ${esc(site.endereco.rua)} <span class="d-none d-md-inline">·</span><br class="d-md-none"> ${esc(site.endereco.bairro)}<br>
               ${esc(site.endereco.cidade)}/${esc(site.endereco.uf)} · CEP ${esc(site.endereco.cep)}
             </p>
             <p class="contact-address-hours">
               <i class="fa-regular fa-clock" aria-hidden="true"></i> ${esc(site.horario)}
            </p>
          </address>
        </div>
      </div>
    </section>`;

  const jsonLd = [
    localBusinessLd(),
    websiteLd(),
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

// ---------- Página unificada de Bolos ----------
function renderBolos(initialFormat = 'redondo') {
  const formatoInicial = formatosBolo.some((formato) => formato.id === initialFormat) ? initialFormat : 'redondo';
  const url = 'bolos/';

  const renderFormatoPanel = (formato) => {
    const linhasRecheios = bolos.recheios.map((r) => {
      const celulas = formato.tamanhos.map((t) => `<td data-label="${esc(t.id === 'coracao' ? 'Coração' : t.nome)}">${money(precoTamanhoCalculado(formato.data, r, t))}</td>`).join('');
      return `
              <tr>
                <th scope="row">
                  <span class="recheio-nome">${esc(r.nome)}</span>
                  <span class="recheio-desc">${esc(r.descricao)}</span>
                </th>
                ${celulas}
              </tr>`;
    }).join('');

    const tabelaTamanhos = `            <div class="table-responsive">
              <table class="price-table price-table-sizes">
                <caption class="sr-only">Tamanhos de bolo por ${esc(formato.colunaMedida.toLowerCase())} e quantidade de fatias</caption>
                <thead>
                  <tr>
                    <th scope="col">Tamanho</th>
                    <th scope="col">${esc(formato.colunaMedida)}</th>
                    <th scope="col">Fatias</th>
                  </tr>
                </thead>
                <tbody>
                  ${formato.tamanhos.map((t) => `                  <tr>
                    <th scope="row">${nomeTamanhoHtml(t)}${t.obs ? `<span class="recheio-desc">${esc(t.obs)}</span>` : ''}</th>
                    <td data-label="${esc(formato.colunaMedida)}">${esc(t.diametro)}</td>
                    <td data-label="Fatias">${esc(t.fatias)}</td>
                  </tr>`).join('\n')}
                </tbody>
              </table>
            </div>`;

    const coberturas = formato.data.coberturas || bolos.coberturas;
    const ganache = coberturas.find((c) => c.nome === 'Ganache');
    const ganacheTiers = Object.entries(ganache?.acrescimoPorTamanho || {})
      .filter(([tam]) => formato.tamanhos.some((t) => t.id === tam))
      .map(([tam, valor]) => {
        const tamanho = formato.tamanhos.find((t) => t.id === tam);
        const nomeTamanho = formato.id === 'redondo'
          ? tamanho.nome
          : tamanho.id === 'coracao' ? 'Coração' : tamanho.diametro;
        return `<span class="tier-badge"><span class="tier-size">${esc(nomeTamanho)}</span><span class="tier-price">+ ${money(valor)}</span></span>`;
      }).join('\n                    ');

    const coberturaSection = `          <div class="bolo-panel-section bolo-panel-section--coverage">
            <div class="bolo-panel-section-heading">
              <h4>Coberturas</h4>
              <p>Chantilly sem acréscimo; ganache com acréscimo.</p>
            </div>
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
          </div>`;

    return `<div id="painel-formato-${esc(formato.id)}" class="bolo-formato-panel" role="tabpanel" aria-labelledby="botao-formato-${esc(formato.id)}" data-formato-panel="${esc(formato.id)}">
          <div class="bolo-formato-panel-head">
            <h3 class="bolo-formato-panel-title">
              <span class="bolo-formato-panel-icon bolo-formato-panel-icon--${esc(formato.id)}" aria-hidden="true"><i class="fa-solid ${esc(formato.icone)}"></i></span>
              <span>Bolo ${esc(formato.titulo.toLowerCase())}</span>
            </h3>
          </div>

          <div class="bolo-panel-section">
            <div class="bolo-panel-section-heading">
              <h4>Tamanhos e fatias</h4>
              <p>${esc(formato.notaTamanhos)}</p>
            </div>
            ${tabelaTamanhos}
          </div>

          <div class="bolo-panel-section bolo-panel-section--prices">
            <div class="bolo-panel-section-heading">
              <h4>Sabores e preços</h4>
              <p>O valor varia conforme o tamanho e o recheio.</p>
            </div>
            <div class="table-responsive">
              <table class="price-table price-table-matrix" style="--price-count:${formato.tamanhos.length};">
                <caption class="sr-only">Preço de cada sabor de recheio para bolo ${esc(formato.titulo.toLowerCase())}</caption>
                <thead>
                  <tr>
                    <th scope="col">Recheio</th>
                    ${formato.tamanhos.map((t) => `<th scope="col">${nomeTamanhoHtml(t)} <span class="th-sub">${esc(t.diametro)}</span></th>`).join('\n                    ')}
                  </tr>
                </thead>
                <tbody>${linhasRecheios}
                </tbody>
              </table>
            </div>
          </div>
          ${coberturaSection}
         </div>`;
  };

  const formatoInicialData = formatosBolo.find((formato) => formato.id === formatoInicial) || formatosBolo[0];
  const formatoInicialNome = formatoInicialData.titulo;
  const formatCards = formatosBolo.map((formato) => {
    const selecionado = formato.id === formatoInicial;
    const preco = money(precoMinimoFormato(formato));
    const label = `${formato.titulo}, ${formato.fatiasResumo}, a partir de ${preco}`;
    return `          <button id="botao-formato-${esc(formato.id)}" class="bolo-formato-card${selecionado ? ' is-selected' : ''}" type="button" role="tab" aria-controls="painel-formato-${esc(formato.id)}" aria-selected="${selecionado}" tabindex="${selecionado ? '0' : '-1'}" data-bolo-format="${esc(formato.id)}" data-bolo-format-image="/${esc(formato.imagem)}" data-bolo-format-image-alt="${esc(formato.imagemAlt)}" aria-label="${esc(label)}">
             <span class="bolo-formato-shape bolo-formato-shape--${esc(formato.id)}" aria-hidden="true"><i class="fa-solid ${esc(formato.icone)}"></i></span>
             <span class="bolo-formato-card-copy">
               <strong>${esc(formato.titulo)}</strong>
               <span>${esc(formato.fatiasResumo)}</span>
             </span>
             <span class="bolo-formato-card-price"><span class="bolo-formato-card-price-prefix">A partir de </span>${preco}</span>
           </button>`;
  }).join('\n');

  const faqBolos = [
    { q: 'Quanto custa um bolo personalizado em Santo André?', a: faqPrecoBolos(false) },
    { q: 'Quais formatos e tamanhos de bolo personalizado estão disponíveis?', a: faqFormatosBolos() },
    ...bolos.faq.filter((f) => !/quanto custa/i.test(f.q))
  ];

  const body = `
${pageHero(boloUnificado, SEO.bolos)}

    <section id="formatos" class="py-5 ${surface('light')} section-format-selector" aria-labelledby="formatos-title" data-bolo-format-selector data-initial-format="${esc(formatoInicial)}">
      <div class="container">
        <div class="section-header text-center mb-3">
          <h2 id="formatos-title" class="section-badge-title">Escolha o formato</h2>
          <p class="mx-auto">Compare rendimento e preço.</p>
        </div>
        <div class="bolo-formato-tabs" role="tablist" aria-label="Escolha o formato do bolo">
          ${formatCards}
        </div>
         <aside class="bolo-formato-selection-note" data-bolo-format-status role="status" aria-live="polite">
            <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
            <span><strong>Formato:</strong> <span data-bolo-format-status-name>${esc(formatoInicialNome)}</span></span>
         </aside>
         <figure class="bolo-formato-preview" data-bolo-format-preview>
           <img src="/${esc(formatoInicialData.imagem)}" alt="${esc(formatoInicialData.imagemAlt)}" width="1200" height="720" loading="lazy" decoding="async" data-bolo-format-preview-image>
           <figcaption class="sr-only">Imagem ilustrativa do formato de bolo selecionado.</figcaption>
         </figure>
       </div>
    </section>

    <section id="precos" class="py-5 ${surface('dark')} section-bolo-prices" aria-labelledby="precos-title">
      <div class="container">
        <div class="section-header text-center mb-3">
          <h2 id="precos-title" class="section-badge-title">Tamanhos e preços</h2>
          <p class="mx-auto">O preço varia conforme o recheio.</p>
        </div>
        <div class="bolo-formato-panels">
          ${formatosBolo.map(renderFormatoPanel).join('\n')}
        </div>
      </div>
    </section>

    <section class="py-5 ${surface('light')} section-massas" aria-labelledby="massas-title">
      <div class="container">
        <div class="section-header text-center mb-3">
          <h2 id="massas-title" class="section-badge-title">Escolha a massa</h2>
        </div>
        <div class="massas-coberturas-grid massas-only-grid">
          <div class="mc-card mc-card--compact">
            <div class="massas-pills">
              ${bolos.massas.map((m) => {
                const cls = m.toLowerCase() === 'branca' ? 'massa-pill massa-branca' : 'massa-pill massa-chocolate';
                return `<span class="${cls}">${esc(m)}</span>`;
              }).join('\n              ')}
            </div>
          </div>
        </div>
      </div>
    </section>

${topoBoloSection({ compact: true, tone: 'dark' })}

    <section class="py-5 ${surface('light')} section-addons" aria-labelledby="acrescimos-title">
      <div class="container">
        <div class="section-header text-center mb-3">
          <h2 id="acrescimos-title" class="section-badge-title">Acréscimos e decoração</h2>
          <p class="mx-auto section-support">${esc(bolos.notaAcrescimos)}</p>
        </div>
        <div class="row g-3 justify-content-center">
          ${outrosAcrescimos.map((a) => `
          <div class="col-6 col-md-4 col-lg-3">
            <div class="addon-card">
              <h3>${esc(a.nome)}</h3>
${a.obs ? `              <p class="addon-card-observation">${esc(a.obs)}</p>` : ''}
              <p class="addon-card-price">${esc(a.preco)}</p>
            </div>
          </div>`).join('')}
        </div>
      </div>
    </section>
${sliceSuggestionsSection()}
${policiesSection({ tone: 'dark' })}
${faqSection(faqBolos, { tone: 'light' })}
${ctaBand(boloUnificado)}
${relatedSection('bolos', { tone: 'dark' })}`;

  const jsonLd = [
    localBusinessLd(),
    productLd(boloUnificado, url, minBolosPersonalizados, maxBolosPersonalizados, {
      offerCount: bolos.recheios.length * formatosBolo.length,
      props: { category: 'Bolos personalizados' }
    }),
    faqLd(faqBolos),
    breadcrumbLd(boloUnificado.titulo, url)
  ];

  return layout({ seo: SEO.bolos, canonical: `/${url}`, active: 'bolos', jsonLd, body });
}

// ---------- Página de Bentô Cake ----------
function renderBentoCake() {
  const bento = bolos.tamanhos.find((t) => t.id === 'bento');
  const saboresBento = bolos.recheiosBento;
  const kitsBento = bolos.kitsBento;
  const minBento = Math.min(...saboresBento.map((s) => s.preco));
  const maxBento = Math.max(...saboresBento.map((s) => s.preco));

  const data = {
    slug: 'bento-cake',
    titulo: 'Bentô Cake',
    tituloVisivel: 'Bentô Cake',
    tituloCompleto: 'Bentô Cake em Santo André',
    subtitulo: 'Bolo individual de 10cm, com recheio e decoração personalizados.',
    imagem: 'assets/images/produtos/bento-cake.webp',
    precoDestaque: `A partir de ${money(minBento)}`,
    mensagemWhatsApp: 'Olá! Quero encomendar um bentô cake. Podem me passar as opções?'
  };

  const faqBento = [
    { q: 'Quanto custa um bentô cake em Santo André?', a: `O bentô cake de ${bento.diametro} custa de ${money(minBento)} a ${money(maxBento)}, conforme o recheio. Massa branca ou de chocolate e cobertura de chantilly estão incluídas; decoração e adicionais podem ser cobrados à parte.` },
    { q: 'Quantas pessoas serve um bentô cake e qual é o tamanho?', a: `O bentô cake tem ${bento.diametro} de diâmetro e serve de ${bento.fatias} pessoas. É um bolo individual, indicado para presentes e comemorações pequenas.` }
  ];

  const linhasSabores = saboresBento.map((s) => `
               <tr>
                 <th scope="row">
                   <span class="recheio-nome">${esc(s.nome)}</span>
                   <span class="recheio-desc">${esc(s.descricao)}</span>
                 </th>
                 <td data-label="Valor" class="price-cell">${money(s.preco)}</td>
               </tr>`).join('');

  const body = `
${pageHero(data, SEO['bento-cake'])}

    <section id="precos" class="py-5 ${surface('light')}" aria-labelledby="como-funciona-title">
      <div class="container">
        <div class="section-header text-center mb-4">
          <h2 id="como-funciona-title" class="section-badge-title">Como é o bentô cake</h2>
        </div>
        <div class="row g-4 justify-content-center">
          <div class="col-md-5">
            <div class="info-card">
              <i class="fa-solid fa-ruler-combined" aria-hidden="true"></i>
              <h3>Tamanho</h3>
              <p>${esc(bento.diametro)} de diâmetro; marmitinha com colher.</p>
            </div>
          </div>
          <div class="col-md-5">
            <div class="info-card">
              <i class="fa-solid fa-utensils" aria-hidden="true"></i>
              <h3>Porções</h3>
              <p>Serve de ${esc(bento.fatias)} pessoas.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="py-5 ${surface('dark')}" aria-labelledby="sabores-bento-title">
      <div class="container">
        <div class="section-header text-center mb-4">
          <h2 id="sabores-bento-title" class="section-badge-title">Sabores e preços</h2>
          <p class="mx-auto section-support">Escolha o recheio.</p>
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
        <div class="bento-kit-offer" aria-labelledby="kits-bento-title">
          <div class="bento-kit-offer-heading">
            <span class="bento-kit-eyebrow"><i class="fa-solid fa-gift" aria-hidden="true"></i> Kit presenteável</span>
            <h3 id="kits-bento-title">Transforme em um Presente</h3>
          </div>
          <div class="bento-kit-grid">
${kitsBento.opcoes.map((kit) => `
            <article class="bento-kit-card">
              <div class="bento-kit-card-media" style="--media-image:url(/${esc(kit.imagem)})">
                <img src="/${esc(kit.imagem)}" alt="Imagem ilustrativa do kit ${esc(kit.nome.toLowerCase())}" loading="lazy" decoding="async" width="800" height="800">
              </div>
              <div class="bento-kit-card-body">
                <div class="bento-kit-card-head">
                  <div>
                    <span class="bento-kit-card-kicker">Kit de doces</span>
                    <h4>${esc(kit.nome)}</h4>
                  </div>
                  <span class="bento-kit-price">${esc(kit.preco)}</span>
                </div>
                <p class="bento-kit-card-description">${esc(kit.descricao)}</p>
                <div class="bento-kit-flavors">
                  <span class="bento-kit-flavors-title">Doces disponíveis</span>
                  <ul>
                    ${kitsBento.sabores.map((sabor) => `<li>${esc(sabor)}</li>`).join('\n                    ')}
                  </ul>
                </div>
              </div>
            </article>`).join('')}
          </div>
        </div>
      </div>
    </section>

    <section class="py-5 ${surface('light')}" aria-labelledby="massas-bento-title">
      <div class="container">
        <div class="section-header text-center mb-4">
          <h2 id="massas-bento-title" class="section-badge-title">Massas e coberturas</h2>
        </div>
        <div class="massas-coberturas-grid">
          <div class="mc-card">
            <div class="mc-card-icon"><i class="fa-solid fa-bread-slice"></i></div>
            <h3 class="mc-card-title">Massas</h3>
            <p class="mc-card-sub">Escolha uma opção</p>
            <div class="massas-pills">
              ${bolos.massas.map((m) => {
                const cls = m.toLowerCase() === 'branca' ? 'massa-pill massa-branca' : 'massa-pill massa-chocolate';
                return `<span class="${cls}">${esc(m)}</span>`;
              }).join('\n              ')}
            </div>
          </div>
          <div class="mc-card">
            <div class="mc-card-icon"><i class="fa-solid fa-ice-cream"></i></div>
            <h3 class="mc-card-title">Cobertura</h3>
            <p class="mc-card-sub">Incluída no preço</p>
            <div class="coberturas-list">
              <div class="cobertura-row cobertura-row--free">
                <div class="cobertura-info">
                  <span class="cobertura-nome">Chantilly</span>
                  <span class="cobertura-tag cobertura-tag--free">sem acréscimo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

${topoBoloSection({ tone: 'dark' })}

    <section class="py-5 ${surface('light')}" aria-labelledby="decor-bento-title">
      <div class="container">
        <div class="section-header text-center mb-4">
          <h2 id="decor-bento-title" class="section-badge-title">Decoração e adicionais</h2>
          <p class="mx-auto section-support">Frases, desenhos e tema; adicionais sob consulta.</p>
        </div>
        <div class="row g-3 justify-content-center">
          ${outrosAcrescimosBento.map((a) => `
          <div class="col-6 col-md-4 col-lg-3">
            <div class="addon-card">
              <h3>${esc(a.nome)}</h3>
              <p class="addon-card-price">A consultar</p>
            </div>
          </div>`).join('')}
        </div>
      </div>
    </section>
${policiesSection({ tone: 'dark' })}
${faqSection(faqBento, { tone: 'light' })}
${ctaBand(data)}
${relatedSection('bento-cake', { tone: 'dark' })}`;

  const jsonLd = [
    localBusinessLd(),
    productLd(data, 'bento-cake/', minBento, maxBento, { offerCount: saboresBento.length }),
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
              <img class="menu-item-img" src="/${esc(d.imagem)}" alt="${esc(d.nome)} - ${esc(site.nome)}" loading="lazy" decoding="async" width="72" height="72" onerror="this.closest('.menu-item-media').style.display='none'">
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

    <section id="precos" class="py-5 section-surface-desserts" aria-labelledby="centos-title">
      <div class="container">
        <div class="section-header text-center mb-4">
          <h2 id="centos-title" class="section-badge-title">Doces por cento</h2>
          <p class="mx-auto section-support">${esc(doces.notaCentos)}</p>
        </div>
        <ul class="menu-list">${doces.centos.map((d) => menuItem(d, `${money(d.precoCento)} <small>o cento</small>`)).join('')}
        </ul>
      </div>
    </section>

    <section class="py-5 section-surface-desserts" aria-labelledby="premium-title">
      <div class="container">
        <div class="section-header text-center mb-4">
          <h2 id="premium-title" class="section-badge-title">Doces premium (por unidade)</h2>
          <p class="mx-auto section-support">${esc(doces.notaPremium)}</p>
        </div>
        <ul class="menu-list">${doces.premium.map((d) => menuItem(d, `${moneyCents(d.precoUnidade)} <small>a unidade</small>`)).join('')}
        </ul>
      </div>
    </section>
${policiesSection({ tone: 'dark' })}
${faqSection(doces.faq, { tone: 'light' })}
${ctaBand(doces)}
${relatedSection('doces', { tone: 'dark' })}`;

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

    <section id="precos" class="py-5 ${surface('light')}" aria-labelledby="opcoes-title">
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
${policiesSection({ tone: 'dark' })}
${faqSection(data.faq, { tone: 'light' })}
${ctaBand(data)}
${relatedSection(data.slug, { tone: 'dark' })}`;

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
        { loc: '/assets/images/hero/hero.jpeg', title: 'Basilio Bolos - Confeitaria Artesanal' },
        { loc: '/assets/images/brand/logo.jpeg', title: 'Logo Basilio Bolos' }
      ]
    },
    { loc: '/privacidade/', priority: '0.3', changefreq: 'yearly', images: [] },
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
    <section class="not-found-page section-surface-light" aria-labelledby="not-found-title">
      <div class="container text-center">
        <span class="not-found-code" aria-hidden="true">404</span>
        <h1 id="not-found-title" class="not-found-title">Esta página não existe</h1>
        <p class="not-found-text">O endereço que você tentou acessar não foi encontrado.</p>
        <a href="/" class="btn btn-lg not-found-button"><i class="fa-solid fa-house" aria-hidden="true"></i> Ir para a página principal</a>
      </div>
    </section>`;
  return layout({
    seo: {
      title: `Página não encontrada | ${site.nome}`,
      description: 'A página que você procurou não existe. Volte ao início e confira nossos bolos, doces e sobremesas artesanais em Santo André/SP.'
    },
    canonical: '/404.html',
    active: null,
    jsonLd: [],
    body,
    ogType: 'website',
    robots: 'noindex, nofollow',
    minimal: true
  });
}

// ---------- Política de privacidade e cookies ----------
function renderPrivacy() {
  const contactUrl = waHref('Olá! Gostaria de exercer meus direitos previstos na LGPD ou tirar dúvidas sobre privacidade.');
  const googlePrivacyUrl = 'https://policies.google.com/privacy';
  const body = `
    <header class="page-hero">
      <div class="container text-center">
        <h1 class="page-hero-title">Privacidade e cookies</h1>
        <p class="page-hero-subtitle mx-auto">Como usamos o Google Analytics 4 e seus cookies de métricas.</p>
      </div>
    </header>
    <section class="py-5 ${surface('light')}">
      <article class="container privacy-content">
        <p class="privacy-lead"><strong>Última atualização:</strong> 13 de agosto de 2026.</p>
        <p>Esta página descreve exatamente o uso de cookies e métricas no site Basilio Bolos. O único serviço de medição utilizado é o Google Analytics 4, identificado pela propriedade <code>G-C07W6E0102</code>.</p>

        <h2>1. Quem administra o tratamento</h2>
        <p>O site é operado sob o nome comercial <strong>${esc(site.nome)}</strong>. Dúvidas sobre esta política ou solicitações relacionadas aos seus dados podem ser enviadas pelo WhatsApp <a href="${contactUrl}" target="_blank" rel="noopener">${esc(site.telefoneDisplay)}</a>.</p>

        <h2>2. O que o Google Analytics mede</h2>
        <p>O Google Analytics é carregado somente depois que você clica em <strong>Aceitar cookies</strong>. Com o consentimento, o site envia:</p>
        <ul>
          <li><strong>Visualização de página:</strong> o caminho da página visitada, como <code>/bolos/</code>.</li>
          <li><strong>Evento <code>whatsapp_click</code>:</strong> o clique em um botão de WhatsApp, um rótulo técnico da posição do link, como <code>nav</code>, <code>hero</code>, <code>contato</code>, <code>cta-band</code> ou <code>float</code>, e o caminho da página onde ocorreu o clique.</li>
          <li><strong>Dados técnicos do serviço:</strong> o Google pode receber informações técnicas necessárias ao funcionamento do Analytics, como navegador, dispositivo e identificadores dos cookies.</li>
        </ul>
        <p>O código do site não envia ao Analytics nome, telefone, endereço, mensagem pré-preenchida do WhatsApp, conteúdo do pedido, CPF, e-mail, User-ID ou dados de pagamento. Também não usamos Google Signals, personalização de anúncios, Meta Pixel, TikTok Pixel, Hotjar, Clarity ou outro serviço de rastreamento.</p>

        <h2>3. Cookies utilizados</h2>
        <ul>
          <li><strong><code>_ga</code> e <code>_ga_*</code>:</strong> cookies do Google Analytics, criados somente após o aceite, para distinguir a navegação e medir visualizações e cliques. O código configura validade local de até um ano.</li>
          <li><strong><code>basilio_privacy_consent</code>:</strong> registro no armazenamento local do navegador, e não um cookie, usado para lembrar se você aceitou ou recusou as métricas.</li>
        </ul>
        <p>Não usamos cookies próprios de publicidade, remarketing ou venda de dados. A retenção dos dados dentro da propriedade do Google Analytics é configurada no painel do Google e deve ser revisada pelo administrador da conta.</p>

        <h2>4. Outros recursos do site</h2>
        <p>O site carrega Google Fonts, Bootstrap pelo jsDelivr e Font Awesome pelo cdnjs apenas para fontes, estilos e componentes visuais. Esses recursos não recebem os eventos de cliques descritos acima e não são usados pelo site como ferramentas de métricas. Os botões de WhatsApp, Google Maps, Instagram, Facebook e TikTok são links; o tratamento feito por esses serviços começa quando você decide acessá-los.</p>
        <p>O Google Analytics é fornecido pelo Google LLC e pode realizar tratamento internacional conforme a <a href="${googlePrivacyUrl}" target="_blank" rel="noopener noreferrer">Política de privacidade do Google</a>.</p>

        <h2>5. Consentimento e revogação</h2>
        <p>As métricas são baseadas no seu consentimento. Sem o aceite, o script do Google Analytics não é carregado, nenhum evento é enviado e os cookies de Analytics são removidos quando possível. Você pode mudar sua escolha a qualquer momento em <button type="button" class="link-button" data-privacy-settings>Preferências de cookies</button>, no rodapé de qualquer página.</p>
        <p>O site é estático e não possui formulário, banco de dados ou sistema próprio para armazenar pedidos. As mensagens enviadas ao WhatsApp não passam pelo Analytics.</p>

        <h2>6. Seus direitos</h2>
        <p>Você pode solicitar informações sobre este tratamento, confirmar a existência de dados associados a você, pedir correção ou eliminação quando aplicável e revogar o consentimento. Envie a solicitação pelo <a href="${contactUrl}" target="_blank" rel="noopener">canal de WhatsApp</a>. Também é possível peticionar à ANPD nas hipóteses previstas na LGPD.</p>

        <h2>7. Atualizações</h2>
        <p>Esta política será atualizada se o identificador, a finalidade, os eventos ou os serviços de métricas forem alterados. A data da última atualização aparece no início desta página.</p>
      </article>
    </section>`;

  return layout({
    seo: {
      title: `Privacidade e cookies | ${site.nome}`,
      description: `Uso do Google Analytics 4 e cookies de métricas no site ${site.nome}.`
    },
    canonical: '/privacidade/',
    active: null,
    jsonLd: [],
    body,
    ogType: 'article'
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
  const full = path.join(DIST, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('✔', relPath);
}

for (const relPath of PUBLIC_DIRECTORIES) copyPublicDirectory(relPath);
for (const relPath of PUBLIC_FILES) copyPublicFile(relPath);

writeFile('index.html', renderHome());
writeFile('bolos/index.html', renderBolos('redondo'));
writeFile('bolos-retangulares/index.html', renderBolos('retangular'));
writeFile('bento-cake/index.html', renderBentoCake());
writeFile('doces/index.html', renderDoces());
for (const data of paginasSimples) {
  writeFile(`${data.slug}/index.html`, renderSimples(data));
}
writeFile('sitemap.xml', renderSitemap());
writeFile('llms.txt', renderLlms());
writeFile('404.html', render404());
writeFile('privacidade/index.html', renderPrivacy());

console.log('\nSite gerado com sucesso! Páginas: /, ' + produtos.map((p) => '/' + p.url).join(', ') + ', /privacidade/, /404.html');
