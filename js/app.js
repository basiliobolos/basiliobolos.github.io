// app.js
// Basilio Bolos - interações do site (conteúdo é estático, gerado por tools/gerar.js)
document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', function(){

  const mainNav = document.getElementById('mainNav');
  const navbarContent = document.getElementById('navbarContent');
  const whatsappFloat = document.querySelector('.whatsapp-float');

  // ---------- Ano atual no rodapé ----------
  const anoEl = document.getElementById('anoAtual');
  if(anoEl) anoEl.innerText = new Date().getFullYear();

  // ---------- Analytics ----------
  const trackEvent = (eventName, params = {}) => {
    if(typeof window !== 'undefined' && typeof window.gtag === 'function'){
      window.gtag('event', eventName, params);
    } else if(Array.isArray(window?.dataLayer)){
      window.dataLayer.push({event: eventName, ...params});
    }
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

  // ---------- Menu mobile: fecha ao clicar em um link ----------
  let collapseController = null;
  if(navbarContent && typeof bootstrap !== 'undefined' && bootstrap.Collapse){
    collapseController = new bootstrap.Collapse(navbarContent, {toggle:false});
    navbarContent.querySelectorAll('.nav-link:not(.dropdown-toggle), .dropdown-item, .btn').forEach(link => {
      link.addEventListener('click', () => {
        if(navbarContent.classList.contains('show')) collapseController.hide();
      });
    });
  }

  // ---------- Scroll suave para âncoras da própria página ----------
  const navbarHeight = () => mainNav ? mainNav.getBoundingClientRect().height : 0;

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (event) => {
      const hash = link.getAttribute('href');
      if(!hash || hash === '#') return;
      const targetEl = document.getElementById(hash.substring(1));
      if(!targetEl) return;
      event.preventDefault();
      const extraOffset = 12;
      const targetTop = targetEl.getBoundingClientRect().top + window.scrollY - navbarHeight() - extraOffset;
      window.scrollTo({top: Math.max(targetTop, 0), behavior: 'smooth'});
      if(history.replaceState){
        history.replaceState(null, '', hash);
      }
    });
  });

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
