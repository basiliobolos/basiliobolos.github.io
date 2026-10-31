# Atualização de preços dos bolos (redondos, retangulares e coração)

## Objetivo

Recalcular os preços derivados dos bolos a partir do 15cm (P), que permanece correto
(R$ 89 / 99 / 109 / 119), usando a proporção da quantidade mínima de fatias. O gerador e as
páginas (`data/*.json` -> `tools/gerar.js` -> `dist/`) continuam sendo a única fonte, então a
alteração nos dados atualiza tabelas, cards, FAQ, JSON-LD, `llms.txt` e SEO automaticamente.

## Regras confirmadas

1. Fatias mínimas: P (15cm) 10; M (20cm) 18; G (25cm) 28; GG (30cm) 40; 17x25cm 24; 22x30cm 38;
   coração 10.
2. Bolos redondos, encadeado do menor para o maior, sempre sobre o preço já publicado (com piso)
   do tamanho anterior:
   - M = piso(P x 18/10)
   - G = piso(M x 28/18)
   - GG = piso(G x 40/28)
3. Bolos retangulares, proporção direta sobre o 15cm com as próprias fatias + 5%:
   - 17x25 = piso(P x 24/10 x 1,05)
   - 22x30 = piso(P x 38/10 x 1,05)
4. Coração: proporção sobre o 15cm (10/10 fatias) + 10%: piso(P x 1,10).
5. `piso` = arredonda para baixo; se o valor for exato (inteiro), subtrai R$ 1.
6. Com piso normal, os preços deixam de terminar em 9 (ex.: R$ 160, R$ 248, R$ 354).

## Valores calculados

Bolos redondos (`data/bolos.json` -> `precosPorFaixaP`):

| Faixa P | P (15cm) | M (20cm) | G (25cm) | GG (30cm) | Por fatia (P > M > G > GG) |
| --- | --- | --- | --- | --- | --- |
| 89 | 89 | 160 | 248 | 354 | 8,90 > 8,889 > 8,857 > 8,850 |
| 99 | 99 | 178 | 276 | 394 | 9,90 > 9,889 > 9,857 > 9,850 |
| 109 | 109 | 196 | 304 | 434 | 10,90 > 10,889 > 10,857 > 10,850 |
| 119 | 119 | 214 | 332 | 474 | 11,90 > 11,889 > 11,857 > 11,850 |

Bolos retangulares e coração (`data/bolos-retangulares.json` -> `precosPorFaixaP`, chaves iguais
ao campo `nome` de cada tamanho):

| Faixa P | 17x25 (G) | 22x30 (GG) | Coração |
| --- | --- | --- | --- |
| 89 | 224 | 355 | 97 |
| 99 | 249 | 395 | 108 |
| 109 | 274 | 434 | 119 |
| 119 | 299 | 474 | 130 |

Nenhum passo caiu em valor exato com os dados atuais; a regra do "-1" não dispara hoje, mas fica
descrita para os próximos recálculos.

## Arquivos a alterar

1. `data/bolos.json` -> substituir a tabela `precosPorFaixaP`:

```json
"precosPorFaixaP": {
  "89": { "P": 89, "M": 160, "G": 248, "GG": 354 },
  "99": { "P": 99, "M": 178, "G": 276, "GG": 394 },
  "109": { "P": 109, "M": 196, "G": 304, "GG": 434 },
  "119": { "P": 119, "M": 214, "G": 332, "GG": 474 }
}
```

2. `data/bolos-retangulares.json`:
   - `precosPorFaixaP` -> acrescentar a chave `Coração` e atualizar G/GG:
     `"89": { "G": 224, "GG": 355, "Coração": 97 }` (idem 99/109/119 conforme a tabela).
   - `fatorPreco`: 1.1 -> 1.05 (hoje só é usado em fallback; alinhar com a nova regra).
   - `precoDestaque` (campo sem uso no gerador): "A partir de R$ 159" -> "A partir de R$ 97"
     para não ficar desatualizado.
   - Coração mantém `precoReferencia: "M"` só como fallback; a chave explícita na tabela tem
     precedência no cálculo.
3. `tools/gerar.js`: sem mudança de lógica (a tabela de faixas já alimenta tabelas, cards, FAQ,
   JSON-LD). Nada a editar.
4. `specs/000-site-baseline/spec.md`: registrar a regra de precificação (texto curto junto ao
   FR-007) para o cálculo ser reproduzível em futuras mudanças de 15cm ou de fatias.
   Texto proposto, logo após o FR-007:
   "**Regra de precificação dos bolos**: o preço do 15cm é a âncora; os tamanhos maiores derivam
   da proporção das fatias mínimas, encadeada do menor para o maior, arredondada para baixo
   (valor exato perde R$ 1). Retangulares acrescentam 5% e o coração, 10%."
5. `dist/`: não versionado; regenerar apenas para conferência local.

### Alternativa (não incluída)

Mover a regra para `tools/gerar.js` (campos `fatiasMin` por tamanho e fator por formato) e
dispensar a tabela `precosPorFaixaP` calculada à mão. Mais invasivo; o recálculo atual em dados
resolve a necessidade e mantém o fluxo documentado no `AGENTS.md`.

## Efeitos visíveis no site (automáticos)

- Tabelas "Sabores e preços" dos três formatos em `/bolos/`.
- Cards de formato: Redondo "A partir de R$ 89" (igual), Retangular R$ 209 -> R$ 224,
  Coração R$ 159 -> R$ 97.
- FAQ (home e `/bolos/`): faixa "de R$ 89 a R$ 449" -> "de R$ 89 a R$ 474"; retangular e coração
  atualizados.
- JSON-LD de produto: `lowPrice` 89 (igual), `highPrice` 449 -> 474.
- Card da home, `produtos.json` e `llms.txt`: "A partir de R$ 89" (inalterado, o mínimo continua
  sendo o redondo P).
- Bento cake, doces, ganache e demais produtos: inalterados.

## Validação

1. `node --check tools/gerar.js`
2. `node tools/gerar.js`
3. `git diff --check`
4. Conferir em `dist/bolos/index.html`: as três tabelas de preços, os cards "A partir de", a FAQ
   e o JSON-LD; conferir `dist/index.html` e `dist/llms.txt`.
5. Confirmar que os JSONs alterados continuam válidos e que `dist/` tem só o artefato esperado.
