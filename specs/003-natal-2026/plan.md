# Implementação

- Dados e textos em `data/natal.json`; empresa em `data/site.json`.
- Renderização em `tools/gerar.js`, CSS próprio em `css/natal.css` e JS em `js/natal.js`.
- Sem framework ou carrossel. Imagens com dimensões e lazy loading; subconjunto local de SVGs Lucide.
- Categorias por produto; canecas agrupadas pelo objeto procurado. Busca encontra também os doces dos kits.
- Cards com preços e links diretos ao WhatsApp; detalhes nativos recolhidos. Sem sacola ou quantidade.
- Preferir orçamento contextual por WhatsApp, sem prometer reserva ou pedido confirmado.
- `publicado: false` mantém noindex e exclui do sitemap; ativação futura depende da revisão comercial.
- Link de Natal na navegação apenas na branch, mantendo o layout principal.
- Validar geração, dados, DOM, fluxos, teclado e tamanhos mobile/desktop. Não ler screenshots sem pedido.

## Revisão da interface

- Reutilizar navbar, footer, waFloat e privacyBanner; estilos próprios mantêm a paleta natalina.
- Carregar app.js para preservar menu, consentimento e comportamento original do WhatsApp.
- Dropdown nativo leve no Natal; Font Awesome apenas para símbolos de marcas existentes.
- Remover filtro de orçamento e personalização, incluindo lógica, estilos e testes antigos.
- Cards de variantes com duas fotos equivalentes e escolha direta; modal com miniaturas e fotos de recheios.
- Dados de foto editáveis por variante e por sabor em natal.json, sem reutilizar uma foto para opções distintas.

## Validação do MVP

- 43 verificações passaram em Chromium: 320, 390, 768, 1024 e 1440px, sem overflow da página.
- Conferidos 19 cards e 22 variantes, filtros cruzados dos kits, busca sem acentos e resultados vazios.
- Conferidos quantidades inválidas, limite acumulado, fechamento por Escape e retorno do foco.
- Conferidos preço por variante, sabor, taxa única de R$ 35, remoção e mensagem de WhatsApp.
- Conferidos catálogo sem JavaScript, fallback das imagens, noindex e exclusão do sitemap.
- Teste reproduzível: `tools/verificar-natal.cjs`, com Playwright instalado apenas no ambiente de QA.
- A conferência foi feita pelo DOM e comportamento; nenhuma captura foi lida.

## Validação da revisão

- 77 verificações passaram em Chromium, incluindo menu desktop/mobile, teclado, consentimento, fotos independentes por versão e recheio e busca sem acentos.
- Conferidos preços, taxa única, lista, mensagem do WhatsApp e funcionamento sem JavaScript.
- Larguras de 320, 390, 768, 1024 e 1440px sem overflow horizontal.
- Gerador, JSON e diff validados; dist permanece fora do versionamento.
- Conferência por DOM e comportamento, sem leitura de capturas.

## Pedido direto e redução de texto

- Códigos explícitos em natal.json, independentes da ordem dos cards.
- Gerador valida referências e cria mensagens canônicas para produto, versão e recheio.
- Links no próprio card funcionam sem JavaScript; modal opcional apenas para fotos, versões e recheios.
- Remover lista, quantidade, totais, eventos e estilos associados.
- Remover chamadas repetidas e descrições da vitrine; preservar preço e taxa de personalização visíveis.
- Cards empresariais usam a mesma estrutura vertical dos demais, com colunas de largura mínima zero.

## Validação do pedido direto

- 234 verificações passaram em Chromium: referências únicas, links de todos os produtos e versões, recheios e abertura do WhatsApp em aba própria com destino simulado no teste.
- Ausência de sacola, quantidade, formulários de compra e totais confirmada no DOM.
- Cards para empresas conferidos sem cortes em 320, 390, 540, 768, 1024, 1280 e 1440px, incluindo expansão dos detalhes.
- Navegação, privacidade, fotos, busca por código, teclado e pedidos sem JavaScript preservados.
- Geração e sintaxe aprovadas; validação por DOM e comportamento, sem leitura de capturas.
