// app.js
// Basilio Bolos - Page logic
document.addEventListener('DOMContentLoaded', function(){

  const mainNav = document.getElementById('mainNav');
  const navbarContent = document.getElementById('navbarContent');
  let collapseController = null;
  let pendingScrollHash = null;
  let navbarHeight = 0;

  // Capturar a altura da navbar no carregamento (sempre colapsada)
  const captureNavbarHeight = () => {
    if(!mainNav) return;
    navbarHeight = mainNav.getBoundingClientRect().height;
  };

  // Capturar altura assim que possível
  captureNavbarHeight();
  window.addEventListener('load', captureNavbarHeight);

  // insert current year
  document.getElementById('anoAtual').innerText = new Date().getFullYear();

  // WhatsApp default link (placeholder)
  const WA_NUMBER = '5511968101912';
  const DEFAULT_WA_MSG = 'Olá! Vi seus doces e gostaria de receber mais informações. Pode me ajudar?';

  const trackEvent = (eventName, params = {}) => {
    if(typeof window !== 'undefined' && typeof window.gtag === 'function'){
      window.gtag('event', eventName, params);
    } else if(Array.isArray(window?.dataLayer)){
      window.dataLayer.push({event: eventName, ...params});
    }
  };

  // set whatsapp links (supports custom messages via data attribute)
  document.querySelectorAll('[data-wa-message]').forEach(el => {
    const customMsg = el.dataset.waMessage || DEFAULT_WA_MSG;
    const encodedMsg = encodeURIComponent(customMsg);
    el.href = `https://wa.me/${WA_NUMBER}?text=${encodedMsg}`;

    if(el.dataset.waMetricsBound === 'true') return;
    el.dataset.waMetricsBound = 'true';
    el.addEventListener('click', () => {
      trackEvent('whatsapp_click', {
        location: el.id || el.getAttribute('aria-label') || el.textContent?.trim() || 'cta',
        message_preview: customMsg.substring(0, 60)
      });
    });
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
          const slide = document.createElement('div');
          slide.className = 'swiper-slide';
          slide.appendChild(createFlipCard(prod));
          campList.appendChild(slide);
        });
        insertHeroButton(heroCtas, camp);
      });
      applyCampaignTheme(activeCampaigns[0]);
      initSwiper('.campSwiper');
    } else {
      document.getElementById('campanhas').style.display = 'none';
    }

    // ---------- PRODUTOS ----------
    const normalizedProducts = Array.isArray(produtosData)
      ? produtosData
      : Array.isArray(produtosData?.produtos)
        ? produtosData.produtos
        : [];

    if(normalizedProducts.length){
      const prodList = document.getElementById('prodList');
      normalizedProducts.forEach(prod => {
        const slide = document.createElement('div');
        slide.className = 'swiper-slide';
        slide.appendChild(createFlipCard(prod));
        prodList.appendChild(slide);
      });
      initSwiper('.prodSwiper');
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
      if(!pendingScrollHash) return;
      performAnchoredScroll(pendingScrollHash);
      pendingScrollHash = null;
    });
  }

  // adjust scroll position to account for fixed navbar height
  const registerAnchorLink = (link) => {
    if(!link || link.dataset.anchorScrollBound === 'true') return;
    link.dataset.anchorScrollBound = 'true';
    const linkLabel = link.dataset.analyticsName || link.getAttribute('aria-label') || link.textContent?.trim() || link.id || 'anchor';
    link.addEventListener('click', (event) => {
      const hash = link.getAttribute('href');
      if(!hash || hash === '#') return;
      trackEvent('anchor_click', {
        target: hash,
        source: linkLabel
      });
      event.preventDefault();
      const isMenuOpen = navbarContent && navbarContent.classList.contains('show');
      if(isMenuOpen && collapseController){
        pendingScrollHash = hash;
        collapseController.hide();
      } else {
        performAnchoredScroll(hash);
      }
    });
  };

  document.querySelectorAll('#navbarContent a[href^="#"], .navbar-brand[href^="#"], #hero a[href^="#"], #heroCtas a[href^="#"]').forEach(registerAnchorLink);

  function performAnchoredScroll(hash){
    if(!hash || hash === '#') return;
    const targetId = hash.startsWith('#') ? hash.substring(1) : hash;
    if(!targetId) return;
    const targetEl = document.getElementById(targetId);
    if(!targetEl) return;
    // Usar sempre a altura inicial da navbar (colapsada)
    const extraOffset = 12;
    const targetTop = targetEl.getBoundingClientRect().top + window.scrollY - navbarHeight - extraOffset;
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
  button.dataset.analyticsName = `cta_${(campaign.campanha || 'campanha').toLowerCase()}`;
    registerAnchorLink(button);

    btnWrapper.appendChild(button);
    container.insertBefore(btnWrapper, container.lastElementChild);
  }

  let flipIdCounter = 0;

  // helper: create modern card element from product object
  function createFlipCard(prod){
    const cardId = `flip-card-${++flipIdCounter}`;
    const titleId = `${cardId}-title`;
    const priceId = `${cardId}-price`;
    const descId = `${cardId}-desc`;
    const productTitle = prod && prod.titulo ? prod.titulo : 'Produto Basilio';
    const descText = prod.descricao && prod.descricao.trim().length ? prod.descricao : productTitle;

    const card = document.createElement('article');
    card.className = 'flip-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-labelledby', titleId);
    card.setAttribute('aria-describedby', `${priceId} ${descId}`);
    card.dataset.productTitle = productTitle;
    card.dataset.productDesc = descText;
    card.dataset.productImage = prod.imagem;
    card.dataset.productPrice = getPriceLabel(prod.valor).text;

    const priceLabel = getPriceLabel(prod.valor);
    const priceClass = priceLabel.isCustom ? 'price price-alt' : 'price';
    const priceAria = priceLabel.isCustom ? '' : ' aria-label="Valor sob consulta"';
    
    const badge = prod.badge || (prod.destaque ? 'Destaque' : '');
    const badgeHTML = badge ? `<span class="card-badge">${escapeHtml(badge)}</span>` : '';

    card.innerHTML = `
      <div class="flip-inner">
        <div class="flip-front">
          <div class="card-image-wrapper">
            <img src="${prod.imagem}" alt="${escapeHtml(productTitle)}" loading="lazy">
            ${badgeHTML}
          </div>
          <div class="card-content">
            <h5 id="${titleId}">${escapeHtml(productTitle)}</h5>
            <p class="card-description" id="${descId}">${escapeHtml(descText)}</p>
            <p id="${priceId}" class="${priceClass}"${priceAria}>${escapeHtml(priceLabel.text)}</p>
          </div>
        </div>
      </div>
    `;

    // Click to open modal
    card.addEventListener('click', () => {
      openProductModal(productTitle, descText, prod.imagem, priceLabel.text);
    });

    // Enter/Space to open modal
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openProductModal(productTitle, descText, prod.imagem, priceLabel.text);
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

  // ========== SWIPER CAROUSEL INITIALIZATION ==========
  function initSwiper(containerSelector) {
    if (typeof Swiper === 'undefined') {
      console.warn('Swiper library not loaded');
      return null;
    }

    const container = document.querySelector(containerSelector);
    if (!container) return null;

    const swiper = new Swiper(containerSelector, {
      slidesPerView: 1.2,
      spaceBetween: 20,
      grabCursor: true,
      loop: false,
      watchOverflow: true,
      
      // Pagination (bolinhas)
      pagination: {
        el: `${containerSelector} .swiper-pagination`,
        clickable: true,
        dynamicBullets: true,
        dynamicMainBullets: 3,
      },
      
      // Navigation (setas)
      navigation: {
        nextEl: `${containerSelector} .swiper-button-next`,
        prevEl: `${containerSelector} .swiper-button-prev`,
      },
      
      // Breakpoints responsivos
      breakpoints: {
        // Mobile small
        480: {
          slidesPerView: 1.5,
          spaceBetween: 16,
        },
        // Mobile
        640: {
          slidesPerView: 2,
          spaceBetween: 20,
        },
        // Tablet
        768: {
          slidesPerView: 2.5,
          spaceBetween: 20,
        },
        // Desktop small
        992: {
          slidesPerView: 3,
          spaceBetween: 24,
        },
        // Desktop
        1200: {
          slidesPerView: 3.5,
          spaceBetween: 24,
        },
        // Desktop large
        1400: {
          slidesPerView: 4,
          spaceBetween: 24,
        }
      },
      
      // Acessibilidade
      a11y: {
        enabled: true,
        prevSlideMessage: 'Slide anterior',
        nextSlideMessage: 'Próximo slide',
        paginationBulletMessage: 'Ir para o slide {{index}}',
      },
      
      // Eventos para analytics
      on: {
        slideChange: function() {
          trackEvent('carousel_navigate', {
            carousel: containerSelector.replace('.', ''),
            index: this.activeIndex
          });
        }
      }
    });

    return swiper;
  }

  // OLD CAROUSEL - Manter por compatibilidade (não usado atualmente)
  function initCarousel(trackSelector, prevSelector, nextSelector, baseCardWidth = 240){
    const track = document.querySelector(trackSelector);
    const viewport = track ? track.closest('.carousel-viewport') : null;
    const prevBtn = document.querySelector(prevSelector);
    const nextBtn = document.querySelector(nextSelector);

    if(!track || !viewport || !prevBtn || !nextBtn || !track.children.length){
      return null;
    }

    const carouselName = trackSelector.replace('#','') || 'carousel';

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
      let items = Math.floor((viewportWidth + state.gap) / (desired + state.gap));
      const minItemsByWidth = viewportWidth >= (desired * 2 + state.gap) ? 2 : 1;
      items = Math.max(minItemsByWidth, items);
      items = Math.min(items, cards.length || 1);
      if(items < 1){
        items = 1;
      }
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
      trackEvent('carousel_navigate', {
        carousel: carouselName,
        direction: 'prev',
        index: state.currentIndex
      });
    };

    const handleNext = () => {
      if(state.currentIndex >= state.maxIndex) return;
      state.currentIndex += 1;
      updatePosition();
      trackEvent('carousel_navigate', {
        carousel: carouselName,
        direction: 'next',
        index: state.currentIndex
      });
    };

    const resizeHandler = debounce(updateLayout, 150);

    prevBtn.addEventListener('click', handlePrev);
    nextBtn.addEventListener('click', handleNext);
    window.addEventListener('resize', resizeHandler);

    // Touch/Swipe Support
    let touchStartX = 0;
    let touchEndX = 0;
    let isDragging = false;

    const handleTouchStart = (e) => {
      touchStartX = e.touches[0].clientX;
      isDragging = true;
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;
      touchEndX = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      
      const swipeThreshold = 50;
      const diff = touchStartX - touchEndX;

      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
          // Swipe left - next
          handleNext();
        } else {
          // Swipe right - prev
          handlePrev();
        }
      }
    };

    viewport.addEventListener('touchstart', handleTouchStart, {passive: true});
    viewport.addEventListener('touchmove', handleTouchMove, {passive: true});
    viewport.addEventListener('touchend', handleTouchEnd);

    updateLayout();

    return () => {
      prevBtn.removeEventListener('click', handlePrev);
      nextBtn.removeEventListener('click', handleNext);
      window.removeEventListener('resize', resizeHandler);
      viewport.removeEventListener('touchstart', handleTouchStart);
      viewport.removeEventListener('touchmove', handleTouchMove);
      viewport.removeEventListener('touchend', handleTouchEnd);
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

  function getPriceLabel(value){
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if(trimmed){
      return {text: trimmed, isCustom: true};
    }
    const numericValue = Number(value);
    if(Number.isFinite(numericValue) && numericValue > 0){
      return {text: `R$ ${numericValue.toFixed(2)}`, isCustom: false};
    }
    return {text: 'Valor sob consulta', isCustom: false};
  }

  // simple escape
  function escapeHtml(str){
    if(!str) return '';
    return String(str).replace(/[&<>"']/g, function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
  }

  // ========== PRODUCT MODAL WITH ZOOM ==========
  function openProductModal(title, description, imageSrc, price) {
    const modal = document.getElementById('detailModal');
    if (!modal) return;

    const modalBody = document.getElementById('modalBody');
    
    if (modalBody) {
      const msg = `Olá! Vi o item "${title}" no site e gostaria de encomendar.`;
      const encodedMsg = encodeURIComponent(msg);
      const whatsappLink = `https://wa.me/${WA_NUMBER}?text=${encodedMsg}`;
      
      modalBody.innerHTML = `
        <div class="product-modal-image">
          <img src="${imageSrc}" alt="${escapeHtml(title)}">
        </div>
        <div class="product-modal-text">
          <h3 class="product-modal-title">${escapeHtml(title)}</h3>
          <p class="product-modal-price">${escapeHtml(price)}</p>
          <p class="product-modal-description">${escapeHtml(description)}</p>
          <a href="${whatsappLink}" class="product-modal-btn" target="_blank" rel="noopener">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            Encomendar pelo WhatsApp
          </a>
        </div>
      `;
    }

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    trackEvent('product_modal_opened', {
      product_name: title
    });
  }

  // ========== SCROLL REVEAL ANIMATIONS ==========
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
      }
    });
  }, observerOptions);

  // Observe all scroll-reveal elements
  document.querySelectorAll('.scroll-reveal').forEach(el => {
    revealObserver.observe(el);
  });

  // Mostrar cards dos carrosséis imediatamente (sem scroll reveal)
  const showCarouselCards = () => {
    const carouselCards = document.querySelectorAll('#produtos .flip-card, #campanhas .flip-card');
    carouselCards.forEach(card => {
      card.classList.add('card-visible');
    });
  };
  
  // Executar após um pequeno delay para garantir que os cards foram criados
  setTimeout(showCarouselCards, 100);

  // ========== NAVBAR SCROLL EFFECT ==========
  let lastScroll = 0;
  const navbar = document.getElementById('mainNav');

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
  });

  // ========== LAZY LOADING FOR IMAGES ==========
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          imageObserver.unobserve(img);
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }

});
