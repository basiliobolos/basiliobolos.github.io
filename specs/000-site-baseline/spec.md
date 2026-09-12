# Feature Specification: Baseline do Site Basilio Bolos

**Feature Branch**: `000-site-baseline`
**Created**: 2026-09-08
**Status**: Baseline
**Input**: Consolidar os requisitos funcionais e não funcionais do site estático.

## User Scenarios & Testing

### User Story 1 - Consultar o catálogo (Priority: P1)

Como pessoa interessada em encomendar, quero encontrar os produtos da Basilio Bolos e
entender rapidamente quais opções existem, para decidir o que combina com a minha ocasião.

**Why this priority**: o catálogo é o caminho principal entre a descoberta do negócio e o
contato para o pedido.

**Independent Test**: abrir a home em uma tela mobile e localizar um produto, sua página
detalhada e o próximo passo para entrar em contato.

**Acceptance Scenarios**:

1. **Given** a home carregada, **When** a pessoa navega pelos produtos, **Then** cada card
   informa o produto e leva à página correspondente.
2. **Given** uma página de produto, **When** a pessoa procura opções, **Then** encontra
   preços, condições, perguntas frequentes e informações suficientes para decidir.

---

### User Story 2 - Escolher e solicitar um pedido (Priority: P1)

Como pessoa que já escolheu um produto, quero saber as condições de pedido e falar com a
Basilio Bolos pelo canal correto, para solicitar um orçamento sem procurar informações em
outro lugar.

**Why this priority**: o site apoia a conversão por contato, não por checkout online.

**Independent Test**: a partir de uma página comercial, conferir preço inicial, prazo,
retirada, pagamento e CTA de WhatsApp ou contato.

**Acceptance Scenarios**:

1. **Given** uma página comercial, **When** a pessoa consulta as informações de pedido,
   **Then** vê prazo mínimo, forma de confirmação, pagamento e retirada.
2. **Given** um CTA de contato, **When** a pessoa o aciona, **Then** o link abre o canal
   correspondente com uma mensagem contextualizada quando aplicável.

---

### User Story 3 - Encontrar uma informação confiável (Priority: P2)

Como pessoa que encontra o site por busca, compartilhamento ou rede social, quero reconhecer
o negócio e confirmar localização, atendimento e produto, para decidir se a página é relevante.

**Why this priority**: informações coerentes aumentam a confiança e evitam contatos baseados
em preço, horário ou endereço incorretos.

**Independent Test**: acessar diretamente uma página comercial e verificar identidade,
produto, cidade, preço ou regra de cálculo, contato e URL canônica.

**Acceptance Scenarios**:

1. **Given** uma URL pública comercial, **When** um crawler ou pessoa acessa a página,
   **Then** encontra conteúdo textual, metadados e links coerentes com o produto.
2. **Given** uma alteração de preço ou política, **When** o site é gerado novamente,
   **Then** o dado atualizado aparece no conteúdo público relacionado.

---

### User Story 4 - Atualizar o catálogo com segurança (Priority: P1)

Como pessoa responsável pelo site, quero alterar dados em uma fonte única e gerar todas as
páginas, para reduzir divergências entre cards, tabelas, FAQs e metadados.

**Why this priority**: preços e condições inconsistentes comprometem a operação e a
confiança do cliente.

**Independent Test**: alterar um dado de produto, gerar o site e confirmar que as páginas e
artefatos derivados exibem o novo valor sem edição manual de HTML.

**Acceptance Scenarios**:

1. **Given** um arquivo de dados válido, **When** a pessoa executa o gerador, **Then** as
   páginas públicas e artefatos derivados são recriados.
2. **Given** um JSON inválido ou dado obrigatório ausente, **When** a validação é executada,
   **Then** a falha é identificável antes da publicação.

### Edge Cases

- Um produto sazonal desativado não pode aparecer como disponível no catálogo principal.
- Um preço alterado deve atualizar também o texto, a FAQ e os metadados que dependem dele.
- Uma tabela que não couber em 390px deve reorganizar-se ou usar rolagem controlada sem
  causar overflow horizontal na página inteira.
- Uma imagem ausente, um link inválido ou um campo obrigatório vazio deve ser detectado
  durante a geração ou revisão antes do deploy.
- Informações sem confirmação, como avaliações, disponibilidade, endereço ou horário, não
  podem ser inventadas para melhorar SEO.

## Requirements

### Functional Requirements

- **FR-001**: O site MUST apresentar o catálogo de produtos e encaminhar cada produto para
  uma página comercial própria quando houver detalhes específicos.
- **FR-002**: Cada página comercial MUST apresentar descrição, opções, preço inicial ou regra
  de cálculo, condições relevantes, FAQ quando aplicável e um próximo passo claro.
