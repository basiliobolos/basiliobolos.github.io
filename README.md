# Basilio Bolos - Website

**Confeitaria Artesanal em Santo André/SP**  
Site: https://basiliobolos.com.br/

---

## 📖 Documentação

Para informações completas sobre deploy, SEO, marketing e otimizações, consulte:

👉 **[GUIA-COMPLETO.md](GUIA-COMPLETO.md)** - Guia completo com tudo que você precisa saber

---

## 🚀 Quick Start

### ✏️ Editar preços e conteúdo (fluxo principal)

Todo o conteúdo do site (preços, descrições, sabores, FAQs) fica em `data/*.json`.
Os arquivos HTML são **gerados** — não edite o HTML diretamente.

```bash
# 1. Edite o JSON do produto (ex.: data/bolos.json)
# 2. Gere o site novamente
node tools/gerar.js

# 3. Publique
git add .
git commit -m "atualiza preços"
git push origin main
```

O GitHub Pages publica em 2-5 minutos. Os preços de bolo são calculados
automaticamente a partir do `precoKg` de cada recheio e do `pesoKg` de cada
tamanho (fatia de 100g, valores arredondados para terminar em 9).

### Onde editar cada coisa

| Arquivo | Conteúdo |
|---|---|
| `data/site.json` | Telefone, endereço, horário, redes sociais, políticas de pedido |
| `data/produtos.json` | Cards da página inicial (ordem, textos, preço em destaque) e regras editáveis de recomendações |
| `data/bolos.json` | Base dos bolos personalizados: tamanhos redondos, recheios (preço por kg), coberturas, acréscimos e FAQ |
| `data/bolos-retangulares.json` | Dados de coração e formatos retangulares usados na página unificada `/bolos/`; a URL antiga é mantida como alias |
| `data/doces.json` | Doces por cento e premium, FAQs |
| `data/biscoitos.json` · `cupcakes` · `brownies` · `pipoca-gourmet` · `bolo-de-pote` | Opções, preços e FAQ de cada página |
| `data/campanhas.json` | Campanha sazonal (`ativo: true/false`) |

### Deploy
```bash
git add .
git commit -m "sua mensagem aqui"
git push origin main
```

### Validar SEO
- Rich Results: https://search.google.com/test/rich-results
- PageSpeed: https://pagespeed.web.dev/

### Google Meu Negócio (PRIORIDADE #1)
1. Acessar https://business.google.com/
2. Criar perfil "Basilio Bolos"
3. Adicionar 10+ fotos
4. Solicitar avaliações

---

## 📍 Informações Básicas

**Endereço**: Av. Estados Unidos, 439 - Parque das Nações - Santo André/SP  
**Telefone**: (11) 96810-1912  
**Horário**: Segunda a Domingo, 08:00-20:00

**Área de Atendimento**:
- Santa Terezinha, Parque das Nações (principais)
- Jardim, Vila Curuçá, Parque Oratório, Vila Camilópolis (vizinhos)

**Produtos**:
Bolos personalizados, doces finos, cupcakes, brownies, trufas, festa na caixa, pipoca gourmet, bentô cakes

---

## ✅ SEO Implementado

- ✅ Meta tags otimizadas com bairros e produtos
- ✅ Schema.org (LocalBusiness + areaServed)
- ✅ 22 favicons (PWA completo)
- ✅ Sitemap.xml com imagens
- ✅ Google Analytics 4 com consentimento explícito

**Meta**: Top 3 "confeitaria santo andré" em 6 meses

---

## 📁 Estrutura

```
basilio-bolos-website/
├── data/*.json         # ✏️ EDITE AQUI: preços e conteúdo
├── tools/gerar.js      # Gerador estático (node tools/gerar.js)
├── index.html          # GERADO - página inicial
├── bolos/              # GERADO - página de bolos
├── doces/              # GERADO - página de doces
├── biscoitos/          # GERADO
├── cupcakes/           # GERADO
├── brownies/           # GERADO
├── pipoca-gourmet/     # GERADO
├── bolo-de-pote/       # GERADO
├── assets/             # Imagens e ícones
├── css/styles.css
├── js/app.js
├── privacidade/        # GERADO - política de privacidade e cookies
├── llms.txt            # GERADO - resumo para agentes de IA
├── sitemap.xml         # GERADO
└── robots.txt
```

---

## 🛠️ Tecnologias

HTML5 · CSS3 · Bootstrap 5 · JavaScript · PWA · Schema.org · Google Analytics

---

**Última atualização**: Julho 2026
