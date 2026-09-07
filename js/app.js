// app.js
// Basilio Bolos - interações do site (conteúdo é estático, gerado por tools/gerar.js)
document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', function(){

  const mainNav = document.getElementById('mainNav');
  const navbarContent = document.getElementById('navbarContent');
  const menuToggle = mainNav?.querySelector('[data-menu-toggle]');
  const whatsappFloat = document.querySelector('.whatsapp-float');

  // ---------- Ano atual no rodapé ----------
  const anoEl = document.getElementById('anoAtual');
  if(anoEl) anoEl.innerText = new Date().getFullYear();

  // ---------- Privacidade e consentimento ----------
  const ANALYTICS_ID = 'G-C07W6E0102';
  const CONSENT_STORAGE_KEY = 'basilio_privacy_consent';
  const ANALYTICS_SCRIPT_ID = 'google-analytics-script';
  const consentBanner = document.querySelector('[data-privacy-banner]');
  let consentValue = null;
  let consentTrigger = null;

  const readStoredConsent = () => {
    try{
      const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
      return value === 'accepted' || value === 'rejected' ? value : null;
    }catch(error){
      return null;
    }
  };

  const saveConsent = (value) => {
    consentValue = value;
    try{
      window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
    }catch(error){
      // A escolha válida para a sessão ainda pode ser respeitada sem storage.
    }
  };

  const updateGoogleConsent = (granted) => {
    if(typeof window.gtag !== 'function') return;
    window.gtag('consent', 'update', {
      analytics_storage: granted ? 'granted' : 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
  };

  const clearAnalyticsCookies = () => {
    const names = document.cookie.split(';')
      .map(cookie => cookie.trim().split('=')[0])
      .filter(name => /^_(ga|gid|gat)(_|$)/i.test(name));
    const domains = ['', window.location.hostname, `.${window.location.hostname}`];

    names.forEach(name => {
      [...new Set(domains)].forEach(domain => {
        const domainAttribute = domain ? `; domain=${domain}` : '';
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domainAttribute}`;
      });
    });
  };

  const loadAnalytics = () => {
    if(consentValue !== 'accepted' || document.getElementById(ANALYTICS_SCRIPT_ID)) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
    updateGoogleConsent(true);
    window.gtag('js', new Date());
    window.gtag('config', ANALYTICS_ID, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: 31536000,
      page_path: window.location.pathname
    });

    const script = document.createElement('script');
    script.id = ANALYTICS_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ANALYTICS_ID)}`;
    script.referrerPolicy = 'no-referrer';
    document.head.appendChild(script);
  };

  const setBannerVisibility = (visible) => {
    if(!consentBanner) return;
    consentBanner.hidden = !visible;
    consentBanner.setAttribute('aria-hidden', String(!visible));
  };

  const openConsentSettings = (trigger = null) => {
    consentTrigger = trigger;
    setBannerVisibility(true);
    consentBanner?.querySelector('[data-privacy-reject]')?.focus();
  };

  const closeConsentSettings = () => {
    setBannerVisibility(false);
    if(consentTrigger && typeof consentTrigger.focus === 'function') consentTrigger.focus();
    consentTrigger = null;
  };

  const chooseConsent = (value) => {
    saveConsent(value);
    if(value === 'accepted'){
      loadAnalytics();
    }else{
      updateGoogleConsent(false);
      clearAnalyticsCookies();
    }
    closeConsentSettings();
  };

  consentValue = readStoredConsent();
  document.querySelectorAll('[data-privacy-accept]').forEach(button => {
    button.addEventListener('click', () => chooseConsent('accepted'));
  });
  document.querySelectorAll('[data-privacy-reject]').forEach(button => {
    button.addEventListener('click', () => chooseConsent('rejected'));
  });
  document.querySelectorAll('[data-privacy-settings]').forEach(trigger => {
    trigger.addEventListener('click', () => openConsentSettings(trigger));
  });

  if(consentBanner){
    if(consentValue === 'accepted'){
      setBannerVisibility(false);
      loadAnalytics();
    }else if(consentValue === 'rejected'){
      clearAnalyticsCookies();
      setBannerVisibility(false);
    }else{
      // Remove cookies left by a previous version before asking again.
      clearAnalyticsCookies();
      setBannerVisibility(true);
    }
  }else if(consentValue === 'accepted'){
    loadAnalytics();
  }

  // ---------- Analytics ----------
  const trackEvent = (eventName, params = {}) => {
    if(consentValue !== 'accepted' || typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, params);
  };

  // Rastreio de cliques no WhatsApp (links já vêm prontos no HTML estático)
  document.querySelectorAll('a[href*="wa.me"]').forEach(el => {
    el.addEventListener('click', () => {
      trackEvent('whatsapp_click', {
        location: el.dataset.track || el.getAttribute('aria-label') || 'cta',
        page: window.location.pathname
      });
    });
  });

  // ---------- Menu mobile: painel lateral sem animação de altura ----------
  if(mainNav && navbarContent && menuToggle){
    const mobileMenuQuery = window.matchMedia('(max-width: 991.98px)');

    const setMenuOpen = (open) => {
      const isOpen = mobileMenuQuery.matches && open;
      navbarContent.classList.toggle('is-open', isOpen);
      navbarContent.setAttribute('aria-hidden', String(!isOpen && mobileMenuQuery.matches));
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      menuToggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
      document.documentElement.classList.toggle('menu-open', isOpen);
      document.body.classList.toggle('menu-open', isOpen);

      if('inert' in navbarContent) navbarContent.inert = !isOpen && mobileMenuQuery.matches;
    };

    const syncMenuWithViewport = () => {
      setMenuOpen(navbarContent.classList.contains('is-open'));
    };

    menuToggle.addEventListener('click', () => {
      setMenuOpen(!navbarContent.classList.contains('is-open'));
    });

    navbarContent.querySelectorAll('.nav-link:not(.dropdown-toggle), .dropdown-item, .btn').forEach(link => {
      link.addEventListener('click', () => setMenuOpen(false));
    });

    document.addEventListener('keydown', (event) => {
      if(event.key === 'Escape' && navbarContent.classList.contains('is-open')){
        setMenuOpen(false);
        menuToggle.focus();
      }
    });

    if(typeof mobileMenuQuery.addEventListener === 'function'){
      mobileMenuQuery.addEventListener('change', syncMenuWithViewport);
    } else if(typeof mobileMenuQuery.addListener === 'function'){
      mobileMenuQuery.addListener(syncMenuWithViewport);
    }

    syncMenuWithViewport();
  }

  // ---------- Scroll suave para âncoras da própria página ----------
  const navbarHeight = () => mainNav ? mainNav.getBoundingClientRect().height : 0;
  const scrollToAnchor = (targetEl, behavior = 'smooth') => {
    const extraOffset = 12;
    const targetTop = targetEl.getBoundingClientRect().top + window.scrollY - navbarHeight() - extraOffset;
    window.scrollTo({top: Math.max(targetTop, 0), behavior});
  };

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (event) => {
      const hash = link.getAttribute('href');
      if(!hash || hash === '#') return;
      const targetEl = document.getElementById(hash.substring(1));
      if(!targetEl) return;

      const priceFormat = targetEl.dataset.boloPriceFormat;
      if(priceFormat){
        const formatButton = [...document.querySelectorAll('[data-bolo-format]')]
          .find(button => button.dataset.boloFormat === priceFormat);
        if(formatButton){
          event.preventDefault();
          formatButton.click();
          if(history.replaceState) history.replaceState(null, '', hash);
          window.requestAnimationFrame(() => scrollToAnchor(targetEl));
          return;
        }
      }

      event.preventDefault();
      scrollToAnchor(targetEl);
      if(history.replaceState){
        history.replaceState(null, '', hash);
      }
    });
  });

  // ---------- Seletor unificado de formatos de bolo ----------
  const configurarFormatosBolo = () => {
    const selector = document.querySelector('[data-bolo-format-selector]');
    if(!selector) return;

    const buttons = [...selector.querySelectorAll('[data-bolo-format]')];
    const panels = [...document.querySelectorAll('[data-formato-panel]')];
    if(!buttons.length || !panels.length) return;

    const formatIds = buttons.map(button => button.dataset.boloFormat);
    const formatoDaHash = (hash) => {
      if(formatIds.includes(hash)) return hash;
      const prefix = 'precos-';
      const formato = hash.startsWith(prefix) ? hash.slice(prefix.length) : '';
      return formatIds.includes(formato) ? formato : null;
    };
    const formatLabel = (id) => {
      const button = buttons.find(item => item.dataset.boloFormat === id);
      return button?.querySelector('.bolo-formato-card-copy strong')?.textContent?.trim() || id;
    };

    const atualizarLinksPedido = (id) => {
      const label = formatLabel(id);
      document.querySelectorAll('[data-bolo-order]').forEach(link => {
        const baseMessage = link.dataset.boloOrderBase;
        const baseHref = link.getAttribute('href')?.split('?')[0];
        if(!baseMessage || !baseHref) return;
        const message = `${baseMessage} Formato escolhido: ${label}.`;
        link.setAttribute('href', `${baseHref}?text=${encodeURIComponent(message)}`);
      });
    };

    const reiniciarTransicaoFormato = (element) => {
      if(!element) return;
      element.classList.remove('is-format-changing');
      void element.offsetWidth;
      element.classList.add('is-format-changing');
    };

    let formatoAtivo = null;
    const ativarFormato = (id, { atualizarUrl = true, animar = true } = {}) => {
      const formato = formatIds.includes(id) ? id : formatIds[0];
      const formatoMudou = formato !== formatoAtivo;

      buttons.forEach(button => {
        const selecionado = button.dataset.boloFormat === formato;
        button.classList.toggle('is-selected', selecionado);
        button.setAttribute('aria-selected', String(selecionado));
        button.tabIndex = selecionado ? 0 : -1;
      });

      panels.forEach(panel => {
        const selecionado = panel.dataset.formatoPanel === formato;
        panel.hidden = !selecionado;
        panel.setAttribute('aria-hidden', String(!selecionado));
      });

      const statusName = selector.querySelector('[data-bolo-format-status-name]');
      if(statusName) statusName.textContent = formatLabel(formato);

      const previewImage = selector.querySelector('[data-bolo-format-preview-image]');
      const preview = selector.querySelector('[data-bolo-format-preview]');
      const selectionNote = selector.querySelector('[data-bolo-format-status]');
      const selectedButton = buttons.find(button => button.dataset.boloFormat === formato);
      if(previewImage && selectedButton?.dataset.boloFormatImage){
        previewImage.src = selectedButton.dataset.boloFormatImage;
        previewImage.alt = selectedButton.dataset.boloFormatImageAlt || `Foto de um bolo ${formatLabel(formato).toLowerCase()}`;
        preview?.style.setProperty('--format-media-image', `url("${selectedButton.dataset.boloFormatImage}")`);
      }

      if(animar && formatoMudou){
        reiniciarTransicaoFormato(selectionNote);
        reiniciarTransicaoFormato(preview);
      }
      formatoAtivo = formato;

      atualizarLinksPedido(formato);
      document.dispatchEvent(new CustomEvent('bolo-format-changed'));
      if(atualizarUrl && window.history?.replaceState && window.location.hash !== `#${formato}`){
        window.history.replaceState(null, '', `#${formato}`);
      }
    };

    const hashFormat = window.location.hash.slice(1);
    const initialFormat = formatoDaHash(hashFormat) || selector.dataset.initialFormat;
    ativarFormato(initialFormat, { atualizarUrl: false, animar: false });
    if(hashFormat === `precos-${initialFormat}`){
      window.requestAnimationFrame(() => {
        const targetEl = document.getElementById(hashFormat);
        if(targetEl) scrollToAnchor(targetEl, 'auto');
      });
    }

    buttons.forEach((button, index) => {
      button.addEventListener('click', () => ativarFormato(button.dataset.boloFormat));
      button.addEventListener('keydown', event => {
        const key = event.key;
        if(!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(key)) return;

        event.preventDefault();
        let nextIndex = index;
        if(key === 'ArrowRight' || key === 'ArrowDown') nextIndex = (index + 1) % buttons.length;
        if(key === 'ArrowLeft' || key === 'ArrowUp') nextIndex = (index - 1 + buttons.length) % buttons.length;
        if(key === 'Home') nextIndex = 0;
        if(key === 'End') nextIndex = buttons.length - 1;
        buttons[nextIndex].focus();
        ativarFormato(buttons[nextIndex].dataset.boloFormat);
      });
    });

    window.addEventListener('hashchange', () => {
      const nextHash = window.location.hash.slice(1);
      const nextFormat = formatoDaHash(nextHash);
      if(!nextFormat) return;
      ativarFormato(nextFormat, { atualizarUrl: false });
      if(nextHash === `precos-${nextFormat}`){
        window.requestAnimationFrame(() => {
          const targetEl = document.getElementById(nextHash);
          if(targetEl) scrollToAnchor(targetEl);
        });
      }
    });
  };

  configurarFormatosBolo();

  // ---------- Carrossel mobile de sugestões de corte ----------
  const configurarCarrosseisDeCorte = () => {
    const atualizarNavegacao = [];

    document.querySelectorAll('[data-slice-carousel]').forEach(carousel => {
      const track = carousel.querySelector('[data-slice-carousel-track]');
      const previous = carousel.querySelector('[data-slice-carousel-prev]');
      const next = carousel.querySelector('[data-slice-carousel-next]');
      const controls = carousel.querySelector('[data-slice-carousel-controls]');
      const cards = [...(track?.querySelectorAll('.slice-suggestion-card') || [])];
      if(!track || !previous || !next || cards.length < 2){
        if(controls) controls.hidden = true;
        return;
      }

      const atualizarBotoes = () => {
        const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
        previous.hidden = track.scrollLeft <= 2;
        next.hidden = track.scrollLeft >= maxScroll - 2;
      };

      const scrollByCard = (direction) => {
        const trackStyle = getComputedStyle(track);
        const gap = parseFloat(trackStyle.columnGap) || parseFloat(trackStyle.gap) || 0;
        const distance = cards[0].getBoundingClientRect().width + gap;
        track.scrollBy({left: direction * distance, behavior: 'smooth'});
      };

      previous?.addEventListener('click', () => scrollByCard(-1));
      next?.addEventListener('click', () => scrollByCard(1));
      track.addEventListener('scroll', atualizarBotoes, {passive: true});
      track.addEventListener('keydown', event => {
        if(event.key === 'ArrowLeft'){
          event.preventDefault();
          scrollByCard(-1);
        }
        if(event.key === 'ArrowRight'){
          event.preventDefault();
          scrollByCard(1);
        }
      });
      atualizarNavegacao.push(atualizarBotoes);
      atualizarBotoes();
    });

    const atualizarTodosOsBotoes = () => atualizarNavegacao.forEach(atualizar => atualizar());
    document.addEventListener('bolo-format-changed', () => {
      window.requestAnimationFrame(atualizarTodosOsBotoes);
    });
    window.addEventListener('resize', atualizarTodosOsBotoes, {passive: true});
  };

  configurarCarrosseisDeCorte();

  // ---------- Expansão responsiva das grades de produtos ----------
  const configurarExpansaoProdutos = (listaProdutos, verMaisProdutos) => {
    if(!listaProdutos || !verMaisProdutos) return;
    let produtosExpandidos = false;

    const atualizarProdutosVisiveis = () => {
      const produtos = [...listaProdutos.querySelectorAll('.prod-card')];
      const colunas = Math.max(1, getComputedStyle(listaProdutos).gridTemplateColumns.trim().split(/\s+/).length);
      const limite = produtos.length <= colunas ? produtos.length : Math.floor(produtos.length / colunas) * colunas;

      produtos.forEach((produto, indice) => {
        produto.hidden = !produtosExpandidos && indice >= limite;
      });
      verMaisProdutos.hidden = produtosExpandidos || limite === produtos.length;
      verMaisProdutos.setAttribute('aria-expanded', String(produtosExpandidos));
    };

    verMaisProdutos.addEventListener('click', () => {
      produtosExpandidos = true;
      atualizarProdutosVisiveis();
    });
    window.addEventListener('resize', atualizarProdutosVisiveis, {passive: true});
    atualizarProdutosVisiveis();
  };

  configurarExpansaoProdutos(
    document.getElementById('lista-produtos'),
    document.querySelector('[data-ver-mais-produtos]')
  );
  document.querySelectorAll('[data-lista-relacionados]').forEach(lista => {
    configurarExpansaoProdutos(lista, lista.parentElement.querySelector('[data-ver-mais-relacionados]'));
  });

  // ---------- Navbar e botão flutuante: efeitos ao rolar ----------
  const atualizarEstadoScroll = () => {
    if(mainNav){
      mainNav.classList.toggle('scrolled', window.pageYOffset > 100);
    }

    if(whatsappFloat){
      const distanciaDoFim = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
      whatsappFloat.classList.toggle('is-near-bottom', distanciaDoFim <= 120);
    }
  };

  window.addEventListener('scroll', atualizarEstadoScroll, {passive: true});
  window.addEventListener('resize', atualizarEstadoScroll, {passive: true});
  atualizarEstadoScroll();

  // ---------- Swiper (carrossel de campanhas, quando ativo) ----------
  if(document.querySelector('.campSwiper') && typeof Swiper !== 'undefined'){
    const container = document.querySelector('.campSwiper');
    const carouselContainer = container.closest('.carousel-container');
    new Swiper('.campSwiper', {
      slidesPerView: 1.2,
      spaceBetween: 20,
      grabCursor: true,
      watchOverflow: true,
      pagination: {
        el: carouselContainer ? carouselContainer.querySelector('.swiper-pagination') : null,
        clickable: false,
        dynamicBullets: true,
        dynamicMainBullets: 1
      },
      navigation: {
        nextEl: carouselContainer ? carouselContainer.querySelector('.swiper-button-next') : null,
        prevEl: carouselContainer ? carouselContainer.querySelector('.swiper-button-prev') : null
      },
      breakpoints: {
        480: {slidesPerView: 1.5, spaceBetween: 16},
        640: {slidesPerView: 2, spaceBetween: 20},
        768: {slidesPerView: 2.5, spaceBetween: 20},
        992: {slidesPerView: 3, spaceBetween: 24},
        1200: {slidesPerView: 3.5, spaceBetween: 24},
        1400: {slidesPerView: 4, spaceBetween: 24}
      },
      a11y: {
        enabled: true,
        prevSlideMessage: 'Slide anterior',
        nextSlideMessage: 'Próximo slide'
      }
    });
  }

});