- **FR-003**: O site MUST apresentar os formatos, tamanhos, sabores, coberturas e adicionais
  de bolos personalizados que estiverem ativos nos dados de origem.
- **FR-004**: O site MUST informar telefone, WhatsApp, endereço ou forma de retirada, horário,
  antecedência mínima, confirmação e meios de pagamento conforme os dados oficiais.
- **FR-005**: O site MUST oferecer links de contato funcionais e preservar a mensagem padrão
  ou contextualizada definida para o canal de pedido.
- **FR-006**: O gerador MUST produzir páginas públicas, página de erro, página de privacidade,
  sitemap e resumo para rastreadores a partir dos dados e regras do projeto.
- **FR-007**: O sistema MUST calcular preços derivados a partir dos campos canônicos dos dados
  e exibir o mesmo resultado em cards, tabelas, FAQs e metadados relacionados.
- **FR-008**: O conteúdo sazonal MUST poder ser ativado ou desativado sem remover a estrutura
  permanente do catálogo.
- **FR-009**: O site MUST manter links internos para a home, páginas de produto, contato e
  âncoras de preços quando essas páginas ou seções existirem.

### Non-Functional Requirements

- **NFR-001**: O conteúdo público MUST estar em português do Brasil, com linguagem clara,
  títulos curtos e uma decisão principal por seção.
- **NFR-002**: A interface MUST permanecer legível e utilizável em 390px e 1440px, sem
  overflow horizontal da página e sem esconder preço, condição ou ação essencial no mobile.
- **NFR-003**: Componentes interativos MUST ter nomes acessíveis, imagens relevantes MUST ter
  texto alternativo e estados MUST ser compreensíveis sem depender apenas de cor.
- **NFR-004**: Preços, endereço, telefone, horário, políticas, disponibilidade e descrições
  MUST ser verdadeiros, consistentes e derivados da fonte oficial correspondente.
- **NFR-005**: Páginas comerciais MUST ser rastreáveis, ter URLs canônicas coerentes e usar
  metadados, dados estruturados e sitemap somente para fatos visíveis e verificáveis.
- **NFR-006**: SEO MUST melhorar descoberta sem repetir palavras-chave, criar páginas
  artificiais, inventar avaliações ou aumentar a carga cognitiva da página.
- **NFR-007**: As páginas principais MUST ter como metas LCP de até 2,5 s, INP abaixo de
  200 ms e CLS abaixo de 0,1, medidos em condições representativas de mobile e desktop.
- **NFR-008**: O processo de geração MUST ser reproduzível a partir do código-fonte, sem
  edição manual de HTML gerado ou dependência de credenciais no repositório.
- **NFR-009**: Dados alterados MUST continuar em JSON válido e a publicação MUST passar pelas
  validações e pelo workflow de GitHub Actions definidos na arquitetura.

### Key Entities

- **Produto**: item comercial exibido no catálogo, com slug, título, descrição, imagem, preço
  ou referência de preço e mensagem de contato.
- **Configuração do site**: nome, descrição, contato, endereço, horário, bairros atendidos,
  redes sociais e políticas de pedido.
- **Opção de produto**: tamanho, formato, sabor, cobertura, adicional, quantidade ou pacote
  que altera a escolha ou o preço.
- **Campanha**: conteúdo sazonal opcional que pode estar ativo ou inativo.
- **Página pública**: documento gerado para home, produto, privacidade, erro, sitemap ou
  resumo de rastreamento.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Em uma revisão manual, cada produto ativo pode ser alcançado a partir da home
  em no máximo três interações e apresenta um próximo passo de contato.
- **SC-002**: As páginas comerciais não apresentam overflow horizontal em 390px e preservam
  títulos, preços, condições e ações distinguíveis em 1440px.
- **SC-003**: Uma alteração válida em dados aparece nas páginas públicas e artefatos derivados
  após uma execução bem-sucedida do gerador, sem alteração manual de HTML.
- **SC-004**: O conjunto de JSONs alterados passa pela validação, o gerador termina sem erro e
  `git diff --check` não encontra whitespace inválido.
- **SC-005**: Cada página comercial revisada contém identidade do negócio, produto, preço ou
  regra de cálculo, contato e URL canônica coerentes com os dados oficiais.
- **SC-006**: Uma revisão de acessibilidade básica confirma texto alternativo relevante,
  foco/navegação compreensível e estados que não dependem somente de cor.

## Assumptions

- O site permanece estático e não oferece autenticação, carrinho ou checkout online.
- O contato e a confirmação do pedido acontecem fora do site, principalmente por WhatsApp.
- `data/*.json` é a fonte canônica para dados editoriais e comerciais.
- A geração e a publicação continuam sob responsabilidade do Node.js e do GitHub Actions.
- Requisitos específicos de uma nova funcionalidade devem ser criados em uma pasta própria
  de `specs/` e não devem sobrescrever este baseline sem registrar o impacto.
