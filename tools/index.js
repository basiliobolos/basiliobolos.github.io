#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AVALIACOES_PATH = path.join(__dirname, '../data/avaliacoes.json');

// Global state to track if we're in a submenu or main menu
let inSubmenu = false;
let cancelRequested = false;

// Setup ESC key handler
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

process.stdin.on('keypress', (str, key) => {
  // ESC key pressed
  if (key && key.name === 'escape' && inSubmenu) {
    cancelRequested = true;
    console.log('\n\n❌ Operação cancelada (ESC pressionado). Voltando ao menu...\n');
    process.stdin.pause();
    // Give inquirer a moment to clean up, then return to menu
    setTimeout(async () => {
      inSubmenu = false;
      cancelRequested = false;
      process.stdin.resume();
      await mainMenu();
    }, 100);
  }
  // Ctrl+C pressed
  if (key && key.ctrl && key.name === 'c') {
    if (inSubmenu) {
      cancelRequested = true;
      console.log('\n\n❌ Operação cancelada. Voltando ao menu...\n');
      process.stdin.pause();
      setTimeout(async () => {
        inSubmenu = false;
        cancelRequested = false;
        process.stdin.resume();
        await mainMenu();
      }, 100);
    } else {
      console.log('\n\n👋 Até logo!\n');
      process.exit(0);
    }
  }
});

// Utility functions
function loadAvaliacoes() {
  try {
    const data = fs.readFileSync(AVALIACOES_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Erro ao carregar avaliacoes.json:', error.message);
    process.exit(1);
  }
}

function calculateStatistics(reviews) {
  if (!reviews || reviews.length === 0) {
    return { total: 0, average: 0, min: 0, max: 0 };
  }
  
  const ratings = reviews.map(r => r.rating);
  const total = reviews.length;
  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  const average = parseFloat((sum / total).toFixed(2));
  const min = Math.min(...ratings);
  const max = Math.max(...ratings);
  
  return { total, average, min, max };
}

function saveAvaliacoes(data) {
  try {
    // Auto-calculate statistics before saving
    data.statistics = calculateStatistics(data.reviews);
    
    fs.writeFileSync(AVALIACOES_PATH, JSON.stringify(data, null, 2), 'utf-8');
    console.log('✅ Arquivo avaliacoes.json salvo com sucesso!');
    console.log(`📊 Estatísticas: ${data.statistics.total} avaliações | Média: ${data.statistics.average} | Min: ${data.statistics.min} | Max: ${data.statistics.max}`);
  } catch (error) {
    console.error('❌ Erro ao salvar avaliacoes.json:', error.message);
    process.exit(1);
  }
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Commands
async function addReview() {
  inSubmenu = true;
  const data = loadAvaliacoes();
  
  console.log('\n📝 Adicionar Nova Avaliação');
  console.log('💡 Pressione Ctrl+C para cancelar e voltar ao menu\n');
  
  try {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'author',
        message: 'Nome do autor:',
        default: 'Cliente Google'
      },
      {
        type: 'number',
        name: 'rating',
        message: 'Nota (0.0 a 5.0):',
        default: 5.0,
        validate: (input) => {
          if (input >= 0 && input <= 5) return true;
          return 'A nota deve estar entre 0.0 e 5.0';
        }
      },
      {
        type: 'input',
        name: 'text',
        message: 'Texto da avaliação:'
      },
      {
        type: 'input',
        name: 'date',
        message: 'Data (YYYY-MM-DD):',
        default: formatDate(new Date()),
        validate: (input) => {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (dateRegex.test(input)) return true;
          return 'Formato inválido. Use YYYY-MM-DD';
        }
      },
      {
        type: 'confirm',
        name: 'showOnSite',
        message: 'Exibir no site?',
        default: true
      }
    ]);
    
    const newReview = {
      author: answers.author,
      rating: answers.rating,
      date: answers.date,
      text: answers.text,
      showOnSite: answers.showOnSite
    };
    
    data.reviews.push(newReview);
    
    // Sort by date (newest first)
    data.reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (cancelRequested) {
      inSubmenu = false;
      return; // ESC handler will call mainMenu
    }
    
    saveAvaliacoes(data);
    console.log(`\n✅ Avaliação adicionada com sucesso!\n`);
  } catch (error) {
    if (cancelRequested) {
      inSubmenu = false;
      return; // ESC handler will call mainMenu
    }
    console.log('\n❌ Erro ao adicionar avaliação:', error.message);
  }
  
  inSubmenu = false;
  await mainMenu();
}

