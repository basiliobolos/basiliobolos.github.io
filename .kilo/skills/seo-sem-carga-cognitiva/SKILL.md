---
name: seo-sem-carga-cognitiva
description: Use este skill sempre que o usuário pedir para melhorar SEO, otimizar para buscadores, aumentar tráfego orgânico, rankear melhor no Google, ou revisar meta tags/schema/palavras-chave do site Basilio Bolos (ou qualquer site com o mesmo padrão data/*.json + tools/gerar.js). Dispare este skill também quando o pedido mencionar, junto com SEO, não piorar a experiência do usuário, não aumentar a carga cognitiva, manter a página simples, não adicionar texto demais, ou respeitar o Guia de UX do site. Garante que toda otimização de SEO seja classificada como "invisível" (metadata, schema.org, alt text, URLs, sitemap) ou "visível" (texto, novas seções), e que qualquer mudança visível passe pelo checklist do Guia de UX antes de ser aplicada — para nunca trocar posição no Google por uma página mais confusa para quem compra bolo.
---

# SEO sem aumentar carga cognitiva

## Princípio central

SEO e usabilidade não competem — eles competem só quando SEO é feito adicionando
texto. A regra de ouro deste skill:

> **Toda palavra-chave nova primeiro tenta morar em metadata/schema/atributo.
> Só vira texto visível se isso também responder à pergunta principal da seção
> onde vai entrar — e mesmo assim, seguindo o Guia de UX do site.**

Nunca proponha uma otimização de SEO sem antes classificá-la como
**invisível** ou **visível** (ver abaixo). É essa classificação que evita
regressão de usabilidade.

## Antes de aplicar qualquer mudança, leia

- `data/*.json` da página em questão — conteúdo atual, preços, FAQs.
- O Guia de UX do site (seções "Redução Cognitiva" e "Intercalação de Cores"),
  se disponível no projeto — ele é a fonte de verdade sobre o que pode virar
  texto novo e o que não pode.
- `tools/gerar.js` — para entender onde entram title, meta description e
  JSON-LD no HTML gerado.

Nunca edite HTML gerado em `dist/` diretamente; toda mudança de conteúdo entra
pelos JSONs e passa pelo gerador (`node tools/gerar.js`).

---

## Passo 1 — Classifique a otimização

| Tipo | Exemplos | Onde mora | Risco de UX |
|---|---|---|---|
| **Invisível** | title, meta description, alt text, nome de arquivo de imagem, schema.org (LocalBusiness, FAQPage, Product, BreadcrumbList, AggregateRating), URL semântica, sitemap.xml, robots.txt, hreflang, dados estruturados de preço | Metadata / atributos / `<head>` / JSON-LD | Nenhum — usuário não vê |
| **Visível reaproveitando componente existente** | reescrever um título de card, ajustar um H2, melhorar um alt text que também aparece como legenda, adicionar 1 FAQ nova dentro do acordeão já existente | Dentro de card/tabela/FAQ que já existe | Baixo, se não duplicar informação já mostrada |
| **Visível novo** | nova seção (depoimentos, badges de confiança, banner de urgência, texto institucional extra) | Nova seção na página | Alto — precisa passar pelo Passo 2 |

**Regra prática:** se dá para resolver com Tipo 1, resolva com Tipo 1. Não
crie uma seção nova só para caber uma palavra-chave.

---

## Passo 2 — Para toda mudança "Visível nova", rode este filtro

Antes de implementar, responda:

1. **Uma decisão por seção continua verdadeira?** A seção nova responde a
   *uma* pergunta específica (ex.: "O que os clientes dizem?"), não mistura
   prova social + urgência + preço na mesma seção.
2. **Isso duplica algo que já aparece em outro lugar?** Preço, telefone,
   endereço e diferenciais já aparecem em cartões/tabelas — não repita o
   mesmo dado em um parágrafo novo "para reforçar SEO".
3. **Isso cabe em divulgação progressiva?** Se a informação é secundária
   (pergunta específica, detalhe de bairro, variação de produto), vá para FAQ
   colapsável em vez de texto sempre visível.
4. **Isso respeita a alternância de cor?** A seção nova usa superfície clara
   ou escura na sequência correta — nunca uma cor isolada nova sem decisão de
   design explícita.
5. **Isso sobrevive a 390px?** Sem overflow horizontal, sem texto cortado,
   botão com área de toque confortável.
6. **Isso bloqueia conteúdo permanentemente?** Banners de urgência/escassez
   não podem cobrir CTA ou preço de forma fixa.
7. **O texto de apoio tem no máximo uma frase?** Se a keyword só cabe
   "enchendo linguiça", ela deveria estar em metadata, não aqui.

Se qualquer resposta for "não respeita", volte para o Passo 1 e mova a
otimização para invisível, ou reescreva o texto até caber nas regras.

---

## Técnicas seguras (aplique sempre, sem pedir permissão de UX)

- **Title tag** único por página, com bairro + produto principal.
- **Meta description** de até ~160 caracteres, sem duplicar o H1 literalmente.
- **JSON-LD**: `LocalBusiness` com `areaServed`, `geo`, `makesOffer`,
  `FAQPage` espelhando o acordeão de FAQ real da página (nunca invente
  pergunta que não existe visivelmente — isso é spam de schema).
- **Alt text** descritivo com produto + bairro, sem "keyword stuffing"
  (`alt="bolo bolo confeitaria bolo santo andré"` é penalizado, não ajuda).
- **Nome de arquivo de imagem** com hífen e palavras-chave reais.
- **URLs semânticas**, minúsculas, com hífen.
- **Sitemap.xml / robots.txt** atualizados a cada página nova.
- **Heading hierarchy**: um H1 por página, H2 por seção, sem pular nível só
  para estilizar fonte.
- **Core Web Vitals**: `loading="lazy"` em imagens fora da dobra, `width`/
  `height` definidos, `async`/`defer` em scripts, WebP quando possível — tudo
  isso melhora SEO técnico e não altera nada que o usuário perceba.
- **NAP consistente** (Nome, Endereço, Telefone) idêntico em footer, schema,
  Google Meu Negócio e redes sociais.

## Técnicas que exigem o filtro do Passo 2

- Seção de depoimentos, badges de confiança, prova social.
- Blog ou conteúdo institucional novo para capturar buscas de cauda longa.
- Banners de urgência/escassez sazonais.
- Expansão de FAQ com perguntas long-tail (ok, mas cada pergunta nova entra
  no acordeão — não como parágrafo solto).
- Internal linking dentro de texto corrido (ok se o texto já existe; não crie
  parágrafo só para caber o link).

---

## Fluxo de trabalho recomendado quando o usuário pede "otimiza o SEO da página X"

1. Leia o JSON de dados da página e, se houver, o Guia de UX do projeto.
2. Liste as otimizações propostas já classificadas (Passo 1).
3. Aplique direto todas as invisíveis.
4. Para as visíveis, rode o filtro do Passo 2 e só implemente as que passam;
   para as que não passam, reformule (normalmente movendo a keyword para
   metadata) em vez de simplesmente recusar.
5. Rode a validação do projeto:
   ```bash
   node --check tools/gerar.js
   node tools/gerar.js
   git diff --check
   ```
6. Sugira validação externa: Rich Results Test, PageSpeed Insights,
   Mobile-Friendly Test — sem alterar nada além do que passou pelo filtro.
7. Resuma o que mudou separando claramente "invisível (sem risco de UX)" de
   "visível (passou no filtro de UX)".

---

## Prompt avulso (caso prefira colar em vez de instalar como skill)

```
Aja como um especialista em SEO local que também segue à risca o Guia de UX
do site (uma decisão por seção, sem duplicar preços/informações, alternância
de cor clara/escura, divulgação progressiva para conteúdo secundário, sem
texto promocional supérfluo, sem quebrar em 390px).

Para qualquer otimização de SEO que eu pedir:
1. Classifique como INVISÍVEL (title, meta description, alt text, schema.org,
   URL, sitemap) ou VISÍVEL (texto novo, seção nova).
2. Aplique direto as invisíveis.
3. Para as visíveis, teste contra o Guia de UX antes de sugerir: isso cria
   uma segunda decisão na seção? duplica algo já mostrado? deveria ser FAQ
   colapsável em vez de texto fixo? respeita a alternância de cor e o layout
   em mobile (390px)?
4. Se uma ideia de SEO não passar no teste, não a descarte — reformule para
   caber em metadata/schema, ou proponha uma versão mais curta que passe.
5. No final, mostre separadamente o que foi feito como "invisível" e o que
   foi feito como "visível (aprovado pelo filtro de UX)".
```
