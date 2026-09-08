# Arquitetura do Site Basilio Bolos

Este documento descreve a arquitetura vigente e as fronteiras entre fonte, geração e
publicação. Requisitos funcionais e não funcionais ficam em
`specs/000-site-baseline/spec.md`; requisitos de novas funcionalidades usam uma pasta própria
em `specs/`.

## Visão Geral

O projeto é um site estático sem backend, banco de dados, autenticação ou checkout online.
Arquivos JSON mantêm os dados do negócio e dos produtos. Um gerador Node.js transforma esses
dados em HTML pré-renderizado, metadados e artefatos públicos. O GitHub Actions executa a
geração e publica somente `dist/` no GitHub Pages.

```text
data/*.json + templates/regras em tools/gerar.js
                         |
                         v
                 node tools/gerar.js
                         |
                         v
       dist/ (HTML, assets públicos, sitemap, llms.txt)
                         |
                         v
              GitHub Actions -> GitHub Pages
```

## Fontes de Verdade

| Responsabilidade | Fonte canônica | Regra |
|---|---|---|
| Governança | `.specify/memory/constitution.md` | Regras não negociáveis e processo de emenda |
| Requisitos | `specs/*/spec.md` | Comportamento esperado e critérios verificáveis |
| Arquitetura | `ARCHITECTURE.md` e `specs/*/plan.md` | Fronteiras técnicas e decisões por funcionalidade |
| Empresa e políticas | `data/site.json` | Nome, contato, endereço, horário e pedido |
| Catálogo | `data/produtos.json` e demais `data/*.json` | Produtos, opções, preços, FAQs e campanhas |
| Estrutura e cálculo | `tools/gerar.js` | HTML, comportamento gerado, preços derivados e SEO técnico |
| Apresentação | `css/styles.css` | Cores, layout, espaçamento e responsividade |
| Interações | `js/app.js` | Navegação, consentimento e comportamentos do navegador |
| Artefato público | `dist/` | Saída gerada; não é fonte de edição nem deve ser versionada |

Quando duas fontes divergirem, a alteração deve ser feita na fonte canônica adequada e o site
deve ser regenerado. Não se corrige uma divergência editando HTML em `dist/`.

## Organização do Código

- `data/site.json` mantém identidade, contato, endereço, horário, áreas atendidas e políticas.
- `data/produtos.json` mantém cards, ordem, imagens, destaque de preço e recomendações.
- `data/bolos.json` mantém tamanhos, recheios, coberturas, adicionais e regras de bolos.
- `data/bolos-retangulares.json` mantém formatos retangular e coração usados na página de
  bolos.
- `data/doces.json`, `data/biscoitos.json`, `data/cupcakes.json`, `data/brownies.json` e
  `data/pipoca-gourmet.json` mantêm as opções dos demais produtos.
- `data/campanhas.json` controla conteúdo sazonal.
- `tools/gerar.js` lê os JSONs, calcula preços, renderiza páginas e escreve a saída.
- `css/styles.css` e `js/app.js` são copiados para o artefato e carregados pelas páginas.
- `assets/` mantém imagens e outros recursos públicos usados pelo site.

## Artefatos Gerados

Uma execução bem-sucedida do gerador recria `dist/` e produz:

- Home em `/`.
- Páginas comerciais em `/bolos/`, `/bento-cake/`, `/doces/`, `/biscoitos/`, `/cupcakes/`,
  `/brownies/` e `/pipoca-gourmet/`.
- Páginas auxiliares em `/privacidade/` e `/404.html`.
- `sitemap.xml` com as URLs e imagens públicas definidas pelo gerador.
- `llms.txt` com resumo legível do negócio, produtos, preços, links e políticas públicas.
- Recursos copiados de `css/`, `js/`, `assets/` e dos arquivos públicos configurados no
  gerador, incluindo `manifest.json`, favicons, `robots.txt` e `CNAME`.

O HTML incorpora textos, preços, FAQs, metadados e dados estruturados para que as páginas
sejam úteis sem depender de uma API em tempo de execução. O gerador inclui, quando aplicável,
dados estruturados de negócio local, site, produtos, FAQ e breadcrumbs. Esses dados devem
corresponder ao conteúdo visível e nunca podem inventar avaliações, preços, horários ou
disponibilidade.

## Build e Publicação

Validação local para mudanças em dados ou no gerador:

```bash
node --check tools/gerar.js
node tools/gerar.js
git diff --check
```

O workflow `.github/workflows/deploy-pages.yml` roda em pushes para `main` ou manualmente,
configura Node.js 20, executa `node tools/gerar.js`, envia `dist/` como artefato e publica no
GitHub Pages. Não há etapa válida de edição manual ou publicação de arquivos individuais de
`dist/`.

## Regras Transversais

- Conteúdo público deve permanecer em português do Brasil e refletir os dados atuais de
  `data/site.json` e dos arquivos de produtos.
- Alterações de UX devem preservar decisão principal por seção, preços visíveis, contraste,
  foco, texto alternativo e funcionamento em 390px e 1440px.
- SEO técnico deve reforçar descoberta sem criar páginas artificiais, repetir palavras-chave,
  esconder texto ou sacrificar clareza.
- `robots.txt`, canonical, sitemap, schema e `llms.txt` devem apontar para fatos públicos e
  URLs canônicas reais.
- Credenciais, arquivos `.env` e dados sensíveis não pertencem ao repositório nem ao artefato.
- Dependências novas exigem justificativa; o gerador não depende de pacotes externos em tempo
  de execução.

## Validação Externa

Quando uma mudança afetar páginas públicas, revisar também:

- Rich Results: https://search.google.com/test/rich-results
- PageSpeed Insights: https://pagespeed.web.dev/
- Search Console: https://search.google.com/search-console

Essas ferramentas verificam o artefato publicado; não substituem a validação local nem
autorizam alterar conteúdo para perseguir uma métrica isolada.