async function listReviews() {
  const data = loadAvaliacoes();
  
  console.log('\n📋 Lista de Avaliações\n');
  console.log(`📊 Estatísticas: ${data.statistics.total} avaliações | Média: ${data.statistics.average} ⭐ | Min: ${data.statistics.min} | Max: ${data.statistics.max}\n`);
  
  data.reviews.forEach((review, index) => {
    const stars = '⭐'.repeat(Math.floor(review.rating));
    const visibility = review.showOnSite ? '👁️  Visível' : '🔒 Oculta';
    console.log(`${index + 1}. ${review.author} - ${stars} ${review.rating}`);
    console.log(`   📅 ${review.date} | ${visibility}`);
    console.log(`   💬 "${review.text}"`);
    console.log('');
  });
  
  await mainMenu();
}

async function editReview() {
  inSubmenu = true;
  const data = loadAvaliacoes();
  
  if (data.reviews.length === 0) {
    console.log('\n⚠️  Nenhuma avaliação cadastrada.\n');
    inSubmenu = false;
    await mainMenu();
    return;
  }
  
  console.log('\n✏️  Editar Avaliação');
  console.log('💡 Pressione Ctrl+C para cancelar e voltar ao menu\n');
  
  try {
    const choices = [
      { name: '🔙 Voltar ao menu', value: 'cancel' },
      new inquirer.Separator('─────────────────────────'),
      ...data.reviews.map((r, i) => ({
        name: `${i + 1}. ${r.author} - ${r.rating}⭐ (${r.date})`,
        value: i
      }))
    ];
    
    const { reviewIndex } = await inquirer.prompt([
      {
        type: 'list',
        name: 'reviewIndex',
        message: 'Selecione a avaliação para editar:',
        choices,
        default: 1, // Skip "Voltar" and separator, select first real item
        loop: false // Disable circular navigation
      }
    ]);
    
    if (reviewIndex === 'cancel') {
      inSubmenu = false;
      await mainMenu();
      return;
    }
    
    const review = data.reviews[reviewIndex];
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'author',
        message: 'Nome do autor:',
        default: review.author
      },
      {
        type: 'number',
        name: 'rating',
        message: 'Nota (0.0 a 5.0):',
        default: review.rating,
        validate: (input) => {
          if (input >= 0 && input <= 5) return true;
          return 'A nota deve estar entre 0.0 e 5.0';
        }
      },
      {
        type: 'input',
        name: 'text',
        message: 'Texto da avaliação:',
        default: review.text
      },
      {
        type: 'input',
        name: 'date',
        message: 'Data (YYYY-MM-DD):',
        default: review.date,
        validate: (input) => {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (dateRegex.test(input)) return true;
          return 'Formato inválido. Use YYYY-MM-DD';
        }
      },
      {
        type: 'confirm',
        name: 'showOnSite',
        message: 'Exibir no site?',
        default: review.showOnSite
      },
    ]);
    
    data.reviews[reviewIndex] = {
      ...review,
      ...answers
    };
    
    // Sort by date
    data.reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (cancelRequested) {
      inSubmenu = false;
      return; // ESC handler will call mainMenu
    }
    
    saveAvaliacoes(data);
    console.log(`\n✅ Avaliação atualizada com sucesso!\n`);
  } catch (error) {
    if (cancelRequested) {
      inSubmenu = false;
      return; // ESC handler will call mainMenu
    }
    console.log('\n❌ Erro ao editar avaliação:', error.message);
  }
  
  inSubmenu = false;
  await mainMenu();
}

async function deleteReview() {
  inSubmenu = true;
  const data = loadAvaliacoes();
  
  if (data.reviews.length === 0) {
    console.log('\n⚠️  Nenhuma avaliação cadastrada.\n');
    inSubmenu = false;
    await mainMenu();
    return;
  }
  
  console.log('\n🗑️  Deletar Avaliação');
  console.log('💡 Pressione Ctrl+C para cancelar e voltar ao menu\n');
  
  try {
    const choices = [
      { name: '🔙 Voltar ao menu', value: 'cancel' },
      new inquirer.Separator('─────────────────────────'),
      ...data.reviews.map((r, i) => ({
        name: `${i + 1}. ${r.author} - ${r.rating}⭐ (${r.date})`,
        value: i
      }))
    ];
    
    const { reviewIndex } = await inquirer.prompt([
      {
        type: 'list',
        name: 'reviewIndex',
        message: 'Selecione a avaliação para deletar:',
        choices,
        default: 1, // Skip "Voltar" and separator, select first real item
        loop: false // Disable circular navigation
      }
    ]);
    
    if (reviewIndex === 'cancel') {
      inSubmenu = false;
      await mainMenu();
      return;
    }
    
    const review = data.reviews[reviewIndex];
    
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `⚠️  Tem certeza que deseja deletar a avaliação de "${review.author}"?`,
        default: false
      }
    ]);
    
    if (!confirm) {
      console.log('\n❌ Operação cancelada.\n');
      inSubmenu = false;
      await mainMenu();
      return;
    }
    
    data.reviews.splice(reviewIndex, 1);
    
    if (cancelRequested) {
      inSubmenu = false;
      return; // ESC handler will call mainMenu
    }
    
    saveAvaliacoes(data);
    console.log(`\n✅ Avaliação deletada com sucesso!\n`);
  } catch (error) {
    if (cancelRequested) {
      inSubmenu = false;
      return; // ESC handler will call mainMenu
    }
    console.log('\n❌ Erro ao deletar avaliação:', error.message);
  }
  
  inSubmenu = false;
  await mainMenu();
}

