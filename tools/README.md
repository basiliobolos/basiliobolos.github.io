# 🎂 Gerenciador de Avaliações - Basilio Bolos

Ferramenta CLI para gerenciar as avaliações do site de forma fácil e interativa.

## 📦 Instalação

```bash
cd tools
npm install
```

## 🚀 Uso

### Menu Interativo
```bash
npm start
```

**💡 Dicas de navegação:**
- Pressione `ESC` ou `Ctrl+C` durante qualquer operação para cancelar e voltar ao menu
- No menu principal, `Ctrl+C` fecha a aplicação
- Em cada operação, você também terá a opção "🔙 Voltar ao menu"

### Comandos Diretos

**Adicionar avaliação:**
```bash
npm run add
```

**Listar todas as avaliações:**
```bash
npm run list
```

**Editar avaliação:**
```bash
npm run edit
```

**Deletar avaliação:**
```bash
npm run delete
```

**Ver estatísticas:**
```bash
npm run stats
```

**Configurar filtros de exibição:**
```bash
npm run config
```

## 📋 Funcionalidades

- ✅ Adicionar novas avaliações
- ✅ Listar todas as avaliações com estatísticas
- ✅ Editar avaliações existentes
- ✅ Deletar avaliações
- ✅ Ver estatísticas detalhadas
- ✅ **Cálculo automático de estatísticas** em toda operação
- ✅ Configurar:
  - Nota mínima/máxima para exibição
  - Quantidade de avaliações a mostrar
  - URLs do Google Maps
  - Habilitar/desabilitar seção
- ✅ Ordenação automática por data
- ✅ Validação de dados
- ✅ Interface interativa no terminal

## 📝 Exemplo de Uso

```bash
# Executar o menu principal
npm start

# Ou usar comandos diretos
npm run add      # Adiciona uma nova avaliação
npm run list     # Mostra todas as avaliações
npm run config   # Altera configurações
```

## 📊 Estrutura de Dados

### Avaliações
Cada avaliação contém:
- **author**: Nome do autor
- **rating**: Nota de 0.0 a 5.0
- **date**: Data no formato YYYY-MM-DD
- **text**: Texto da avaliação
- **showOnSite**: Se deve aparecer no site (true/false)

### Estatísticas
Calculadas automaticamente após cada operação:
- **total**: Total de avaliações
- **average**: Média das notas
- **min**: Menor nota
- **max**: Maior nota

## 💾 Arquivo Gerenciado

O arquivo `../data/avaliacoes.json` é atualizado automaticamente após cada operação.

## 🔧 Tecnologias

- Node.js (ESM)
- Inquirer.js (interface interativa)
