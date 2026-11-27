# Basilio Bolos - Website

Confeitaria artesanal em Santo André/SP.

Site: https://basiliobolos.com.br/

## Documentação Central

- [Requisitos funcionais e não funcionais](specs/000-site-baseline/spec.md)
- [Arquitetura e publicação](ARCHITECTURE.md)
- [Constituição do projeto](.specify/memory/constitution.md)
- [Instruções operacionais para agentes](AGENTS.md)
- [Fontes de SEO e busca com IA](docs/seo-geo/fontes-e-diretrizes.md)
- [Regras de publicação do catálogo de Natal](specs/004-natal-seo-geo/contracts/publicacao-e-paginas.md)

## Quick Start

### Editar preços e conteúdo

Preços, descrições, sabores, FAQs, políticas e informações de produtos ficam em `data/*.json`.
Os arquivos HTML são gerados; não edite HTML diretamente.

```bash
node --check tools/gerar.js
node tools/gerar.js
git diff --check
```

O conteúdo público é criado em `dist/`, que não deve ser editado nem versionado. O workflow
`.github/workflows/deploy-pages.yml` gera esse diretório no GitHub Actions e publica somente o
artefato no GitHub Pages.

### Natal de 2026

A coleção tem 26 produtos em cinco páginas. A agenda está aberta.
A disponibilidade para cada data e o horário de retirada são combinados pelo WhatsApp.
Preços, variantes, fotos e seleções ficam em `data/natal.json`.

Gere o site com `node tools/gerar.js`. Valide o catálogo antes do merge.

```bash
node tools/revisar-natal.cjs --check
node tools/verificar-seo-natal.cjs
```

Para testar o navegador, execute `node tools/verificar-natal.cjs` com Playwright
disponível no ambiente de QA. `NATAL_PREVIEW=1` gera uma prévia local com noindex.
A divulgação da home vai até 31/12/2026. A agenda de pedidos é definida à parte.

### Onde editar

| Arquivo | Conteúdo |
|---|---|
| `data/site.json` | Telefone, endereço, horário, redes sociais e políticas de pedido |
| `data/produtos.json` | Cards da home, ordem, textos, imagens e recomendações |
| `data/bolos.json` | Tamanhos, recheios, coberturas, adicionais e FAQ de bolos |
| `data/bolos-retangulares.json` | Formatos retangular e coração usados em `/bolos/` |
| `data/doces.json` | Doces por cento, premium e FAQ |
| `data/biscoitos.json` | Biscoitos carimbados, decorados à mão e lembrancinhas |
| `data/cupcakes.json` | Opções e preços de cupcakes |
| `data/brownies.json` | Opções e preços de brownies |
| `data/pipoca-gourmet.json` | Sabores, embalagens e preços de pipoca |
| `data/campanhas.json` | Campanhas sazonais ativáveis |

### Publicar no GitHub Pages

1. Abra um pull request da branch da entrega para `main`.
2. Faça o merge. Aguarde o workflow `Deploy site` concluir no GitHub Actions.
3. Abra a [home](https://basiliobolos.com.br/) e o [catálogo de Natal](https://basiliobolos.com.br/natal/).
4. Envie o [sitemap](https://basiliobolos.com.br/sitemap.xml) no [Google Search Console](https://search.google.com/search-console) e no [Bing Webmaster Tools](https://www.bing.com/webmasters/).
5. No Search Console, inspecione a home e o catálogo. Clique em **Solicitar indexação**.

## Informações Oficiais

Os dados abaixo devem ser mantidos somente em `data/site.json` e usados como referência:

- Endereço: Av. Estados Unidos, 439 - Parque das Nações - Santo André/SP.
- Telefone: (11) 97845-8498.
- Retiradas: segunda a sexta, das 9h às 19h; sábado, das 9h às 14h; domingo fechado.
- Retirada: no local, com horário marcado, ou via Uber/99 por conta do cliente; não há entrega.
- Produtos: bolos personalizados, doces, biscoitos carimbados e decorados à mão, cupcakes, brownies e pipoca
  gourmet.

## Validação Externa

- Rich Results: https://search.google.com/test/rich-results
- PageSpeed Insights: https://pagespeed.web.dev/
- Search Console: https://search.google.com/search-console

Consulte `ARCHITECTURE.md` para o fluxo completo de geração, SEO técnico e publicação.

## Estrutura

```text
basiliobolos-website/
├── data/*.json                 # fonte dos preços e conteúdo
├── specs/                      # requisitos e planos por funcionalidade
├── ARCHITECTURE.md             # arquitetura e decisões transversais
├── tools/gerar.js              # gerador estático
├── .github/workflows/          # build e deploy do GitHub Pages
├── dist/                       # artefato gerado e ignorado pelo Git
├── assets/                     # imagens e ícones
├── css/styles.css              # estilos
├── js/app.js                   # interações
└── .specify/memory/constitution.md
```