async function configSettings() {
  inSubmenu = true;
  const data = loadAvaliacoes();
  
  console.log('\n⚙️  Configurações de Exibição');
  console.log('💡 Pressione Ctrl+C para cancelar e voltar ao menu\n');
  
  try {
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'enabled',
        message: 'Seção de avaliações habilitada?',
        default: data.enabled
      },
      {
        type: 'number',
        name: 'minRating',
        message: 'Nota mínima para exibir:',
        default: data.displayConfig?.minRating || 4.0,
        validate: (input) => {
          if (input >= 0 && input <= 5) return true;
          return 'A nota deve estar entre 0.0 e 5.0';
        }
      },
      {
        type: 'number',
        name: 'maxRating',
        message: 'Nota máxima para exibir:',
        default: data.displayConfig?.maxRating || 5.0,
        validate: (input) => {
          if (input >= 0 && input <= 5) return true;
          return 'A nota deve estar entre 0.0 e 5.0';
        }
      },
      {
        type: 'number',
        name: 'displayCount',
        message: 'Quantidade de avaliações a exibir:',
        default: data.displayConfig?.displayCount || 3,
        validate: (input) => {
          if (input > 0) return true;
          return 'Deve ser maior que 0';
        }
      },
      {
        type: 'input',
        name: 'googleMapsUrl',
        message: 'URL do Google Maps:',
        default: data.googleMapsUrl
      },
      {
        type: 'input',
        name: 'writeReviewUrl',
        message: 'URL para escrever avaliação:',
        default: data.writeReviewUrl
      }
    ]);
    
    data.enabled = answers.enabled;
    data.googleMapsUrl = answers.googleMapsUrl;
    data.writeReviewUrl = answers.writeReviewUrl;
    data.displayConfig = {
      minRating: answers.minRating,
      maxRating: answers.maxRating,
      displayCount: answers.displayCount
    };
    
    if (cancelRequested) {
      inSubmenu = false;
      return; // ESC handler will call mainMenu
    }
    
    saveAvaliacoes(data);
    console.log('\n✅ Configurações atualizadas com sucesso!\n');
  } catch (error) {
    if (cancelRequested) {
      inSubmenu = false;
      return; // ESC handler will call mainMenu
    }
    console.log('\n❌ Erro ao atualizar configurações:', error.message);
  }
  
  inSubmenu = false;
  await mainMenu();
}

async function showStatistics() {
  const data = loadAvaliacoes();
  
  console.log('\n📊 Estatísticas das Avaliações\n');
  console.log(`Total de avaliações: ${data.statistics.total}`);
  console.log(`Média: ${data.statistics.average} ⭐`);
  console.log(`Menor nota: ${data.statistics.min} ⭐`);
  console.log(`Maior nota: ${data.statistics.max} ⭐`);
  console.log('');
  
  await mainMenu();
}

async function mainMenu() {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '🎂 Gerenciador de Avaliações - Basilio Bolos',
      choices: [
        { name: '➕ Adicionar avaliação', value: 'add' },
        { name: '📋 Listar avaliações', value: 'list' },
        { name: '✏️  Editar avaliação', value: 'edit' },
        { name: '🗑️  Deletar avaliação', value: 'delete' },
        { name: '📊 Ver estatísticas', value: 'stats' },
        { name: '⚙️  Configurações', value: 'config' },
        { name: '🚪 Sair', value: 'exit' }
      ]
    }
  ]);
  
  switch (action) {
    case 'add':
      await addReview();
      break;
    case 'list':
      await listReviews();
      break;
    case 'edit':
      await editReview();
      break;
    case 'delete':
      await deleteReview();
      break;
    case 'stats':
      await showStatistics();
      break;
    case 'config':
      await configSettings();
      break;
    case 'exit':
      console.log('\n👋 Até logo!\n');
      process.exit(0);
  }
  
  // Loop back to menu
  await mainMenu();
}

// Main execution
(async () => {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'add') {
    await addReview();
  } else if (command === 'list') {
    await listReviews();
  } else if (command === 'edit') {
    await editReview();
  } else if (command === 'delete') {
    await deleteReview();
  } else if (command === 'stats') {
    await showStatistics();
  } else if (command === 'config') {
    await configSettings();
  } else {
    await mainMenu();
  }
})();
