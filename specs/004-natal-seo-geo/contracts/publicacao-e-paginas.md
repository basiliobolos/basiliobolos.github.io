# Contrato público de páginas, pedidos e descoberta

Contrato do gerador local. Pilotos de produto permanecem condicionados, sem rota ativa.
Não cria API ou backend.

## Rotas

| Rota | Tipo | MVP | Canonical |
| --- | --- | --- | --- |
| `/natal/` | Coleção | Sim | Própria, sem query/hash |
| `/natal/biscoitos/` | Categoria | Sim | Própria, sem query/hash |
| `/natal/corporativo/` | Intenção | Sim | Própria, sem query/hash |
| `/natal/chocotones/` | Categoria | Condicionado | Própria se aprovada |
| `/natal/pao-de-mel/` | Categoria | Condicionado | Própria se aprovada |
| `/natal/canecas/` | Categoria | Condicionado | Própria se aprovada |
| `/natal/produtos/<slug>/` | Produto | Até três pilotos condicionados | Própria se aprovada |

Rota habilitada produz `dist/<rota>/index.html`. Rota desabilitada não gera
arquivo. O deploy real deve servir 200 para arquivos existentes e 404 para
ausentes; servidor de teste não deve usar fallback SPA que esconda erros.
Não introduzir `natal.html`, slugs com ano ou parâmetros como páginas indexáveis.

## HTML e navegação

- `lang=pt-BR`, um H1, title e description por intenção.
- Canonical absoluto em site.url, sem barra duplicada, query ou fragmento.
- Breadcrumb visível: Início → Natal → filha; produto usa coleção relevante.
- Home → Natal; Natal → filhas publicadas; filhas → Natal e relacionado útil.
- Não expor links de prévia no site público. Em desenvolvimento, links de
  revisão podem existir se todas as páginas envolvidas forem prévias.
- Links entre páginas usam `<a href>`; botões locais continuam filtros locais.
- Preço, unidade, taxa e pedido são legíveis sem modal ou scripts.
- Detalhes nativos podem começar fechados, mas o conteúdo já está no HTML.
- IDs de cards/versões antigos e novos continuam únicos no documento.
- Exibição só usa produtos selecionados, sem duplicar objetos de catálogo.
- Quantidade de cards não é fixa. Contagens, filtros, seleção e ItemList derivam
  dos dados; novos tipos/embalagens/kits não exigem código por nome de produto.
- Corporativo pode selecionar diferentes tipos físicos; não equivale à categoria biscoitos.

## Itens em catalogação e kits

`data/natal-rascunhos.json` é entrada separada; o gerador atual não o consome.
A futura promoção move registros para o catálogo principal com os mesmos IDs,
sem cópias ativas. Preço informado no orçamento não significa publicação aprovada.

No modo público, excluir rascunhos não selecionados antes de montar HTML,
JSON embutido, schema e resumos. Não basta ocultar um card por CSS.
Essa exclusão não bloqueia os itens prontos. Se a seleção pública pedir item
sem condições válidas, retornar erro; não descartá-lo silenciosamente.

Kit tem preço próprio e conteúdo com quantidades. Não somar valores avulsos
nem herdar prazo, conservação ou taxa de arte sem regra declarada. Referências
de componentes devem existir e não formar ciclos. Opções de massa, recheio,
formato e embalagem respeitam combinações permitidas; não expandir todas as
combinações em cards ou páginas por padrão.

Condições específicas de versão prevalecem sobre as comuns. Manter a distinção
entre validade e consumo sugerido, incluindo marco inicial quando informado.
Os dois cupcakes dos orçamentos têm regras de conservação independentes.

## JSON-LD

| Tipo de página | Entidades | Condição |
| --- | --- | --- |
| Coleção/categoria/intenção | Bakery, WebSite, BreadcrumbList, CollectionPage, ItemList | Refletir seleção e fatos públicos |
| Produto piloto | Negócio/site/trilha + Product | Produto específico e fatos revisados |
| Oferta no piloto | Offer | Preço/unidade/condições reais e apropriados |
| Prévia | Estrutura sem ofertas não confirmadas | Nunca preço sugerido como oferta pública |
| Encerrada | Estrutura útil, sem Offer ativo ou pedido da campanha | Estado de encerramento explícito |

