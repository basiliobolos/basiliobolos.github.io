(() => {
  'use strict';
  const data = JSON.parse(document.getElementById('natal-data').textContent);
  const products = new Map(data.produtos.map(product => [product.id, product]));
  const cards = [...document.querySelectorAll('[data-product]')];
  const search = document.getElementById('product-search');
  const dialog = document.getElementById('product-dialog');
  const variant = document.getElementById('variant-select');
  const flavor = document.getElementById('flavor-select');
  const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  let category = 'todos';
  let current;
  let lastTrigger;

  function filter() {
    const terms = normalize(search.value.trim()).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    let count = 0;
    for (const card of cards) {
      const p = products.get(card.dataset.product);
      const v = p.variantes[Number(card.dataset.variantIndex)];
      const haystack = normalize([p.nome, p.detalhes, ...p.familias, p.codigo, v.nome, v.codigo, ...(p.sabores || []).flatMap(s => [s.nome, s.codigo])].join(' '));
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

  function updateProduct() {
    const option = current.variantes[Number(variant.value)];
    const selectedFlavor = current.sabores?.find(s => s.nome === flavor.value);
    const code = selectedFlavor ? selectedFlavor.codigo : option.codigo;
    document.getElementById('dialog-price').textContent = `${money(option.preco)} · ${option.nome}`;
    document.getElementById('dialog-code').textContent = code;
    const order = document.getElementById('dialog-order');
    order.href = data.pedidos[code];
    order.dataset.orderCode = code;
    order.setAttribute('aria-label', `Pedir ${current.nome} — ${selectedFlavor ? selectedFlavor.nome : option.nome} no WhatsApp (${code})`);
    document.getElementById('dialog-disclaimer').textContent = current.taxaArte ? `+ ${money(current.taxaArte)} por arte, cortador e carimbo.` : '';
    const visual = selectedFlavor || option;
    const imageKey = JSON.stringify([current.id, variant.value, flavor.value]);
    document.querySelectorAll('.thumb-option').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.choice === (selectedFlavor ? flavor.value : variant.value))));
    const container = document.getElementById('dialog-photo');
    if (container.dataset.imageKey === imageKey) return;
    container.dataset.imageKey = imageKey;
    const image = document.createElement('img');
    image.src = visual.imagem || `https://placehold.co/800/${visual.cor || current.cor}/526055?text=${encodeURIComponent(visual.foto)}&font=roboto`;
    image.alt = visual.imagem ? visual.foto : `Foto em breve: ${visual.foto}`;
    image.width = 800; image.height = 800;
    const frame = document.createElement('div'); frame.className = 'photo-frame'; frame.append(image);
    const label = document.createElement('span'); label.className = 'photo-label'; label.textContent = 'Foto em breve';
    if (!visual.imagem) frame.append(label);
    container.replaceChildren(frame);
    imageFallback(image);
  }
  function openProduct(id, trigger, chosenIndex = 0) {
    current = products.get(id);
    lastTrigger = trigger;
    document.getElementById('dialog-title').textContent = current.nome;
    document.getElementById('dialog-description').textContent = current.detalhes;
    variant.replaceChildren(...current.variantes.map((v, index) => new Option(`${v.nome} · ${money(v.preco)}`, index)));
    variant.value = String(chosenIndex);
    flavor.replaceChildren(...(current.sabores || []).map(s => new Option(s.nome, s.nome)));
    document.getElementById('flavor-field').hidden = !current.sabores;
    const choices = current.sabores || current.variantes;
    const thumbnails = document.getElementById('dialog-variant-photos');
    thumbnails.replaceChildren();
    thumbnails.hidden = choices.length < 2;
    choices.forEach((choice, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'thumb-option';
      button.dataset.choice = current.sabores ? choice.nome : String(index);
      button.setAttribute('aria-label', `Ver e escolher ${choice.nome}`);
      const image = document.createElement('img');
      image.src = choice.imagem || `https://placehold.co/160/${choice.cor || current.cor}/526055?text=${encodeURIComponent(choice.foto)}&font=roboto`;
      image.alt = ''; image.width = 80; image.height = 80;
      const name = document.createElement('span'); name.textContent = choice.nome;
      button.append(image, name);
      button.addEventListener('click', () => {
        if (current.sabores) flavor.value = choice.nome; else variant.value = String(index);
        updateProduct();
      });
      thumbnails.append(button); imageFallback(image);
    });
    updateProduct(); dialog.showModal();
  }
  document.querySelectorAll('[data-open-product]').forEach(button => button.addEventListener('click', () => openProduct(button.dataset.openProduct, button, Number(button.dataset.variantIndex || 0))));
  variant.addEventListener('change', updateProduct);
  flavor.addEventListener('change', updateProduct);
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  [dialog].forEach(modal => {
    modal.addEventListener('click', event => {
      const rect = modal.getBoundingClientRect();
      if (event.target === modal && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) modal.close();
    });
  });
  dialog.addEventListener('close', () => lastTrigger?.focus());

  document.body.classList.add('js-ready');
  filter();
})();
