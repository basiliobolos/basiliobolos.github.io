<!--
Sync Impact Report
- Version change: unversioned scaffold -> 1.0.0
- Modified principles:
  - PRINCIPLE_1_NAME and PRINCIPLE_1_DESCRIPTION placeholders -> I. Dados como Fonte Única de Verdade
  - PRINCIPLE_2_NAME and PRINCIPLE_2_DESCRIPTION placeholders -> II. UX Simples, Acessível e Responsiva
  - PRINCIPLE_3_NAME and PRINCIPLE_3_DESCRIPTION placeholders -> III. Integridade de Dados e Preços
  - PRINCIPLE_4_NAME and PRINCIPLE_4_DESCRIPTION placeholders -> IV. Validação Reproduzível e Publicação Controlada
  - PRINCIPLE_5_NAME and PRINCIPLE_5_DESCRIPTION placeholders -> V. Simplicidade, Linguagem e Segurança
- Added sections: Restrições Técnicas e de Conteúdo; Fluxo de Desenvolvimento e Qualidade
- Removed sections: nenhuma
- Follow-up TODOs: confirmar a data original de ratificação em formato YYYY-MM-DD.
-->
# Basilio Bolos Constitution

## Core Principles

### I. Dados como Fonte Única de Verdade
Preços, descrições, sabores, FAQs, contatos e demais dados editoriais MUST residir em
`data/*.json`. Estrutura, comportamento e cálculos MUST ser alterados em `tools/gerar.js`;
HTML gerado em `dist/` MUST NOT ser editado diretamente nem versionado. Toda alteração
editorial MUST ser refletida no artefato por meio do gerador.

Racional: uma única fonte reduz divergências entre páginas, preços e informações de pedido.

### II. UX Simples, Acessível e Responsiva
Cada seção MUST apresentar uma decisão ou pergunta principal, com títulos curtos, texto de
apoio enxuto e preços, condições e ações essenciais visíveis. Componentes MUST preservar
hierarquia visual, nomes acessíveis, textos alternativos, contraste e estados que não dependam
somente de cor. Tabelas e colunas MUST funcionar sem overflow horizontal em 390px e em
1440px; alterações de interface MUST ser conferidas nessas larguras.

Racional: a pessoa precisa encontrar, entender e escolher produtos sem carga cognitiva
desnecessária em telas pequenas ou grandes.

### III. Integridade de Dados e Preços
Todos os arquivos JSON alterados MUST continuar válidos. Preços calculados MUST usar os
campos canônicos definidos nos dados e o resultado gerado MUST ser conferido contra os
preços, textos e condições esperados. Nenhuma correção manual no HTML gerado pode substituir
a correção da fonte de dados ou da lógica responsável.

Racional: informações incorretas de preço ou pedido comprometem diretamente a confiança do
cliente e a operação da confeitaria.

### IV. Validação Reproduzível e Publicação Controlada
Após qualquer alteração em dados ou no gerador, MUST ser executado `node --check
tools/gerar.js`, `node tools/gerar.js` e `git diff --check`. A publicação MUST ser feita pelo
GitHub Actions a partir do código-fonte, gerando `dist/` de forma reproduzível; alterações
manuais no artefato público não são uma etapa válida do fluxo.

Racional: o mesmo código-fonte deve produzir o mesmo site verificável, com menor risco de
publicar mudanças locais ou incompletas.

### V. Simplicidade, Linguagem e Segurança
Alterações MUST ser pequenas, compatíveis com o layout existente e justificadas quando
introduzirem dependências. Textos públicos MUST preservar português do Brasil e seus
acentos. Arquivos `.env`, credenciais e segredos MUST NOT ser editados, adicionados ou
publicados. Recursos nativos existentes MUST ser preferidos quando atenderem ao requisito.

Racional: simplicidade reduz manutenção, preserva a identidade local e evita exposição de
informações sensíveis.

## Restrições Técnicas e de Conteúdo

O projeto é um site estático composto por HTML, CSS, JavaScript e dados JSON, publicado no
GitHub Pages. O conteúdo público e as regras de produtos MUST permanecer separados da
estrutura de apresentação: dados editoriais ficam em `data/`, lógica e geração ficam em
`tools/gerar.js`, estilos ficam em `css/styles.css` e interações ficam em `js/app.js`.

`dist/` é somente o artefato público gerado e MUST permanecer fora das edições manuais e do
versionamento. Mudanças de preços, descrições, opções, FAQs ou informações da empresa MUST
usar os arquivos de dados correspondentes, sem duplicar a mesma informação em HTML gerado.

## Fluxo de Desenvolvimento e Qualidade

1. A pessoa responsável MUST localizar a fonte canônica antes de alterar conteúdo,
   estrutura, estilo ou interação.
2. Alterações em dados ou no gerador MUST passar pelos comandos de validação definidos no
   Princípio IV e pela conferência do artefato gerado.
3. A revisão MUST verificar validade dos JSONs, preços e textos exibidos, responsividade em
   390px e 1440px, acessibilidade básica e ausência de mudanças indevidas em `dist/`.
4. Uma alteração MUST ser dividida ou simplificada quando sua complexidade não for
   necessária para cumprir o objetivo documentado.
5. A publicação MUST ocorrer somente após a revisão das verificações aplicáveis e pelo
   workflow de GitHub Actions responsável pelo GitHub Pages.

## Governance

Esta constituição prevalece sobre práticas conflitantes do projeto. Toda mudança que afetar
um princípio, uma restrição ou um critério de qualidade MUST atualizar este documento no
mesmo trabalho e incluir um Sync Impact Report no topo.

**Procedimento de alteração:** a proposta MUST descrever a regra afetada, o impacto para o
fluxo existente e qualquer migração necessária. A aprovação MUST ocorrer antes da adoção;
após a aprovação, a alteração MUST atualizar a versão, a data de emenda e os registros de
conformidade relevantes.

**Política de versionamento:** a versão segue SemVer. Uma mudança MAJOR remove ou redefine
uma regra de forma incompatível; uma mudança MINOR adiciona um princípio, uma seção ou uma
orientação material; uma mudança PATCH corrige redação, esclarece uma regra sem alterar seu
sentido ou corrige um erro não semântico.

**Revisão de conformidade:** toda revisão de código MUST verificar os princípios aplicáveis,
a origem correta dos dados, as validações e os limites de publicação. Exceções MUST ser
justificadas no trabalho e aprovadas explicitamente; não podem ocultar falhas de segurança,
preços, acessibilidade ou geração.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): informar em formato YYYY-MM-DD | **Last Amended**: 2026-09-08
