# Base de pesquisa: SEO, GEO e catálogo local

Consulta: 14/11/2026. Fontes oficiais para regras de plataformas; artigos dos
próprios autores para pesquisa. Diretrizes não provam resultado para este site.

## Novidades que mudam este planejamento

1. O guia de IA do Google, atualizado em julho de 2026, rejeita atalhos como
   arquivos especiais, texto moldado só para IA e menções artificiais. O trabalho
   recomendado continua centrado em conteúdo útil e acesso técnico.
   [Google: otimização para IA](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).
2. FAQ rich results deixaram de aparecer em 07/05/2026; a documentação foi
   removida em junho. A regra antiga de saúde/governo já não é a referência
   atual. Manter respostas úteis; não prometer destaque por FAQPage.
   [Google: mudanças de 2026](https://developers.google.com/search/updates#may-2026).
3. O Search Console documenta controle de inclusão em IA e relatório próprio
   de impressões, com expansão mundial em 31/08/2026. Conferir a propriedade
   real; ausência do relatório pode decorrer de volume insuficiente.
   [Controle](https://support.google.com/webmasters/answer/16908024),
   [relatório](https://support.google.com/webmasters/answer/16984139).
4. O Bing lançou AI Performance em fevereiro e acrescentou Intents, Topics,
   Citation Share e Compare em junho de 2026. São observações de citações,
   não uma posição universal em IA.
   [Bing: fevereiro](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/),
   [Bing: junho](https://blogs.bing.com/search/2026/6/New-AI-Visibility-Insights-in-Bing-Webmaster-Tools-Intents-Topics-Citation-Share-Compare/).
5. A nova documentação do Google, datada de 12/11/2026, explica que Referer
   não traz a busca digitada e pode faltar. Referrer sozinho não separa todas
   as experiências de IA nem substitui o Search Console.
   [Google: origem do tráfego](https://developers.google.com/search/docs/monitor-debug/identify-google-search-traffic).

O documento antigo “AI features and your website” ainda descreve medição
agregada em Web. Para novidades de controle e relatório, usar os documentos
específicos mais recentes acima e registrar divergências, sem supor acesso
ou métricas que não foram observados na conta.
[Documento anterior](https://developers.google.com/search/docs/appearance/ai-features).

## Regras oficiais e aplicação local

| Tema | O que a fonte sustenta | Decisão para a Basilio |
| --- | --- | --- |
| Descoberta | Links navegáveis ajudam a encontrar categorias e produtos | HTML com links entre home, Natal e páginas filhas; busca não é o único caminho. [Estrutura](https://developers.google.com/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure) |
| URLs | Fragmentos não representam páginas distintas no índice | `#empresas` continua âncora; `/natal/corporativo/` será uma página real. [URLs](https://developers.google.com/search/docs/specialty/ecommerce/designing-a-url-structure-for-ecommerce-sites) |
| Canonical | É um sinal de preferência para páginas duplicadas | Cada seleção útil tem canonical próprio; parâmetros de campanha não o alteram. [Canonical](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) |
| Conteúdo | Páginas em escala para manipular busca podem violar políticas | Não criar combinações produto × bairro × público. [Spam](https://developers.google.com/search/docs/essentials/spam-policies) |
| Catálogo | CollectionPage descreve página de coleção | Usar com ItemList; não é garantia de resultado especial. [Schema.org](https://schema.org/CollectionPage) |
| Produto | Product rich results se concentram num produto ou suas variantes | Reservar candidatos a páginas de produto; dados finais e visíveis. [Product snippets](https://developers.google.com/search/docs/appearance/structured-data/product-snippet) |
| Merchant | Requer elegibilidade comercial e compra no site | WhatsApp e orçamento não equivalem a checkout; feed comercial fica condicionado. [Merchant listing](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing), [loja](https://support.google.com/merchants/answer/12160471?hl=en) |
| Atualização | lastmod deve refletir mudança relevante; priority/changefreq são ignorados pelo Google | Usar revisão real da página ou omitir data. [Sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) |
| Prévia | noindex precisa ser lido pelo robô; robots não é proteção de acesso | Preservar prévia, sem bloqueio que impeça ler a diretiva. [noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing) |
| Imagens | Imagens acessíveis e descrições úteis apoiam descoberta visual | Fotos reais por versão, dimensões, tamanhos adequados e alt fiel. [Imagens](https://developers.google.com/search/docs/appearance/google-images) |
| Experiência | Bons limites de campo no p75: LCP ≤ 2,5s, INP ≤ 200ms, CLS ≤ 0,1 | Meta de acompanhamento, sem alegar medição de campo por teste local. [Web Vitals](https://web.dev/articles/vitals) |
| Local | Relevância, distância e destaque compõem os resultados locais | Perfil coerente, horários especiais, fotos e avaliações reais; bairro no texto não muda a distância. [Perfil da Empresa](https://support.google.com/business/answer/7091?hl=pt-BR) |
| Sazonal | URLs recorrentes e descoberta antecipada são úteis em eventos | Manter `/natal/` entre anos; adaptar a recomendação sem prometer carrossel promocional. [Eventos](https://developers.google.com/search/blog/2021/07/deals-best-practices) |
| Notificação | IndexNow notifica motores participantes sobre URLs alteradas | Opção posterior ao deploy confirmado, apenas URLs públicas alteradas. Não é envio ao Google. [IndexNow](https://www.indexnow.org/documentation) |

## Busca com IA: agentes diferentes, fins diferentes

| Plataforma | Busca | Ação da pessoa | Treinamento | Aplicação |
| --- | --- | --- | --- | --- |
| Google | Googlebot e controles Search | Conforme produto | Google-Extended em seus usos próprios | Conferir robôs e inclusão Search generative AI separadamente. [Google](https://developers.google.com/search/docs/appearance/ai-features), [controle atual](https://support.google.com/webmasters/answer/16908024) |
| OpenAI | OAI-SearchBot | ChatGPT-User | GPTBot | Busca e treinamento têm controles independentes. Não exigir GPTBot para citar o site. [OpenAI Docs](https://developers.openai.com/api/docs/bots) |
| Perplexity | PerplexityBot | Perplexity-User | PerplexityBot não é usado para treinar modelos-base | Conferir acesso de busca; requisições iniciadas por pessoas têm regras distintas. [Perplexity](https://docs.perplexity.ai/docs/resources/perplexity-crawlers) |
| Anthropic | Claude-SearchBot | Claude-User | ClaudeBot | Não confundir o robô de treino com descoberta em buscas. [Anthropic](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) |
| Microsoft | Bingbot e índice Bing | Conforme produto | Não decidir política de treino por inferência | Auditar Bing Webmaster Tools e Bing Places. [Bing](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/) |

O `User-agent: *` atual já permite acesso geral. Não adicionar blocos específicos
redundantes que eliminem por engano o bloqueio de `/data/`. Se houver WAF/CDN,
conferir logs e IPs publicados; um User-Agent enviado em um teste não comprova
que o robô real consegue entrar. Não alterar política de treino nesta entrega.

## O que a pesquisa acadêmica permite concluir

- **GEO, KDD 2024:** mostrou ganhos em seu benchmark, variáveis por domínio.
  Não medir a meta da confeitaria pelo “até 40%” desse experimento.
  [Artigo original, versão de junho de 2024](https://arxiv.org/abs/2311.09735).
- **Survey crítico, julho de 2026:** separa descoberta, recuperação, citação e
  efeito comercial. Relata limites de transferência e variabilidade; sustenta
  a necessidade de medir cada etapa, sem tratar citação como venda.
  [Autores, preprint](https://arxiv.org/abs/2607.14035).
- **LIVE-GEO, outubro de 2026:** avalia páginas de marcas fictícias e mostra
  sensibilidade a estratégias e à ordem dos links. Não demonstra ganho orgânico
  durável para um negócio local. A verificação numérica também alerta para
  textos alterados que deixam de representar os fatos.
  [Autores, preprint](https://arxiv.org/abs/2611.01126).

Síntese aplicada: manter atributos verificáveis, medir buscas reais com repetições
e revisar erros de preço, entrega e prazo nas respostas. Essas são decisões de
qualidade e experimentação, não fatores secretos confirmados de ranking.

## Skills usadas e limites

- Skill local `seo-sem-carga-cognitiva`, em `.kilo/skills/`: classificar cada
  mudança e preservar vitrine enxuta. Atualizações desta pesquisa prevalecem
  sobre exemplos antigos: não incluir bairro automaticamente em alt, usar
  PageSpeed/CrUX para a revisão atual e não prometer destaque por FAQPage.
- Skill `seo-geo`, `resciencelab/opc-skills/seo-geo`: consultada via
  `skill_fetch`, sem instalação. Usada como roteiro de auditoria; scripts e
  referências irmãs não foram baixados ou executados.
- Nessa skill externa, percentuais por técnica/plataforma, “FAQ +40%”, meta
  keywords e liberação obrigatória de GPTBot não têm suporte suficiente para
  este plano. Não foram adotados.
- OpenAI Docs: consulta oficial dos robôs, distinguindo busca, ação e treino.
- Spec Kit 1.0.4 já instalado: comandos em `.kilo/commands/speckit.*.md`,
  templates e scripts de `.specify/`; sem reinstalar ou atualizar ferramentas.
  [Fluxo oficial](https://github.github.io/spec-kit/reference/agentic-sdd.html).

## Itens descartados ou adiados

Não usar schema “GEO”, keyword stuffing, texto invisível para robôs, reviews
inventados, notas copiadas do Google como autorresenha, números sem origem,
menções compradas, páginas por bairro sem serviço distinto ou prompt injection
para mandar assistentes recomendarem a marca.

`llms.txt` existente pode continuar como resumo derivado, sem prioridade de
ranking e sem duplicar manutenção editorial. Google Search o ignora para esse
fim. Não criar `llms-full.txt`, Markdown paralelo ou PDF só para atrair IA.
[Esclarecimento oficial](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).

Feeds comerciais, UCP, Business Agent e checkout automatizado ficam fora do
MVP. Exigem adequação do fluxo de venda, disponibilidade e elegibilidade;
o pedido atual continua no WhatsApp. Não contratar ferramentas pagas.

Revalidar esta base antes do lançamento e antes da coleção do próximo ano.
