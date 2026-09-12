# Instruções do Projeto

## Visão geral

Este é um site estático da Basilio Bolos, publicado pelo GitHub Pages. O conteúdo é escrito
em português do Brasil e as páginas usam HTML, CSS, JavaScript e dados JSON.

## Fontes de verdade

- Governança: `.specify/memory/constitution.md`.
- Requisitos funcionais e não funcionais: `specs/*/spec.md`.
- Arquitetura geral: `ARCHITECTURE.md`.
- Arquitetura e decisões específicas: `specs/*/plan.md`.
- Conteúdo, preços, opções, FAQs e políticas: `data/*.json`.
- Estrutura, comportamento gerado, cálculos e SEO técnico: `tools/gerar.js`.

Leia os requisitos e a arquitetura aplicáveis antes de alterar o código. Não use este arquivo
para duplicar requisitos de produto; mantenha aqui somente regras operacionais para agentes.

## Fluxo de edição

- Edite preços, descrições, sabores, FAQs e informações de produtos em `data/*.json`.
- Não edite diretamente os HTMLs gerados.
- Altere `tools/gerar.js` quando precisar mudar a estrutura, o comportamento ou a lógica de
  cálculo das páginas.
- Depois de alterar dados ou o gerador, execute `node tools/gerar.js` na raiz do projeto; a
  saída será criada em `dist/`.
- Não edite nem versione `dist/`; o GitHub Actions publica esse artefato automaticamente.
- Para uma nova funcionalidade, registre requisitos em uma pasta própria de `specs/` antes da
  implementação e registre decisões técnicas no respectivo `plan.md`.

## Arquivos principais

- `data/site.json`: dados da empresa, contato, endereço, políticas e redes sociais.
- `data/produtos.json`: cards, ordem dos produtos e recomendações.
- `data/bolos.json`: bolos redondos, tamanhos, recheios, coberturas e acréscimos.
- `data/bolos-retangulares.json`: página de outros formatos, incluindo coração e bolos
  retangulares.
- `tools/gerar.js`: gerador das páginas, preços, SEO, sitemap e `llms.txt`.
- `.github/workflows/deploy-pages.yml`: build e deploy de `dist/`.
- `css/styles.css`: estilos globais e responsivos.
- `js/app.js`: interações do navegador.
- `ARCHITECTURE.md`: limites técnicos, fluxo de geração e publicação.
- `specs/000-site-baseline/spec.md`: requisitos base do site.

## Validação

Após mudanças no gerador ou nos dados, execute:

```bash
node --check tools/gerar.js
node tools/gerar.js
git diff --check
```

Confirme também que os JSONs alterados continuam válidos, que `dist/` contém somente o
artefato público esperado e que as páginas geradas exibem os preços e textos esperados em
desktop e mobile.

## Convenções

- Preserve a linguagem e os acentos em português do Brasil.
- Prefira alterações pequenas e compatíveis com o layout existente.
- Preserve a responsividade das tabelas e componentes.
- Não edite arquivos `.env`, credenciais ou segredos.
- Evite adicionar dependências quando a funcionalidade já puder usar recursos existentes no
  projeto.
