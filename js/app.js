// app.js
// Basilio Bolos - Page logic
document.addEventListener('DOMContentLoaded', function(){

  const mainNav = document.getElementById('mainNav');
  const navbarContent = document.getElementById('navbarContent');
  let collapseController = null;
  let pendingScrollHash = null;
  let baseNavHeight = 0;

  const measureNavHeight = () => {
    if(!mainNav) return;
    if(navbarContent && navbarContent.classList.contains('show')) return;
    baseNavHeight = mainNav.getBoundingClientRect().height;
  };

  measureNavHeight();

  window.addEventListener('load', measureNavHeight);
  window.addEventListener('resize', () => {
    if(navbarContent && navbarContent.classList.contains('show')) return;
    measureNavHeight();
  });

  // insert current year
  document.getElementById('anoAtual').innerText = new Date().getFullYear();

  // WhatsApp default link (placeholder)
  const WA_NUMBER = '5511968101912';
  const WA_MSG = encodeURIComponent('Olá! Vi seus doces e gostaria de receber mais informações. Pode me ajudar?');
  const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${WA_MSG}`;

  // set whatsapp links
  document.querySelectorAll('#whatsappBtn, #whatsappBtnNav, #whatsFooter, #modalWhats').forEach(el => {
    el.href = WA_LINK;
  });

  // Load JSON data (fetch from /data)
  // If you prefer inline data, you can replace fetch with a constant variable.
  Promise.all([
    fetch('data/campanhas.json').then(r => r.ok ? r.json() : null).catch(()=>null),
    fetch('data/produtos.json').then(r => r.ok ? r.json() : null).catch(()=>null)
  ]).then(([campanhaData, produtosData]) => {

    // ---------- CAMPANHA ----------
    const heroCtas = document.getElementById('heroCtas');
    const activeCampaigns = normalizeCampaignData(campanhaData);

    clearHeroButtons(heroCtas);

    if(activeCampaigns.length){
      const campList = document.getElementById('campList');
      activeCampaigns.forEach(camp => {
        camp.produtos.forEach(prod => {
          campList.appendChild(createFlipCard(prod));
        });
        insertHeroButton(heroCtas, camp);
      });
      applyCampaignTheme(activeCampaigns[0]);
      initCarousel('#campList', '#campPrev', '#campNext');
    } else {
      document.getElementById('campanhas').style.display = 'none';
    }

    // ---------- PRODUTOS ----------
    if(Array.isArray(produtosData)){
      const prodList = document.getElementById('prodList');
      produtosData.forEach(prod => {
        prodList.appendChild(createFlipCard(prod));
      });
      initCarousel('#prodList', '#prodPrev', '#prodNext', 230);
    }

  }).catch(err=>{
    console.error('Erro ao carregar JSON:', err);
  });

  // close mobile menu after clicking a nav link
  if(navbarContent && typeof bootstrap !== 'undefined' && bootstrap.Collapse){
    collapseController = new bootstrap.Collapse(navbarContent, {toggle:false});
    const closeOnClick = (event) => {
      const target = event.currentTarget;
      if(!target) return;
      const isCollapsed = !navbarContent.classList.contains('show');
      if(isCollapsed) return;
      collapseController.hide();
    };
    navbarContent.querySelectorAll('.nav-link, .btn').forEach(link => {
      link.addEventListener('click', closeOnClick);
    });
    navbarContent.addEventListener('hidden.bs.collapse', () => {
      measureNavHeight();
      if(!pendingScrollHash) return;
      performAnchoredScroll(pendingScrollHash);
      pendingScrollHash = null;
    });
  }

  // adjust scroll position to account for fixed navbar height
  const navAnchorLinks = document.querySelectorAll('#navbarContent a[href^="#"], .navbar-brand[href^="#"]');
  navAnchorLinks.forEach(link => {
    link.addEventListener('click', (event) => {
      const hash = link.getAttribute('href');
      if(!hash || hash === '#') return;
      event.preventDefault();
      const isMenuOpen = navbarContent && navbarContent.classList.contains('show');
      if(isMenuOpen && collapseController){
        pendingScrollHash = hash;
        collapseController.hide();
      } else {
        performAnchoredScroll(hash);
      }
    });
  });

  function performAnchoredScroll(hash){
    if(!hash || hash === '#') return;
    const targetId = hash.startsWith('#') ? hash.substring(1) : hash;
    if(!targetId) return;
    const targetEl = document.getElementById(targetId);
    if(!targetEl) return;
  const navHeight = baseNavHeight || (mainNav ? mainNav.getBoundingClientRect().height : 0);
    const extraOffset = 12;
    const targetTop = targetEl.getBoundingClientRect().top + window.scrollY - navHeight - extraOffset;
    window.scrollTo({
      top: Math.max(targetTop, 0),
      behavior: 'smooth'
    });
    if(history.replaceState){
      history.replaceState(null, '', `#${targetId}`);
    } else {
      window.location.hash = targetId;
    }
  }

  function normalizeCampaignData(data){
    if(!data) return [];
    if(Array.isArray(data)){
      return data.filter(item => item && item.ativo && Array.isArray(item.produtos) && item.produtos.length);
    }
    if(data.ativo && Array.isArray(data.produtos) && data.produtos.length){
      return [data];
    }
    return [];
  }

  function clearHeroButtons(container){
    if(!container) return;
    container.querySelectorAll('.cta-campaign').forEach(btn => btn.closest('.hero-cta-dynamic')?.remove());
  }

  function insertHeroButton(container, campaign){
    if(!container || !campaign) return;

    const btnWrapper = document.createElement('div');
    btnWrapper.className = 'hero-cta-dynamic';

    const button = document.createElement('a');
    button.href = '#campanhas';
    button.className = 'btn btn-lg cta-campaign';
    const baseColor = campaign.cor_fundo || '#D8A657';
    button.style.background = baseColor;
    button.style.color = campaign.cor_texto || getReadableColor(baseColor);
    button.innerText = campaign.campanha || 'Campanha especial';

    btnWrapper.appendChild(button);
    container.insertBefore(btnWrapper, container.lastElementChild);
  }

  let flipIdCounter = 0;

  // helper: create flip card element from product object
  function createFlipCard(prod){
    const cardId = `flip-card-${++flipIdCounter}`;
    const titleId = `${cardId}-title`;
    const priceId = `${cardId}-price`;
    const descId = `${cardId}-desc`;
    const instructionsId = `${cardId}-instructions`;
    const descText = prod.descricao && prod.descricao.trim().length ? prod.descricao : prod.titulo;

    const card = document.createElement('article');
    card.className = 'flip-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-expanded', 'false');
    card.setAttribute('aria-controls', descId);
    card.setAttribute('aria-labelledby', titleId);
    card.setAttribute('aria-describedby', `${priceId} ${descId} ${instructionsId}`);

    const numericValue = Number(prod.valor);
    const hasPriceNumber = Number.isFinite(numericValue) && numericValue > 0;
    const priceLabel = hasPriceNumber ? `R$ ${numericValue.toFixed(2)}` : 'Valor sob consulta';
    const priceClass = hasPriceNumber ? 'price' : 'price price-alt price-placeholder';
    const priceAria = hasPriceNumber ? '' : ' aria-label="Valor sob consulta"';

    card.innerHTML = `
      <div class="flip-inner">
        <div class="flip-front" aria-hidden="false">
          <img src="${prod.imagem}" alt="${escapeHtml(prod.titulo)}">
          <h5 id="${titleId}">${escapeHtml(prod.titulo)}</h5>
          <p id="${priceId}" class="${priceClass}"${priceAria}>${escapeHtml(priceLabel)}</p>
        </div>
        <div class="flip-back" aria-hidden="true">
          <div class="back-text">${escapeHtml(descText)}</div>
        </div>
      </div>
      <p id="${descId}" class="sr-only">Descrição completa: ${escapeHtml(descText)}</p>
      <p id="${instructionsId}" class="sr-only">Pressione Enter ou Espaço para ouvir a descrição completa do produto.</p>
    `;

    const frontFace = card.querySelector('.flip-front');
    const backFace = card.querySelector('.flip-back');

    const toggleFlip = () => {
      const isFlipped = card.classList.toggle('flipped');
      card.setAttribute('aria-expanded', isFlipped);
      if(frontFace){
        frontFace.setAttribute('aria-hidden', isFlipped ? 'true' : 'false');
      }
      if(backFace){
        backFace.setAttribute('aria-hidden', isFlipped ? 'false' : 'true');
      }
    };

    card.addEventListener('click', toggleFlip);
    card.addEventListener('keydown', (ev) => {
      if(ev.key === 'Enter' || ev.key === ' '){
        ev.preventDefault();
        toggleFlip();
      }
    });
    return card;
  }

  function applyCampaignTheme(data){
    const campSection = document.getElementById('campanhas');
    if(!campSection) return;
    const defaultBg = campSection.dataset.defaultBg || '#fff';
    const bgColor = data.cor_fundo || defaultBg;
    const accentColor = data.cor_secundaria || tintColor(bgColor, 0.25);
    const textColor = data.cor_texto || getReadableColor(bgColor);

    campSection.style.background = `linear-gradient(135deg, ${bgColor}, ${accentColor})`;
    campSection.style.color = textColor;

    const titleEl = document.getElementById('campTitle');
    if(titleEl){
      titleEl.innerText = data.campanha || 'Campanha especial';
      titleEl.style.color = textColor;
    }

    const subtitleEl = document.getElementById('campSubtitle');
    if(subtitleEl){
      subtitleEl.innerText = 'Campanha exclusiva';
      subtitleEl.style.color = getReadableColor(bgColor, 0.85);
    }

    const descEl = document.getElementById('campDescription');
    if(descEl){
      descEl.innerText = data.descricao || 'Descubra os itens sazonais com a mesma qualidade artesanal.';
      descEl.style.color = getReadableColor(bgColor, 0.9);
    }
  }

  function getReadableColor(hex, alpha = 1){
    const rgb = hexToRgb(hex) || {r:255,g:255,b:255};
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    const base = luminance > 0.62 ? 'rgba(74,52,47,' : 'rgba(255,255,255,';
    return `${base}${alpha})`;
  }

  function tintColor(hex, amount = 0.2){
    const rgb = hexToRgb(hex);
    if(!rgb) return hex;
    const mix = {
      r: Math.round(rgb.r + (255 - rgb.r) * amount),
      g: Math.round(rgb.g + (255 - rgb.g) * amount),
      b: Math.round(rgb.b + (255 - rgb.b) * amount)
    };
    return rgbToHex(mix);
  }

  function hexToRgb(hex){
    if(!hex) return null;
    const clean = hex.replace('#','');
    if(clean.length !== 3 && clean.length !== 6) return null;
    const normalized = clean.length === 3 ? clean.split('').map(ch => ch + ch).join('') : clean;
    const intVal = parseInt(normalized, 16);
    return {
      r: (intVal >> 16) & 255,
      g: (intVal >> 8) & 255,
      b: intVal & 255
    };
  }

  function rgbToHex({r,g,b}){
    const toHex = (value) => {
      const clamped = Math.max(0, Math.min(255, value));
      return clamped.toString(16).padStart(2, '0');
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function initCarousel(trackSelector, prevSelector, nextSelector, baseCardWidth = 240){
    const track = document.querySelector(trackSelector);
    const viewport = track ? track.closest('.carousel-viewport') : null;
    const prevBtn = document.querySelector(prevSelector);
    const nextBtn = document.querySelector(nextSelector);

    if(!track || !viewport || !prevBtn || !nextBtn || !track.children.length){
      return null;
    }

    const state = {
      itemsPerView: 1,
      viewWidth: viewport.clientWidth,
      gap: getGap(track),
      maxIndex: 0,
      currentIndex: 0,
      cardWidth: 0,
      step: 0,
      maxOffset: 0
    };

    viewport.style.touchAction = 'pan-y';

  let pointerActive = false;
  let pointerId = null;
  let pointerStartX = 0;

    const getSwipeThreshold = () => {
      const basis = state.cardWidth || baseCardWidth;
      return Math.max(30, Math.min(120, basis * 0.25));
    };

    const updateButtons = () => {
      prevBtn.disabled = state.currentIndex === 0;
      nextBtn.disabled = state.currentIndex >= state.maxIndex;
    };

    const updateLayout = () => {
      const cards = Array.from(track.children);
      if(!cards.length) return;

      state.gap = getGap(track);
      const viewportWidth = viewport.clientWidth;
      const desired = baseCardWidth;
      let items = Math.max(1, Math.floor((viewportWidth + state.gap) / (desired + state.gap)));
      items = Math.min(items, cards.length);
      const cardWidth = Math.floor((viewportWidth - state.gap * (items - 1)) / items);

      cards.forEach(card => {
        card.style.flex = `0 0 ${cardWidth}px`;
        card.style.maxWidth = `${cardWidth}px`;
      });

      state.itemsPerView = items;
      state.viewWidth = viewportWidth;
      state.cardWidth = cardWidth;
      state.step = cardWidth + state.gap;
      const totalWidth = cards.length * cardWidth + state.gap * Math.max(0, cards.length - 1);
      state.maxOffset = Math.max(0, totalWidth - viewportWidth);
      state.maxIndex = Math.max(0, cards.length - items);
      if(state.currentIndex > state.maxIndex){
        state.currentIndex = state.maxIndex;
      }
      updatePosition();
    };

    const updatePosition = () => {
      const rawOffset = state.currentIndex * (state.step || 0);
      const offset = Math.min(rawOffset, state.maxOffset || 0);
      track.style.transform = `translate3d(-${offset}px, 0, 0)`;
      updateButtons();
    };

    const handlePrev = () => {
      if(state.currentIndex === 0) return;
      state.currentIndex -= 1;
      updatePosition();
    };

    const handleNext = () => {
      if(state.currentIndex >= state.maxIndex) return;
      state.currentIndex += 1;
      updatePosition();
    };

    const handlePointerDown = (event) => {
      if(event.pointerType === 'mouse' && event.button !== 0) return;
      pointerActive = true;
      pointerId = event.pointerId;
      pointerStartX = event.clientX;
    };

    const handlePointerMove = (event) => {
      if(!pointerActive || event.pointerId !== pointerId) return;
      const deltaX = event.clientX - pointerStartX;
      if(Math.abs(deltaX) > 10 && event.cancelable){
        event.preventDefault();
      }
    };

    const finalizeSwipe = (event) => {
      if(!pointerActive || event.pointerId !== pointerId) return;
      pointerActive = false;
      const deltaX = event.clientX - pointerStartX;
      pointerId = null;
      const threshold = getSwipeThreshold();
      if(deltaX > threshold){
        handlePrev();
      } else if(deltaX < -threshold){
        handleNext();
      }
    };

    const handlePointerUp = (event) => {
      finalizeSwipe(event);
    };

    const handlePointerCancel = () => {
      pointerActive = false;
      pointerId = null;
    };

    const resizeHandler = debounce(updateLayout, 150);

    prevBtn.addEventListener('click', handlePrev);
    nextBtn.addEventListener('click', handleNext);
    window.addEventListener('resize', resizeHandler);
  viewport.addEventListener('pointerdown', handlePointerDown);
  viewport.addEventListener('pointermove', handlePointerMove, {passive:false});
  viewport.addEventListener('pointerup', handlePointerUp);
  viewport.addEventListener('pointercancel', handlePointerCancel);
  viewport.addEventListener('pointerleave', handlePointerCancel);

    updateLayout();

    return () => {
      prevBtn.removeEventListener('click', handlePrev);
      nextBtn.removeEventListener('click', handleNext);
      window.removeEventListener('resize', resizeHandler);
      viewport.removeEventListener('pointerdown', handlePointerDown);
      viewport.removeEventListener('pointermove', handlePointerMove);
      viewport.removeEventListener('pointerup', handlePointerUp);
      viewport.removeEventListener('pointercancel', handlePointerCancel);
      viewport.removeEventListener('pointerleave', handlePointerCancel);
    };
  }

  function getGap(track){
    const styles = window.getComputedStyle(track);
    const gapToken = styles.columnGap || styles.gap || '16px';
    const parsed = parseFloat(gapToken);
    return Number.isFinite(parsed) ? parsed : 16;
  }

  function debounce(fn, delay){
    let timeout;
    return function(...args){
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // simple escape
  function escapeHtml(str){
    if(!str) return '';
    return String(str).replace(/[&<>"']/g, function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
  }

});
