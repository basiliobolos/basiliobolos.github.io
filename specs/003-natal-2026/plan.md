# Natal 2026 — plano e diário
Data inicial: 03/11/2026.
Estado: etapa 1, aguardando escolha dos tipos de produto.
Branch: `feat/natal-2026-seo`, criada a partir de `b93e18f` (`fix/horarios-retirada`).
Escopo inicial: planejamento; sem alteração pública, push ou publicação.

## Direção confirmada
- Criar uma seção com aparência natalina, acima de “Nossos Produtos”.
- Melhorar a busca orgânica com ofertas viáveis para a Basilio Bolos.
- Pesquisar buscas e interesse no Google, TikTok e Instagram.
- O cardápio de 2025 não será mantido automaticamente: haverá saídas e novidades.
- Primeiro, confirmar o que a confeiteira domina e aceita produzir.
- A pesquisa poderá propor novidades dentro dos tipos aprovados.
- Documentar fontes, dados, limites, decisões e mudanças durante cada etapa.

## Etapas e critérios de conclusão
| Etapa | Trabalho | Saída verificável |
|---|---|---|
| 1 — Escolha | Confirmar tipos aceitos, recusados e condicionais | Lista respondida pelo usuário |
| 2 — Viabilidade | Confirmar sabores, técnicas, embalagem, capacidade, custos e prazos | Limites de produção e pedido |
| 3 — Pesquisa | Medir busca sazonal e interesse social pelos tipos aceitos | Fontes datadas e dados reproduzíveis |
| 4 — Estratégia | Cruzar procura, compra, concorrência local e trabalho necessário | Seleção fundamentada e dúvidas explícitas |
| 5 — Oferta | Fechar produtos, preços, fotos e regras de Natal | Cardápio 2026 confirmado |
| 6 — Site | Registrar spec.md; implementar seção e SEO no gerador | Branch pronta para revisão |
| 7 — Validação | Conferir conteúdo, links, celular, SEO e geração | Resultados registrados |
| 8 — Medição | Definir publicação e acompanhar contatos e pedidos | Linha de base e revisões datadas |

## Lista inicial para escolha
Todos os itens estão pendentes. Não representam ranking, tendência ou oferta.
“Base” indica apenas a origem da ideia, nunca disponibilidade em 2026.
| Nº | Tipo | Exemplos | Base |
|---|---|---|---|
| 1 | Chocotones recheados | Grandes e minis | Histórico |
| 2 | Doces de chocotone | Bites e fatias banhadas | Histórico + hipótese |
| 3 | Brownies natalinos | Bites, árvores e guirlandas | Catálogo + hipótese |
| 4 | Biscoitos natalinos | Carimbados, decorados e banhados | Catálogo e histórico |
| 5 | Biscoitos de pintar | Kit com tinta comestível | Histórico |
| 6 | Cupcakes natalinos | Unidades e caixas | Catálogo e histórico |
| 7 | Brigadeiros e trufas | Caixas para presente | Catálogo + hipótese |
| 8 | Pipoca gourmet | Pacotes e lembrancinhas | Catálogo e histórico |
| 9 | Bolos natalinos | Guirlanda e bolo decorado | Catálogo e histórico |
| 10 | Bentôs natalinos | Sozinhos ou com doces | Adaptação do catálogo |
| 11 | Sobremesas de travessa | Pavê, banoffee e bombom de frutas | Nova família a confirmar |
| 12 | Tortas doces | Chocolate, limão e frutas | Nova família a confirmar |
| 13 | Pudins | Inteiros ou individuais | Nova família a confirmar |
| 14 | Cheesecakes | Inteiros ou individuais | Nova família a confirmar |
| 15 | Caixas com vários doces | Combinações dos produtos aceitos | Catálogo + composição a confirmar |

Resposta esperada: números aceitos, recusados ou “depende”, com restrições.
O usuário pode acrescentar produtos não listados. Não presumir novas técnicas.
Depois da escolha, confirmar limites de personalização, produção por dia e retirada natalina.

## Protocolo da pesquisa futura
- Google Trends: comparar Brasil e São Paulo; usar Santo André/ABC apenas com amostra suficiente.
- Usar 2024 e 2025 completos para sazonalidade, e 2026 apenas até a data da coleta.
- Comparar termos e tópicos corretamente; registrar janela, local, categoria e tipo de busca.
- Exportar CSV quando disponível; guardar consulta, data, fonte e arquivo de cada evidência.
- Usar termo comum entre lotes comparáveis. Índice 0–100 não é volume absoluto.
- Ausência de dados locais não equivale a ausência de demanda.
- Verificar acesso público ao TikTok Creative Center e às publicações do TikTok/Instagram.
- Registrar links, datas, país, métricas visíveis e tamanho da amostra social.
- Avaliar comentários de compra, preço e retirada; separar de elogios e interesse em receitas.
- Não comparar números brutos entre plataformas nem tratar um viral isolado como demanda local.
- Separar alcance, interesse de compra e pedidos. Não inferir vendas por curtidas.
- Registrar acessos bloqueados e lacunas. Solicitar conexão/exportação somente quando necessária.
- Não contratar ferramentas, instalar conexões ou usar contas privadas sem autorização.
- Quando disponíveis, cruzar Search Console, GA4 e vendas históricas agregadas autorizadas.
- Priorizar adequação técnica e disposição; depois busca, intenção local, margem e horas de trabalho.
- Sem custos, capacidade e conversão, não calcular retorno financeiro ou prometer resultado.
- Para cada achado: observação, hipótese, confiança, decisão e próxima verificação.

## Implementação prevista
Conteúdo e preços em data/*.json; estrutura em tools/gerar.js; estilo em css/styles.css.
A seção deve anteceder #produtos e funcionar em 390px e 1440px.
Definir se uma página natalina própria agrega conteúdo útil após fechar o cardápio.
Validar títulos, descrições, links internos, canonical, sitemap e dados estruturados aplicáveis.
Usar fotos de ofertas reais, textos claros, condições de retirada e contato por produto.
Não publicar preços antigos, avaliações inventadas nem oferta ainda sem confirmação.
Conferir JSON, node --check tools/gerar.js, node tools/gerar.js e git diff --check.
Conferir DOM, links, preços, responsividade e acessibilidade. Capturas só se solicitadas.
Medir contatos pelo WhatsApp e pedidos agregados; clique não equivale a venda.

## Diário de descobertas
- 03/11: data/campanhas.json contém 14 itens do Natal 2025; ativo=false.
- 03/11: tools/gerar.js já insere campanha antes de #produtos quando ativa.
- 03/11: existem 14 imagens natalinas; conferir adequação aos produtos de 2026.
- 03/11: catálogo regular inclui bentô com seis ou 16 doces e caixas mistas.
- 03/11: site.json informa retirada agendada e ausência de entrega própria.
- 03/11: preços, produção e calendário natalinos de 2026 ainda não confirmados.
- 03/11: pesquisa SEO anterior não obteve séries do Trends; não fornece ranking medido.
- 03/11: usuário esclareceu que vários itens antigos sairão e novos entrarão.
- 03/11: nenhum dado externo de tendência foi coletado nesta etapa.
- 03/11: quatro documentos anteriores em docs/seo estavam sem versionamento; preservados.
- 03/11: base local contém ajuste de horários; atualização remota ainda não verificada.

## Próximo passo
Receber a seleção do usuário. Depois, pesquisar somente famílias viáveis.
