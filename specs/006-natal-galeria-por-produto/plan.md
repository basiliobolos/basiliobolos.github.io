# Implementação da galeria

Manter composição, preços, versões, sabores e fotos no cadastro. Gerar um card por
produto e manter âncoras, detalhes e pedidos individuais das versões.

No modal, montar a sequência com as fotos das versões e dos sabores cadastrados.
Quando o produto tiver uma foto geral, usá-la como capa e primeiro slide.
Neste slide, aguardar a escolha do modelo antes de montar o pedido.
Deduplicar fotos compartilhadas dentro da versão. Usar a foto selecionada para
sincronizar os seletores, o preço, os detalhes e o pedido, sem avanço automático.
Deslizar as fotos juntas dentro da área quadrada. Pré-carregar as fotos vizinhas
e deixar apenas a foto ativa na galeria ao terminar o movimento.

Validar o catálogo e os fluxos no DOM em 390px e 1440px com Playwright.
