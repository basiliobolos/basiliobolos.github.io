# Guia de UX do Site

Este guia define como manter todas as páginas simples de entender, com baixa complexidade cognitiva, hierarquia clara e contraste consistente entre as seções.

## Objetivos

- Ajudar a pessoa a encontrar rapidamente o que procura.
- Apresentar uma decisão principal por vez.
- Destacar preços, opções, condições e chamadas para ação.
- Separar visualmente cada etapa da leitura.
- Preservar a leitura e a interação em telas pequenas.

## Redução Cognitiva

### Uma decisão por seção

Cada seção deve responder a uma pergunta principal. Adapte os títulos ao conteúdo da página:

| Tipo de seção | Pergunta respondida |
| --- | --- |
| Hero ou introdução | O que esta página oferece? |
| Catálogo ou seleção | O que posso escolher? |
| Preços ou detalhes | Quanto custa e o que está incluído? |
| Opções ou personalização | Como posso configurar o produto? |
| Informações importantes | Quais regras preciso saber? |
| FAQ | Qual dúvida específica foi respondida? |
| CTA | Qual é o próximo passo? |

### Texto

- Use títulos curtos e orientados à ação.
- Use no máximo uma frase de apoio por seção quando ela ajudar a decisão.
- Não repita no texto uma informação que já está clara em uma tabela ou cartão.
- Mantenha informações úteis, como preços, prazos, disponibilidade e condições.
- Mantenha informações relevantes para SEO nos metadados sem transformar o conteúdo principal em texto longo.
- Prefira listas, tabelas e cartões a parágrafos extensos.
- Use divulgação progressiva, como FAQ e detalhes recolhíveis, para informações secundárias.
- Remova palavras promocionais que não ajudam a pessoa a escolher ou agir.

### Componentes

- Todo cartão deve ter uma hierarquia visível: título, informação complementar opcional e dado principal.
- Separe observações, condições e valores com elementos e classes diferentes.
- Não mostre o mesmo preço ou benefício em vários lugares sem uma razão clara.
- Use rótulos curtos em tabelas, botões, badges e atributos `data-label`.
- Preserve nomes acessíveis e textos alternativos mesmo quando o texto visual for reduzido.

## Intercalação De Cores

As seções de conteúdo devem alternar entre dois fundos neutros da mesma família. A alternância cria separação visual sem transformar cada seção em uma nova cor.

### Padrão

- Seção 1: superfície clara.
- Seção 2: superfície escura.
- Seção 3: superfície clara.
- Seção 4: superfície escura.
- Continue a alternância até o fim da página.

### Paleta

- Bege claro: `#f8eee3`.
- Bege escuro: `#dcc1a9`.
- Cartões e tabelas: branco ou quase branco.
- Texto: marrom escuro com contraste suficiente.
- Hero e CTA podem usar o marrom da marca como exceção estrutural.

### Regras de cor

- Use uma cor sólida dominante por seção.
- Atribua classes semânticas de superfície, como `section-surface-light` e `section-surface-dark`, quando criar novas páginas.
- Não introduza verde, rosa ou outra cor de fundo para uma única seção sem uma decisão de design explícita.
- Efeitos de sombra, borda, hover e destaque dos cartões podem continuar sendo usados.
- Gradientes devem ser reservados para elementos específicos quando não prejudicarem a leitura da alternância.
- Mantenha contraste suficiente entre texto, fundo, links e cartões.

## Responsividade

- Confira cada página em pelo menos `390px` e `1440px` de largura.
- Não dependa apenas de cor para indicar seleção, estado ou erro.
- Componentes em colunas devem se reorganizar sem comprimir o texto.
- Tabelas devem virar cards ou manter rolagem controlada, sem causar overflow horizontal na página.
- Títulos, observações e valores devem continuar distinguíveis no mobile.
- Botões devem ter área de toque confortável e texto curto.
- Não esconda preços, condições ou ações essenciais apenas para economizar espaço.
- Verifique que banners, menus fixos e avisos não bloqueiem permanentemente o conteúdo.

## Onde Alterar

- Textos, preços, opções, FAQs e dados de produtos: arquivos em `data/*.json`.
- Estrutura, ordem e conteúdo gerado: `tools/gerar.js`.
- Cores, espaçamento e comportamento responsivo: `css/styles.css`.
- Interações de navegação e componentes: `js/app.js`.
- HTML gerado: não editar diretamente os arquivos `index.html` publicados.

## Checklist

- [ ] Cada seção tem uma pergunta ou decisão principal.
- [ ] O texto de apoio é curto e não repete cartões ou tabelas.
- [ ] A página alterna entre superfície clara e escura.
- [ ] Nenhuma seção usa uma cor isolada sem justificativa.
- [ ] Cartões têm hierarquia entre título, observação e dado principal.
- [ ] Preços e condições essenciais aparecem uma vez, no lugar mais útil.
- [ ] Não há overflow horizontal em `390px`.
- [ ] A página foi conferida em desktop e mobile.
- [ ] Navegação, foco e estados continuam compreensíveis sem depender só da cor.

## Validação

Após alterar dados ou o gerador, execute na raiz do projeto:

```bash
node --check tools/gerar.js
node tools/gerar.js
git diff --check
```

Confirme também que os JSONs continuam válidos e que as páginas geradas mantêm preços, textos, acessibilidade e componentes esperados.
