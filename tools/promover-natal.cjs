'use strict';
// Prévia por padrão. --gravar move o cadastro; nunca muda para pronto nem aprova.
const fs = require('node:fs');
const path = require('node:path');
const { promoverRascunho, criarRegistro } = require('./natal-catalogo.cjs');
const root = path.resolve(__dirname, '..');
const main = path.join(root, 'data/natal.json');
const drafts = path.join(root, 'data/natal-rascunhos.json');
try {
  const id = process.argv.slice(2).find(arg => !arg.startsWith('--'));
  if (!id || process.argv.slice(2).some(arg => arg.startsWith('--') && arg !== '--gravar')) throw new Error('Uso: node tools/promover-natal.cjs <id> [--gravar]');
  const originalMain = fs.readFileSync(main, 'utf8');
  const originalDrafts = fs.readFileSync(drafts, 'utf8');
  const result = promoverRascunho(JSON.parse(originalMain), JSON.parse(originalDrafts), id);
  criarRegistro(result.catalogo, JSON.parse(fs.readFileSync(path.join(root, 'data/site.json'), 'utf8')));
  if (process.argv.includes('--gravar')) {
    try {
      fs.writeFileSync(main, JSON.stringify(result.catalogo, null, 2) + '\n');
      fs.writeFileSync(drafts, JSON.stringify(result.rascunhos, null, 2) + '\n');
    } catch (error) {
      fs.writeFileSync(main, originalMain); fs.writeFileSync(drafts, originalDrafts); throw error;
    }
    console.log(`${id}: movido para natal.json, ainda rascunho e fora da seleção pública.`);
  } else console.log(`${id}: promoção válida. Nada gravado. Use --gravar para mover mantendo o estado rascunho.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
