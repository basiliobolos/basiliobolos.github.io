'use strict';
// Somente leitura: não concede aprovação nem altera cadastros.
const fs = require('node:fs');
const path = require('node:path');
const { criarRegistro } = require('./natal-catalogo.cjs');
const root = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, 'data', file), 'utf8'));
try {
  const catalogo = read('natal.json');
  const registro = criarRegistro(catalogo, read('site.json'), { validarPublicacao: false });
  for (const ctx of registro) {
    console.log(`${ctx.pagina.rota} — ${ctx.publico ? 'publicação solicitada' : 'prévia noindex'} — ${ctx.itensPrincipais.length} principais + ${ctx.itensRelacionados.length} relacionados`);
    if (process.argv.includes('--fingerprints')) {
      console.log(`  negocio: ${ctx.assinaturas.negocio}\n  pagina.${ctx.pagina.id}: ${ctx.assinaturas.pagina}`);
      for (const [id, hash] of Object.entries(ctx.assinaturas.produtos)) console.log(`  produto.${id}: ${hash}`);
    }
    for (const error of ctx.pendencias) console.log(`  Pendente: ${error}`);
  }
  console.log('Relatório somente leitura. Assinatura não aprova fatos; revisão humana ainda é necessária.');
  if (registro.some(c => c.publico && c.pendencias.length)) process.exitCode = 1;
} catch (error) { console.error(error.message); process.exitCode = 1; }
