# Basilio Bolos - Website

Confeitaria artesanal em Santo André/SP.

Site: https://basiliobolos.com.br/

## Documentação Central

- [Requisitos funcionais e não funcionais](specs/000-site-baseline/spec.md)
- [Arquitetura e publicação](ARCHITECTURE.md)
- [Constituição do projeto](.specify/memory/constitution.md)
- [Instruções operacionais para agentes](AGENTS.md)

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

### Onde editar

| Arquivo | Conteúdo |
|---|---|
| `data/site.json` | Telefone, endereço, horário, redes sociais e políticas de pedido |
| `data/produtos.json` | Cards da home, ordem, textos, imagens e recomendações |
| `data/bolos.json` | Tamanhos, recheios, coberturas, adicionais e FAQ de bolos |
| `data/bolos-retangulares.json` | Formatos retangular e coração usados em `/bolos/` |
| `data/doces.json` | Doces por cento, premium e FAQ |
| `data/biscoitos.json` | Biscoitos decorados e lembrancinhas |
| `data/cupcakes.json` | Opções e preços de cupcakes |
| `data/brownies.json` | Opções e preços de brownies |
| `data/pipoca-gourmet.json` | Sabores, embalagens e preços de pipoca |
| `data/campanhas.json` | Campanhas sazonais ativáveis |

### Deploy

```bash
git add .
git commit -m "descreva a alteração"
git push origin main
```

Em `Settings > Pages`, a origem deve ser `GitHub Actions`. Depois do push, acompanhe o
workflow `Deploy site` na aba `Actions`.

## Informações Oficiais

Os dados abaixo devem ser mantidos somente em `data/site.json` e usados como referência:

- Endereço: Av. Estados Unidos, 439 - Parque das Nações - Santo André/SP.
- Telefone: (11) 97845-8498.
- Horário: segunda a sábado, das 8h às 20h.
- Retirada: no local, com horário marcado, ou via Uber/99 por conta do cliente; não há entrega.
- Produtos: bolos personalizados, doces, biscoitos decorados, cupcakes, brownies e pipoca
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
