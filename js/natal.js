(() => {
  'use strict';
  const data = JSON.parse(document.getElementById('natal-data').textContent);
  const products = new Map(data.produtos.map(product => [product.id, product]));
  const cards = [...document.querySelectorAll('[data-product]')];
  const search = document.getElementById('product-search');
  const dialog = document.getElementById('product-dialog');
  const variant = document.getElementById('variant-select');
  const flavor = document.getElementById('flavor-select');
  const gallery = document.getElementById('dialog-image');
  const galleryPhoto = document.getElementById('dialog-photo');
  const galleryDots = document.getElementById('gallery-dots');
  const galleryArrows = document.getElementById('gallery-arrows');
  const galleryStatus = document.getElementById('gallery-status');
  const galleryTrack = document.createElement('div');
  galleryTrack.className = 'gallery-track';
  galleryPhoto.append(galleryTrack);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const money = value => value == null ? 'Sob consulta' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  let category = 'todos';
  let current;
  let lastTrigger;
  let slides = [];
  let activeSlide = 0;
  let activeFrame;
  let slideFrames = new Map();
  let galleryAnimation;
  let touchStart;
  let anchoredCard;
  const flavorsFor = option => (current.sabores || []).filter(s => !s.varianteId || s.varianteId === option.id);

  function filter() {
    const terms = normalize(search.value.trim()).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    let count = 0;
    for (const card of cards) {
      const p = products.get(card.dataset.product);
      const searchableOptions = [...p.variantes, ...(p.sabores || [])].flatMap(option =>
        [option.nome, option.referencia, ...Object.values(option.opcoes || {}).flat()]);
      const haystack = normalize([p.nome, p.detalhes, p.tipoProduto, ...p.publicos, ...p.familias, ...searchableOptions].join(' '));
      const words = haystack.split(/[^\p{L}\p{N}]+/u);
      const match = (category === 'todos' || p.familias.includes(category)) && terms.every(term => words.some(word => word === term || (term.length >= 3 && word.startsWith(term))));
      card.hidden = !match;
      if (match) count++;
    }
    document.querySelectorAll('[data-group]').forEach(group => {
      group.hidden = !group.querySelector('[data-product]:not([hidden])');
    });
    document.getElementById('empty-state').hidden = count !== 0;
    document.getElementById('catalog-status').textContent = `${count} ${count === 1 ? 'presente encontrado' : 'presentes encontrados'}`;
  }
  function resetFilters() {
    category = 'todos'; search.value = '';
    document.querySelectorAll('[data-category]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === category)));
    filter();
  }
  document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => {
    category = button.dataset.category;
    document.querySelectorAll('[data-category]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    filter();
  }));
  search.addEventListener('input', filter);
  document.getElementById('clear-filters').addEventListener('click', resetFilters);
  document.querySelectorAll('[data-company-link]').forEach(link => link.addEventListener('click', resetFilters));

  // Keep the shared navigation without loading Bootstrap on the Christmas page.
  const dropdown = document.querySelector('[data-natal-dropdown]');
  const dropdownLinks = document.getElementById('product-links');
  const setDropdown = open => {
    dropdown.setAttribute('aria-expanded', String(open));
    dropdownLinks.classList.toggle('show', open);
  };
  dropdown.addEventListener('click', () => setDropdown(dropdown.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('click', event => {
    if (!dropdown.closest('.dropdown').contains(event.target)) setDropdown(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && dropdown.getAttribute('aria-expanded') === 'true') {
      setDropdown(false); dropdown.focus(); event.stopImmediatePropagation();
    }
    if (event.key === 'Tab' && document.body.classList.contains('menu-open')) {
      const controls = [...document.querySelectorAll('#mainNav a, #mainNav button')].filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
      const first = controls[0]; const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  dropdownLinks.addEventListener('click', () => setDropdown(false));

  function imageFallback(image) {
    image.addEventListener('error', () => {
      image.style.visibility = 'hidden';
      const frame = image.closest('.photo-frame');
      if (!frame || frame.querySelector('.photo-fallback')) return;
      const label = document.createElement('span');
      label.className = 'photo-fallback';
      label.textContent = image.alt.replace('Foto em breve: ', '');
      frame.append(label);
    }, { once: true });
    if (image.complete && !image.naturalWidth) image.dispatchEvent(new Event('error'));
  }
  document.querySelectorAll('img').forEach(imageFallback);

  function updateCard(card, option) {
    const product = products.get(card.dataset.product);
    const photo = option || product.fotoGeral || product.variantes[0];
    const frame = card.querySelector('.photo-frame');
    const initialImage = frame.querySelector('img');
    if (photo.imagem && initialImage.getAttribute('src') !== photo.imagem) {
      const image = initialImage.cloneNode(false);
      frame.querySelector('.photo-fallback')?.remove();
      image.style.visibility = '';
      image.src = photo.imagem;
      image.alt = photo.alt || photo.referencia;
      image.width = photo.largura || 800;
      image.height = photo.altura || 800;
      initialImage.replaceWith(image);
      imageFallback(image);
    }
    setPrice(card.querySelector('.product-price'), option ? variantPrice(option) : product.cardPrice);
    if (data.encerrada) return;
    const reference = option?.referencia || product.nome;
    const order = card.querySelector('.product-order');
    order.href = data.pedidos[reference];
    order.dataset.orderReference = reference;
    if (option) order.dataset.variantId = option.id; else delete order.dataset.variantId;
    order.setAttribute('aria-label', `${data.corporativo ? 'Orçar' : 'Pedir'} ${reference} no WhatsApp`);
  }

  function defaultOption(card) {
    const product = products.get(card.dataset.product);
    return product.cardPrice.productOrder ? null : product.variantes[0];
  }

  function syncAnchoredCard() {
    const anchor = document.getElementById(window.location.hash.slice(1));
    const card = anchor?.closest('.product-card');
    if (anchoredCard && anchoredCard !== card) updateCard(anchoredCard, defaultOption(anchoredCard));
    anchoredCard = card;
    if (!card) return;
    const options = products.get(card.dataset.product).variantes;
    updateCard(card, options.find(option => option.id === anchor.dataset.anchorVariant || (anchor === card && option.id === card.dataset.variantId)) || defaultOption(card));
  }

  function selectOption(option, flavorIds) {
    const previousFlavor = current.sabores?.find(s => s.id === flavor.value);
    const availableFlavors = flavorsFor(option);
    const candidates = availableFlavors.filter(s => !flavorIds || flavorIds.has(s.id));
    const selectedFlavor = candidates.find(s => s.id === previousFlavor?.id)
      || candidates.find(s => s.saborId && s.saborId === previousFlavor?.saborId)
      || candidates[0];
    const variantKey = `${current.id}:${option.id}`;
    variant.value = option.id;
    if (flavor.dataset.variantKey !== variantKey) {
      flavor.replaceChildren(...availableFlavors.map(s => new Option(s.nome, s.id)));
      flavor.dataset.variantKey = variantKey;
    }
    flavor.value = selectedFlavor?.id || '';
    document.getElementById('flavor-field').hidden = !availableFlavors.length;
    return selectedFlavor;
  }

  const priceLabel = option => option.precoStatus === 'sob-consulta' || !Number.isFinite(option.preco) ? 'Sob consulta' : money(option.preco);
  const variantPrice = option => {
    const value = priceLabel(option);
    if (value === 'Sob consulta') return { prefix: '', value };
    const unit = option.unidade;
    const prefix = unit && unit !== 'unidade' ? `${unit[0].toUpperCase()}${unit.slice(1)} a partir de` : 'A partir de';
    return { prefix, value };
  };
  function setOptionalText(element, text) {
    element.textContent = text;
    element.hidden = !text;
  }
  function setPrice(element, { prefix, value }) {
    setOptionalText(element.querySelector('small'), prefix);
    element.querySelector('strong').textContent = value;
  }

  function updateDetails(option, selectedFlavor) {
    const reference = selectedFlavor?.referencia || option?.referencia;
    const price = document.getElementById('dialog-price');
    setPrice(price.querySelector('.product-price'), option ? variantPrice(option) : current.cardPrice);
    const minimum = option ? option.minimo : current.minimo;
    setOptionalText(document.getElementById('dialog-minimum'), minimum?.estado === 'confirmado' ? minimum.mensagem : '');

    const order = document.getElementById('dialog-order');
    const disabled = !data.encerrada && !option;
    if (disabled) {
      order.removeAttribute('href');
      order.setAttribute('aria-disabled', 'true');
    } else {
      order.href = data.encerrada ? data.contatoGeral : data.pedidos[reference];
      order.removeAttribute('aria-disabled');
    }
    order.dataset.placement = 'modal';
    if (data.encerrada || disabled) {
      for (const key of ['orderReference', 'productId', 'variantId', 'flavorId']) delete order.dataset[key];
    } else {
      order.dataset.orderReference = reference;
      order.dataset.productId = current.id;
      order.dataset.variantId = option.id;
      if (selectedFlavor) order.dataset.flavorId = selectedFlavor.id; else delete order.dataset.flavorId;
    }
    const orderLabel = data.encerrada ? 'Contato geral no WhatsApp' : disabled
      ? 'Selecione uma versão para pedir no WhatsApp'
      : `${data.corporativo ? 'Orçar' : 'Pedir'} ${reference} no WhatsApp`;
    order.setAttribute('aria-label', orderLabel);

    const detailBody = document.getElementById('dialog-details-body');
    if (!option) {
      const summary = document.createElement('p');
      summary.textContent = current.detalhes || current.descricao || '';
      detailBody.replaceChildren(summary);
      return;
    }
    const detailSource = lastTrigger.closest('.product-card').querySelector(`[data-details-variant="${option.id}"] .details-body`);
    const copy = detailSource.cloneNode(true);
    copy.querySelectorAll('.flavor-links, .fallback-order').forEach(node => node.remove());
    detailBody.replaceChildren(...copy.childNodes);
  }

  function buildSlides() {
    const versionSlides = current.variantes.flatMap(option => {
      const photos = new Map();
      const availableFlavors = flavorsFor(option);
      const addPhoto = (photo, flavorId) => {
        const key = photo.imagem || photo.foto || option.referencia;
        if (!photos.has(key)) photos.set(key, { option, photo, flavorIds: new Set() });
        photos.get(key).flavorIds.add(flavorId);
      };
      const sharedFlavorIds = availableFlavors.length ? availableFlavors.map(s => s.id) : [''];
      for (const flavorId of sharedFlavorIds) addPhoto(option, flavorId);
      for (const flavor of availableFlavors) {
        if (flavor.imagem) addPhoto(flavor, flavor.id);
        for (const extra of flavor.galeria || []) addPhoto(extra, flavor.id);
      }
      for (const extra of option.galeria || []) {
        for (const flavorId of sharedFlavorIds) addPhoto(extra, flavorId);
      }
      return [...photos.values()];
    });
    return current.fotoGeral ? [{ photo: current.fotoGeral }, ...versionSlides] : versionSlides;
  }

  const slideIndex = index => (index + slides.length) % slides.length;
  const slideOffset = distance => `translateX(${distance}px)`;

  function getSlideFrame(index) {
    if (slideFrames.has(index)) return slideFrames.get(index);
    const { option, photo } = slides[index];
    const color = photo.cor || option?.cor || current.cor || 'eee7d9';
    const label = photo.alt || photo.foto || photo.referencia || option?.referencia || current.nome;
    const image = document.createElement('img');
    image.src = photo.imagem || `https://placehold.co/800/${color}/25392e?text=${encodeURIComponent(label)}&font=roboto`;
    image.alt = photo.imagem ? label : `Foto em breve: ${label}`;
    image.width = photo.largura || 800;
    image.height = photo.altura || 800;
    image.decoding = 'async';
    const frame = document.createElement('div');
    frame.className = 'photo-frame';
    frame.style.backgroundColor = `#${color}`;
    frame.append(image);
    if (!photo.imagem) {
      const badge = document.createElement('span');
      badge.className = 'photo-label';
      badge.textContent = 'Foto em breve';
      frame.append(badge);
    }
    imageFallback(image);
    slideFrames.set(index, frame);
    return frame;
  }

  function settleGallery() {
    if (galleryAnimation) {
      galleryAnimation.cancel();
      galleryAnimation = null;
    }
    galleryTrack.style.transform = '';
    if (activeFrame) {
      activeFrame.style.left = '';
      for (const frame of [...galleryTrack.children]) {
        if (frame !== activeFrame) frame.remove();
      }
      if (activeFrame.parentElement !== galleryTrack) galleryTrack.append(activeFrame);
    }
  }

  function placeNeighbor(index, direction) {
    const frame = getSlideFrame(index);
    frame.style.left = `${direction * 100}%`;
    frame.setAttribute('aria-hidden', 'true');
    for (const child of [...galleryTrack.children]) {
      if (child !== activeFrame && child !== frame) child.remove();
    }
    if (frame.parentElement !== galleryTrack) galleryTrack.append(frame);
    return frame;
  }

  function animateGallery(from, to) {
    galleryAnimation = galleryTrack.animate(
      [{ transform: slideOffset(from) }, { transform: to }],
      { duration: 220, easing: 'cubic-bezier(.2, .75, .25, 1)' }
    );
    galleryAnimation.onfinish = settleGallery;
  }

  function showSlide(index, dragOffset = 0) {
    const next = slideIndex(index);
    const direction = Math.sign(index - activeSlide);
    const shouldSlide = dialog.open && activeFrame && next !== activeSlide && !reducedMotion.matches;
    settleGallery();
    touchStart = null;
    activeSlide = next;
    const { option, flavorIds } = slides[activeSlide];
    const selectedFlavor = option ? selectOption(option, flavorIds) : null;
    if (!option) {
      variant.value = '';
      flavor.value = '';
      document.getElementById('flavor-field').hidden = true;
    }
    updateDetails(option, selectedFlavor);

    if (shouldSlide) {
      const incoming = placeNeighbor(activeSlide, direction);
      activeFrame.setAttribute('aria-hidden', 'true');
      activeFrame = incoming;
      animateGallery(dragOffset, `translateX(${-direction * 100}%)`);
    } else {
      activeFrame = getSlideFrame(activeSlide);
      settleGallery();
    }
    activeFrame.removeAttribute('aria-hidden');
    if (slides.length > 1 && !reducedMotion.matches) {
      const previous = slideIndex(activeSlide - 1);
      const following = slideIndex(activeSlide + 1);
      slideFrames = new Map([
        [activeSlide, activeFrame],
        [previous, getSlideFrame(previous)],
        [following, getSlideFrame(following)]
      ]);
    }
    [...galleryDots.children].forEach((button, i) => button.setAttribute('aria-pressed', String(i === activeSlide)));
    galleryStatus.textContent = `Foto ${activeSlide + 1} de ${slides.length}`;
  }

  function showSelection(event) {
    const option = current.variantes.find(v => v.id === variant.value);
    if (!option) return showSlide(0);
    const selectedFlavor = selectOption(option);
    const matchesSelection = slide => slide.option === option && slide.flavorIds.has(selectedFlavor?.id || '');
    const photoIndex = event?.target === flavor && selectedFlavor?.imagem
      ? slides.findIndex(slide => matchesSelection(slide) && slide.photo.imagem === selectedFlavor.imagem)
      : -1;
    showSlide(photoIndex >= 0 ? photoIndex : slides.findIndex(matchesSelection));
  }

  function openProduct(id, trigger, chosenId) {
    current = products.get(id);
    lastTrigger = trigger;
    slideFrames.clear();
    document.getElementById('dialog-details').open = false;
    document.getElementById('dialog-title').textContent = current.nome;
    document.getElementById('dialog-description').textContent = current.descricao || '';
    document.getElementById('dialog-disclaimer').textContent = current.taxaArte ? `+ ${money(current.taxaArte)} ${current.taxaArteDescricao || 'por arte'}.` : '';
    const options = current.variantes.map(v => new Option(`${v.nome} · ${priceLabel(v)}`, v.id));
    if (current.fotoGeral) options.unshift(new Option('Selecione...', ''));
    variant.replaceChildren(...options);
    document.getElementById('variant-field').hidden = options.length < 2;
    const card = trigger.closest('.product-card');
    const anchor = document.getElementById(window.location.hash.slice(1));
    const anchoredId = anchor?.closest('.product-card') === card
      ? anchor.dataset.anchorVariant || (anchor === card && card.dataset.variantId)
      : null;
    variant.value = anchoredId || (current.fotoGeral ? '' : chosenId);
    flavor.replaceChildren();
    delete flavor.dataset.variantKey;
    slides = buildSlides();
    const multiplePhotos = slides.length > 1;
    galleryArrows.hidden = galleryDots.hidden = galleryStatus.hidden = !multiplePhotos;
    galleryDots.replaceChildren(...(multiplePhotos ? slides : []).map(({ option }, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `Ver foto ${index + 1} de ${slides.length}${option ? (current.variantes.length > 1 ? ` · ${option.nome}` : '') : ' · Todos os modelos'}`);
      button.addEventListener('click', () => showSlide(index));
      return button;
    }));
    showSelection();
    dialog.showModal();
    dialog.scrollTop = 0;
  }
  document.querySelectorAll('[data-open-product]').forEach(button => button.addEventListener('click', () => openProduct(button.dataset.openProduct, button, button.dataset.variantId)));
  variant.addEventListener('change', showSelection);
  flavor.addEventListener('change', showSelection);
  galleryArrows.querySelector('.gallery-prev').addEventListener('click', () => showSlide(activeSlide - 1));
  galleryArrows.querySelector('.gallery-next').addEventListener('click', () => showSlide(activeSlide + 1));
  gallery.addEventListener('keydown', event => {
    if (slides.length < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    showSlide(activeSlide + (event.key === 'ArrowRight' ? 1 : -1));
    if (galleryDots.contains(event.target)) galleryDots.children[activeSlide].focus();
  });
  galleryPhoto.addEventListener('touchstart', event => {
    settleGallery();
    touchStart = null;
    if (slides.length < 2 || event.touches.length !== 1) return;
    const { clientX, clientY } = event.touches[0];
    touchStart = { clientX, clientY, axis: null, offset: 0 };
  }, { passive: true });
  galleryPhoto.addEventListener('touchmove', event => {
    if (!touchStart || event.touches.length !== 1 || reducedMotion.matches) return;
    const dx = event.touches[0].clientX - touchStart.clientX;
    const dy = event.touches[0].clientY - touchStart.clientY;
    if (!touchStart.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
      touchStart.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (touchStart.axis !== 'x') return;
    const width = galleryPhoto.clientWidth;
    const direction = dx < 0 ? 1 : -1;
    placeNeighbor(slideIndex(activeSlide + direction), direction);
    touchStart.offset = Math.max(-width, Math.min(width, dx));
    galleryTrack.style.transform = slideOffset(touchStart.offset);
  }, { passive: true });
  function returnGallery() {
    const offset = touchStart?.offset;
    touchStart = null;
    if (offset && !reducedMotion.matches) animateGallery(offset, slideOffset(0));
    else settleGallery();
  }
  galleryPhoto.addEventListener('touchend', event => {
    if (!touchStart || event.touches.length) return;
    const dx = event.changedTouches[0].clientX - touchStart.clientX;
    const dy = event.changedTouches[0].clientY - touchStart.clientY;
    if (touchStart.axis !== 'y' && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      const offset = Math.sign(dx) === Math.sign(touchStart.offset) ? touchStart.offset : 0;
      showSlide(activeSlide + (dx < 0 ? 1 : -1), offset);
    } else {
      returnGallery();
    }
  }, { passive: true });
  galleryPhoto.addEventListener('touchcancel', returnGallery);
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  [dialog].forEach(modal => {
    modal.addEventListener('click', event => {
      const rect = modal.getBoundingClientRect();
      if (event.target === modal && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) modal.close();
    });
  });
  dialog.addEventListener('close', () => {
    touchStart = null;
    settleGallery();
    lastTrigger?.focus();
  });

  window.addEventListener('hashchange', syncAnchoredCard);
  syncAnchoredCard();
  document.body.classList.add('js-ready');
  filter();
})();