Cada ItemList tem posições consecutivas, contagem correta, nomes completos e
URLs existentes. No MVP pode apontar a âncoras do hub; não fingir páginas de
produto inexistentes. Toda imagem estruturada precisa ser real, acessível e
apresentada no contexto correspondente.

Product/Offer não são exigidos em categoria e não garantem listagem comercial.
Preço sob consulta é ausência de Offer; não usar 0, “a partir de” em campo
numérico ou InStock inferido. Taxa por arte não pode desaparecer da condição
visível. Não fabricar review, aggregateRating, GTIN, frete ou retorno.
Não depender de FAQ rich result; manter dúvidas visíveis úteis.

## Prontidão e efeitos de estado

- `publicado:false`: `noindex, nofollow`; sem URL em sitemap/llms.
- `publicado:true` + página não publicada: mesma prévia, sem link público.
- Publicação solicitada com revisão inválida de página ou item selecionado:
  erro de build identificando página, item e campo; nenhum deploy desse build.
  Rascunho fora dessa seleção não impede publicar a seleção pronta.
- Página pronta aberta: `index, follow`, canonical e descoberta consistentes.
- Página pronta encerrada: `index, follow`, aviso, contato geral; nenhum link
  contextual que pareça aceitar encomenda natalina.
- `robots.txt` permite o acesso necessário para ler noindex. Isso não torna
  prévia privada. Dados de revisão e conteúdo interno não são copiados a dist.

## Sitemap, resumo e data

Usar o mesmo registro público na navegação, sitemap e llms.txt. Somente URLs
canônicas e reais; sem âncoras/UTMs/prévias. Imagens são locais e aprovadas.
`lastmod` vem de atualização relevante verificada; sem evidência, omitir.
Build idêntico não muda lastmod. llms.txt é saída derivada opcional, sem ganho
de ranking presumido. Não incluir metadados privados de revisão nesse resumo.

## Pedido via WhatsApp

Destino: `https://wa.me/<site.whatsappNumero>?text=<mensagem codificada>`.
Usar somente número canônico. Preservar texto com nome completo e recheio
selecionado; quantidade/data e fechamento ficam no atendimento.
Empresas recebem contato contextual para orçamento; sem reserva automática.
Abrir em aba nova preservando `rel=noopener`. Sem consentimento de analytics,
o link funciona do mesmo jeito.

## Evento de analytics

Nome único já existente: `whatsapp_click`.

| Parâmetro | Origem |
| --- | --- |
| `page` | pathname atual, sem query |
| `catalog_page` | ID editorial da página |
| `product_id` | ID público do produto, quando aplicável |
| `variant_id` | ID estável da versão escolhida |
| `flavor_id` | ID estável do recheio, quando escolhido |
| `placement` | Enum: card, detalhes, modal, empresas, cabecalho, flutuante, rodape |
| `campaign_year` | Ano da coleção |

Não incluir campos ausentes como texto livre. Não enviar corpo da mensagem,
consulta digitada, URL com parâmetros, nome, contato ou foto de cliente.
Um clique gera no máximo um evento, e só após consentimento aceito.
Alterar versão/recheio no modal atualiza o contexto antes do clique.
No Natal, o campo legado `location` deve ser substituído pelo enum `placement`;
não reutilizar aria-label como um campo de texto livre de alta cardinalidade.
Nas páginas permanentes, manter compatibilidade durante a migração.

## Validação e limites externos

Fixtures de prévia, ativa inválida, ativa válida e encerrada não alteram
data/natal.json real. Diferenças em imagem/preço invalidam a revisão da fixture.
Testar 390px e 1440px por DOM/fluxo; capturas não são requisito desta entrega.

Inspeção externa confirma estado publicado. Relatórios de Search Console/Bing,
acesso real de robôs e métricas de campo não podem ser aprovados por simulação.
Publicação não implica indexação, citação, ranking ou venda.
