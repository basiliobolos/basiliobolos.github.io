# Implementação

- Dados e textos em `data/natal.json`; empresa em `data/site.json`.
- Renderização em `tools/gerar.js`, CSS próprio em `css/natal.css` e JS em `js/natal.js`.
- Sem framework, bibliotecas adicionais ou carrossel. Imagens com dimensões e lazy loading.
- Categorias por produto; canecas agrupadas pelo objeto procurado. Busca encontra também os doces dos kits.
- Cards com preços visíveis e detalhes nativos. Seleção opcional de vários itens em lista, sem checkout.
- Preferir orçamento contextual por WhatsApp, sem prometer reserva ou pedido confirmado.
- `publicado: false` mantém noindex e exclui do sitemap; ativação futura depende da revisão comercial.
- Link de Natal na navegação apenas na branch, mantendo o layout principal.
- Validar geração, dados, DOM, fluxos, teclado e tamanhos mobile/desktop. Não ler screenshots sem pedido.

## Validação do MVP

- 43 verificações passaram em Chromium: 320, 390, 768, 1024 e 1440px, sem overflow da página.
- Conferidos 19 cards e 22 variantes, filtros cruzados dos kits, busca sem acentos e resultados vazios.
- Conferidos quantidades inválidas, limite acumulado, fechamento por Escape e retorno do foco.
- Conferidos preço por variante, sabor, taxa única de R$ 35, remoção e mensagem de WhatsApp.
- Conferidos catálogo sem JavaScript, fallback das imagens, noindex e exclusão do sitemap.
- Teste reproduzível: `tools/verificar-natal.cjs`, com Playwright instalado apenas no ambiente de QA.
- A conferência foi feita pelo DOM e comportamento; nenhuma captura foi lida.
