'use strict';
// Regras compartilhadas pelo build, relatório de revisão e fixtures. Sem I/O de escrita.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const estados = new Set(['rascunho', 'pronto', 'pausado', 'arquivado']);
const controles = new Set(['revisao', 'revisaoEditorial', 'publicado', 'publicada', 'habilitada', 'pendencias', 'origem', 'updatedAt']);
const sha = value => createHash('sha256').update(value).digest('hex');
const fail = (where, message) => { throw new Error(`${where}: ${message}`); };

function ordenado(value) {
  if (Array.isArray(value)) return value.map(ordenado);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, ordenado(value[k])]));
  return value;
}
function fotoLocal(src, { root = ROOT, readFile = fs.readFileSync } = {}) {
  if (typeof src !== 'string' || !/^\/?assets\/images\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|avif)$/i.test(src) || src.split('/').includes('..')) return null;
  const relative = src.replace(/^\//, '');
  try { return { url: `/${relative}`, hash: sha(readFile(path.join(root, relative))) }; } catch { return null; }
}
function revisavel(value, options) {
  if (Array.isArray(value)) return value.map(v => revisavel(v, options));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).filter(k => !controles.has(k)).sort().map(k => {
    const val = value[k];
    return [k, /^imagem(?:Menor|Social)?$/.test(k) ? { caminho: val, bytes: fotoLocal(val, options)?.hash || null } : revisavel(val, options)];
  }));
}
function assinatura(value, options) { return sha(JSON.stringify(ordenado(revisavel(value, options)))); }
function dataValida(value, now = new Date()) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return false;
  const date = new Date(value);
  const calendar = new Date(value.slice(0, 10));
  return Number.isFinite(+date) && Number.isFinite(+calendar) && calendar.toISOString().slice(0, 10) === value.slice(0, 10) && +date <= +now;
}
function conferirRevisao(revisao, esperado, ano, where, errors, now) {
  if (!revisao || revisao.ano !== ano || !String(revisao.responsavel || '').trim() || !dataValida(revisao.revisadoEm, now) || Number(revisao.revisadoEm.slice(0, 4)) !== ano || revisao.assinatura !== esperado) {
    errors.push(`${where}.revisao: ano, responsável, data ou assinatura inválida/ausente`);
  }
}
function normalizarProduto(p) {
  const common = ['conservacao', 'validade', 'alergenicos', 'cobertura', 'opcoes', 'embalagem', 'conteudoEmbalagem', 'personalizacao', 'minimo', 'prazo'];
  return { ...p, familias: p.familias || [p.tipoProduto], publicos: p.publicos || [],
    variantes: (p.variantes || []).map(v => ({ ...Object.fromEntries(common.filter(k => p[k] !== undefined).map(k => [k, p[k]])), nome: v.nome || v.referencia, ...v })),
    ...(p.sabores ? { sabores: p.sabores.map(s => ({ ...s })) } : {}) };
}
const ancoraProduto = p => `produto-${p.id}`;
const ancoraVersao = (p, v) => `${ancoraProduto(p)}-${v.id}`;
function validarComponentes(p, byId, stack = [], publico = false) {
  if (stack.includes(p.id)) fail(`produto.${p.id}.componentes`, `ciclo ${[...stack, p.id].join(' -> ')}`);
  if (publico && p.tipoProduto === 'kit' && !p.componentes?.length) fail(`produto.${p.id}.componentes`, 'kit exige composição própria');
  for (const [i, c] of (p.componentes || []).entries()) {
    const where = `produto.${p.id}.componentes[${i}]`;
    if ((c.quantidade == null && !publico) ? !c.unidade : !Number.isFinite(c.quantidade) || c.quantidade <= 0 || !c.unidade) fail(where, 'quantidade positiva e unidade obrigatórias');
    if (c.produtoId) {
      const other = byId.get(c.produtoId);
      if (!other) fail(where, `produto inexistente ${c.produtoId}`);
      if (c.varianteId && !other.variantes.some(v => v.id === c.varianteId)) fail(where, `versão inexistente ${c.varianteId}`);
      if (publico && other.statusCatalogo !== 'pronto') fail(where, `componente ${other.id} não está pronto`);
      validarComponentes(other, byId, [...stack, p.id], publico);
    } else if (!c.nome) fail(where, 'nome ou produtoId obrigatório');
  }
}
function dependencias(p, byId, stack = []) {
  if (stack.includes(p.id)) return { ciclo: [...stack, p.id] };
  return { ...p, dependencias: (p.componentes || []).filter(c => c.produtoId).map(c => {
    const component = byId.get(c.produtoId);
    return component ? dependencias(component, byId, [...stack, p.id]) : { ausente: c.produtoId };
  }) };
}
function selecionar(grupo, produtos, publico) {
  const s = grupo.selecao;
  const where = `grupo.${grupo.id}.selecao`;
  if (!s || !['ids', 'tipo', 'publico', 'prontos'].includes(s.modo)) fail(where, 'modo inválido');
  let chosen;
  if (s.modo === 'ids') {
    if (!Array.isArray(s.ids) || new Set(s.ids).size !== s.ids.length) fail(where, 'IDs ausentes ou repetidos');
    chosen = s.ids.map(id => produtos.find(p => p.id === id) || fail(where, `produto inexistente ${id}`));
  } else {
    if (s.modo === 'tipo' && !s.tipoProduto) fail(where, 'tipoProduto obrigatório');
    if (s.modo === 'publico' && !s.publico) fail(where, 'publico obrigatório');
    chosen = produtos.filter(p => (s.modo === 'prontos' || (s.modo === 'tipo' ? p.tipoProduto === s.tipoProduto : p.publicos.includes(s.publico))));
  }
  if (publico && s.incluirRascunhos) fail(where, 'rascunhos só podem ser incluídos explicitamente em prévia');
  if (s.modo === 'ids' && publico) {
    for (const p of chosen) if (p.statusCatalogo !== 'pronto') fail(where, `${p.id}: item selecionado não está pronto`);
  }
  return chosen.filter(p => !(s.excluirIds || []).includes(p.id) && (p.statusCatalogo === 'pronto' || (!publico && s.incluirRascunhos && p.statusCatalogo === 'rascunho')));
}
// Seleção pública explícita: nunca transportar campos internos ao JSON do navegador.
function produtoPublico(p) {
  const fields = ['id', 'nome', 'tipoProduto', 'publicos', 'categoria', 'familias', 'descricao', 'detalhes', 'cor', 'taxaArte', 'taxaArteDescricao', 'personalizacao', 'minimo', 'prazo', 'componentes', 'opcoes', 'cobertura', 'conteudoEmbalagem', 'embalagem', 'validade', 'conservacao', 'alergenicos', 'peso', 'dimensoes'];
  const versionFields = ['id', 'varianteId', 'saborId', 'nome', 'referencia', 'detalhes', 'preco', 'precoStatus', 'unidade', 'foto', 'alt', 'imagem', 'imagemProvisoria', 'galeria', 'largura', 'altura', 'cor', 'ancorasLegadas', 'opcoes', 'cobertura', 'conteudoEmbalagem', 'embalagem', 'validade', 'conservacao', 'alergenicos', 'personalizacao', 'minimo', 'prazo'];
  const pick = (obj, keys) => Object.fromEntries(keys.filter(k => obj[k] !== undefined).map(k => [k, obj[k]]));
  return {
    ...pick(p, fields),
    ...(p.fotoGeral ? { fotoGeral: pick(p.fotoGeral, ['imagem', 'alt', 'largura', 'altura', 'imagemProvisoria']) } : {}),
    variantes: p.variantes.map(v => pick(v, versionFields)),
    ...(p.sabores ? { sabores: p.sabores.map(s => pick(s, versionFields)) } : {})
  };
}
function prontidao(ctx, catalogo, site, byId, options) {
  const errors = [];
  const page = ctx.pagina;
  const prefix = `pagina.${page.id}`;
  const hero = ctx.hero;
  const comImagemMenor = hero.imagemMenor !== null;
  const now = options.now || new Date();
  const currentYear = Number(new Intl.DateTimeFormat('en', { timeZone: 'America/Sao_Paulo', year: 'numeric' }).format(now));
  if (catalogo.ano !== currentYear) errors.push(`${prefix}.ano: coleção deve ser do ano vigente`);
  if (!['aberta', 'encerrada'].includes(catalogo.agenda?.estado)) errors.push(`${prefix}.agenda.estado: a confirmar`);
  if (!catalogo.agenda?.mensagem) errors.push(`${prefix}.agenda.mensagem: obrigatória`);
  if (catalogo.agenda?.encerramento && !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(catalogo.agenda.encerramento)) errors.push(`${prefix}.agenda.encerramento: ISO com fuso obrigatório`);
  for (const [key, image, alt] of [
    ['hero.imagem', hero.imagem, hero.alt],
    ...(comImagemMenor ? [['hero.imagemMenor', hero.imagemMenor, hero.altMenor]] : []),
    ['seo.imagemSocial', page.seo?.imagemSocial, page.seo?.imagemSocialAlt]
  ]) if (!fotoLocal(image, options) || !alt?.trim()) errors.push(`${prefix}.${key}: foto local real e alt obrigatório`);
  if (hero.imagemProvisoria === true) errors.push(`${prefix}.hero.imagem: imagem ilustrativa não pode ser publicada`);
  if (comImagemMenor && hero.imagemMenorProvisoria === true) errors.push(`${prefix}.hero.imagemMenor: imagem ilustrativa não pode ser publicada`);
  for (const key of ['h1', 'introducao', 'intencao']) if (!page[key]?.trim()) errors.push(`${prefix}.${key}: obrigatório`);
  for (const key of ['title', 'description']) if (!page.seo?.[key]?.trim()) errors.push(`${prefix}.seo.${key}: obrigatório`);
  if (!ctx.itens.length) errors.push(`${prefix}.grupos: seleção vazia`);
  if (page.updatedAt && !dataValida(page.updatedAt, now)) errors.push(`${prefix}.updatedAt: data inválida/futura`);
  conferirRevisao(site.revisao, ctx.assinaturas.negocio, catalogo.ano, 'negocio', errors, now);
  conferirRevisao(page.revisao, ctx.assinaturas.pagina, catalogo.ano, prefix, errors, now);
  if (page.tipo !== 'colecao') {
    const editorial = page.revisaoEditorial;
    if (!editorial?.diferencaUtil?.trim() || editorial.aprovada !== true) errors.push(`${prefix}.revisaoEditorial: diferença útil e aprovação obrigatórias`);
    conferirRevisao(editorial, ctx.assinaturas.pagina, catalogo.ano, `${prefix}.editorial`, errors, now);
  }
  const checked = new Set();
  function produto(p, owner = prefix) {
    if (checked.has(p.id)) return;
    checked.add(p.id);
    const where = `${owner}.produto.${p.id}`;
    if (p.statusCatalogo !== 'pronto') errors.push(`${where}.statusCatalogo: não está pronto`);
    conferirRevisao(p.revisao, assinatura({ ano: catalogo.ano, produto: dependencias(p, byId) }, options), catalogo.ano, where, errors, now);
    try { validarComponentes(p, byId, [], true); } catch (error) { errors.push(`${where}: ${error.message}`); }
    if (p.fotoGeral && (p.fotoGeral.imagemProvisoria === true || !fotoLocal(p.fotoGeral.imagem, options) || !p.fotoGeral.alt?.trim())) {
      errors.push(`${where}.fotoGeral: foto real e alt obrigatório`);
    }
    for (const v of p.variantes) {
      if (!v.unidade || !['confirmado', 'sob-consulta'].includes(v.precoStatus) || (v.precoStatus === 'sob-consulta' ? v.preco != null : !Number.isFinite(v.preco) || v.preco <= 0)) errors.push(`${where}.variantes.${v.id}.preco: confirmar preço/unidade ou usar consulta sem valor`);
      if (!fotoLocal(v.imagem, options) || !(v.alt || v.foto)?.trim()) errors.push(`${where}.variantes.${v.id}.imagem: foto real e alt obrigatório`);
      if (v.imagemProvisoria === true) errors.push(`${where}.variantes.${v.id}.imagem: imagem ilustrativa não pode ser publicada`);
      for (const [i, photo] of (v.galeria || []).entries()) if (photo.imagemProvisoria === true || !fotoLocal(photo.imagem, options) || !photo.alt?.trim()) errors.push(`${where}.variantes.${v.id}.galeria.${i}: foto real e alt obrigatório`);
      if (p.tipoProduto === 'kit' && (!v.conservacao || !v.validade)) errors.push(`${where}.variantes.${v.id}: kit exige conservação e validade próprias ou consulta explícita`);
    }
    for (const s of p.sabores || []) {
      if (s.imagemProvisoria === true || !fotoLocal(s.imagem, options) || !(s.alt || s.foto)?.trim()) errors.push(`${where}.sabores.${s.id}.imagem: foto real e alt obrigatório`);
      for (const [i, photo] of (s.galeria || []).entries()) if (photo.imagemProvisoria === true || !fotoLocal(photo.imagem, options) || !photo.alt?.trim()) errors.push(`${where}.sabores.${s.id}.galeria.${i}: foto real e alt obrigatório`);
    }
    for (const c of p.componentes || []) if (byId.has(c.produtoId)) produto(byId.get(c.produtoId), where);
  }
  ctx.produtos.forEach(p => produto(p));
  for (const [i, h] of (site.horariosEspeciais || []).entries()) {
    if (!dataValida(h.revisadoEm, now) || !/^\d{4}-\d{2}-\d{2}$/.test(h.data) || Number.isNaN(Date.parse(h.data)) || typeof h.fechado !== 'boolean' || (!h.fechado && (!/^\d{2}:\d{2}$/.test(h.abre) || !/^\d{2}:\d{2}$/.test(h.fecha) || h.abre >= h.fecha))) errors.push(`negocio.horariosEspeciais[${i}]: horário/data/revisão inválidos`);
  }
  return errors;
}
function criarRegistro(catalogo, site, options = {}) {
  const produtos = catalogo.produtos.map(normalizarProduto);
  const byId = new Map();
  const references = new Set();
  const anchors = new Set(['catalogo', 'empresas', 'retirada']);
  function id(value, where) { if (!slug.test(value || '')) fail(where, 'ID deve ser slug estável'); }
  for (const p of produtos) {
    id(p.id, 'produto.id');
    if (byId.has(p.id)) fail(`produto.${p.id}`, 'ID repetido');
    if (!estados.has(p.statusCatalogo)) fail(`produto.${p.id}.statusCatalogo`, 'estado inválido');
    if (!p.tipoProduto || !p.variantes.length) fail(`produto.${p.id}`, 'tipo físico e versões obrigatórios');
    byId.set(p.id, p);
    for (const list of [p.variantes, p.sabores || []]) {
      const ids = new Set();
      for (const v of list) {
        id(v.id, `produto.${p.id}.opcao.id`);
        if (ids.has(v.id)) fail(`produto.${p.id}.${v.id}`, 'ID de opção repetido');
        ids.add(v.id);
        const ref = v.referencia?.trim().normalize('NFC').toLocaleLowerCase('pt-BR');
        if (!ref || references.has(ref)) fail(`produto.${p.id}.${v.id}.referencia`, 'nome completo ausente ou repetido');
        references.add(ref);
      }
    }
    // Cada sabor de múltiplas versões declara sua combinação comercial explícita.
    for (const s of p.sabores || []) {
      if ((p.variantes.length > 1 && !s.varianteId) || (s.varianteId && !p.variantes.some(v => v.id === s.varianteId))) fail(`produto.${p.id}.sabores`, 'sabor exige varianteId existente para múltiplas versões');
    }
    if (p.sabores?.length) for (const v of p.variantes) {
      if (!p.sabores.some(s => !s.varianteId || s.varianteId === v.id)) fail(`produto.${p.id}.sabores`, `versão ${v.id} sem sabores próprios`);
    }
    for (const a of [ancoraProduto(p), ...p.variantes.flatMap(v => [ancoraVersao(p, v), ...(v.ancorasLegadas || [])])]) {
      id(a, `produto.${p.id}.ancora`);
      if (anchors.has(a)) fail(`produto.${p.id}.ancora`, `âncora repetida ${a}`);
      anchors.add(a);
    }
  }
  const routeIds = new Set(); const routes = new Set();
  for (const page of catalogo.paginas) {
    id(page.id, 'pagina.id');
    if (routeIds.has(page.id) || routes.has(page.rota) || !/^\/natal\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)*$/.test(page.rota)) fail(`pagina.${page.id}.rota`, 'rota/ID inválido ou repetido');
    if (!['colecao', 'categoria', 'intencao', 'produto'].includes(page.tipo)) fail(`pagina.${page.id}.tipo`, 'tipo inválido');
    routeIds.add(page.id); routes.add(page.rota);
  }
  const hub = catalogo.paginas.find(p => p.rota === '/natal/');
  for (const page of catalogo.paginas) {
    if (page.linksIds !== undefined && (!Array.isArray(page.linksIds) || new Set(page.linksIds).size !== page.linksIds.length || page.linksIds.some(id => !routeIds.has(id) || id === page.id))) fail(`pagina.${page.id}.linksIds`, 'links de páginas inválidos ou repetidos');
  }
  const negocio = assinatura({ ano: catalogo.ano, site }, options);
  const registro = catalogo.paginas.filter(p => p.habilitada).map(page => {
    const publico = catalogo.publicado === true && page.publicada === true;
    const seen = new Set(); const groups = new Set();
    const grupos = (page.grupos || []).map(group => {
      id(group.id, `pagina.${page.id}.grupo.id`);
      if (groups.has(group.id) || !['principal', 'relacionados'].includes(group.funcao)) fail(`pagina.${page.id}.grupo.${group.id}`, 'ID repetido ou função inválida');
      groups.add(group.id);
      return { ...group, produtos: selecionar(group, produtos, publico).filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; }) };
    }).filter(g => g.produtos.length);
    const selecionados = grupos.flatMap(g => g.produtos);
    const produtosPrincipais = grupos.filter(g => g.funcao === 'principal').flatMap(g => g.produtos);
    const principaisIds = new Set(produtosPrincipais.map(p => p.id));
    if (page.tipo === 'produto' && (selecionados.length !== 1 || selecionados[0].id !== page.produtoId)) fail(`pagina.${page.id}.produtoId`, 'página de produto deve selecionar somente o produto indicado');
    for (const p of selecionados) validarComponentes(p, byId);
    const itens = selecionados.flatMap(p => p.variantes.map(v => ({ produto: p, variante: v, ancora: ancoraVersao(p, v) })));
    const itensPrincipais = itens.filter(item => principaisIds.has(item.produto.id));
    const itensRelacionados = itens.filter(item => !principaisIds.has(item.produto.id));
    const faq = [...(page.faqIds || []).map(faqId => catalogo.faq.find(f => f.id === faqId) || fail(`pagina.${page.id}.faqIds`, `FAQ inexistente ${faqId}`)), ...(page.faqProprias || [])];
    const trail = (page.breadcrumb || []).map(parentId => {
      const parent = catalogo.paginas.find(p => p.id === parentId);
      if (!parent || !parent.habilitada || parent.id === page.id) fail(`pagina.${page.id}.breadcrumb`, `ancestral inválido ${parentId}`);
      return { nome: parent.nome || parent.h1, url: parent.rota, id: parent.id };
    });
    const usedCategories = new Set(selecionados.flatMap(p => [p.categoria || p.tipoProduto, ...p.familias]));
    const comum = { catalogo: catalogo.catalogo, faqLocal: catalogo.seo?.faqLocal,
      categorias: (catalogo.categorias || []).filter(c => usedCategories.has(c.id)),
      ...(page.id === 'colecao' && selecionados.some(p => p.categoria === 'empresas') ? { empresas: catalogo.empresas } : {}) };
    const hero = { ...catalogo.hero, ...page.hero };
    const ctx = { hero, pagina: page, publico, encerrada: catalogo.agenda?.estado === 'encerrada', grupos, produtos: selecionados, produtosPrincipais, itens, itensPrincipais, itensRelacionados, faq, trail,
      assinaturas: { negocio, pagina: assinatura({ ano: catalogo.ano, agenda: catalogo.agenda, hero, comum, pagina: page, faq, produtos: selecionados.map(p => dependencias(p, byId)) }, options),
        produtos: Object.fromEntries(selecionados.map(p => [p.id, assinatura({ ano: catalogo.ano, produto: dependencias(p, byId) }, options)])) } };
    ctx.pendencias = prontidao(ctx, catalogo, site, byId, options);
    return ctx;
  });
  for (const ctx of registro.filter(c => c.publico)) {
    if (!hub?.habilitada || !registro.find(c => c.pagina.id === hub.id)?.publico) ctx.pendencias.push(`pagina.${ctx.pagina.id}: hub público obrigatório para referências estáveis`);
    const hubIds = new Set(registro.find(c => c.pagina.id === hub?.id)?.produtos.map(p => p.id));
    for (const p of ctx.produtos) if (!hubIds.has(p.id)) ctx.pendencias.push(`pagina.${ctx.pagina.id}.produto.${p.id}: ausente no hub público`);
    for (const parent of ctx.trail) if (!registro.find(c => c.pagina.id === parent.id)?.publico) ctx.pendencias.push(`pagina.${ctx.pagina.id}.breadcrumb: ancestral não público ${parent.id}`);
  }
  const errors = registro.filter(c => c.publico).flatMap(c => c.pendencias);
  if (errors.length && options.validarPublicacao !== false) fail('Publicação de Natal rejeitada', errors.join('\n'));
  return registro;
}
function promoverRascunho(catalogo, rascunhos, id) {
  const input = rascunhos.produtos.find(p => p.id === id);
  if (!input) fail('promocao', `rascunho inexistente ${id}`);
  if (catalogo.produtos.some(p => p.id === id)) fail('promocao', `ID já ativo ${id}`);
  const produto = structuredClone(input);
  delete produto.revisao;
  produto.statusCatalogo = 'rascunho';
  return {
    catalogo: { ...structuredClone(catalogo), produtos: [...structuredClone(catalogo.produtos), produto] },
    rascunhos: { ...structuredClone(rascunhos), produtos: structuredClone(rascunhos.produtos.filter(p => p.id !== id)) }
  };
}
function divulgacaoAtiva(catalogo, registro, { preview = false, now = new Date() } = {}) {
  const info = catalogo.divulgacao;
  if (info?.ativa !== true) return false;
  const fim = Date.parse(info.fimExclusivo);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(info.fimExclusivo || '') || !Number.isFinite(fim)) fail('divulgacao.fimExclusivo', 'data ISO com fuso obrigatória');
  const hub = registro.find(ctx => ctx.pagina.rota === '/natal/');
  return Boolean(hub && !hub.encerrada && (preview || hub.publico) && +now < fim);
}
module.exports = { criarRegistro, normalizarProduto, produtoPublico, assinatura, fotoLocal, dataValida, ancoraProduto, ancoraVersao, promoverRascunho, validarComponentes, divulgacaoAtiva };
