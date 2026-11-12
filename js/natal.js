(() => {
  'use strict';
  const data = JSON.parse(document.getElementById('natal-data').textContent);
  const products = new Map(data.produtos.map(product => [product.id, product]));
  const cards = [...document.querySelectorAll('[data-product]')];
  const search = document.getElementById('product-search');
  const budget = document.getElementById('product-budget');
  const personalized = document.getElementById('personalized');
  const dialog = document.getElementById('product-dialog');
  const listDialog = document.getElementById('selection-dialog');
  const form = document.getElementById('product-form');
  const variant = document.getElementById('variant-select');
  const flavor = document.getElementById('flavor-select');
  const quantity = document.getElementById('product-quantity');
  const selection = new Map();
  const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  let category = 'todos';
  let current;
  let lastTrigger;

  function filter() {
    const terms = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
    const limit = Number(budget.value) || Infinity;
    let count = 0;
    for (const card of cards) {
      const p = products.get(card.dataset.product);
      const haystack = normalize([p.nome, p.descricao, p.detalhes, p.tipo, ...p.familias, ...p.variantes.map(v => v.nome), ...(p.sabores || [])].join(' '));
      // A logo stamp requires the fixed setup fee even for one biscuit.
      const price = Math.min(...p.variantes.map(v => v.preco)) + (p.taxaArte || 0);
      const match = (category === 'todos' || p.familias.includes(category)) && price <= limit && (!personalized.checked || p.personalizavel) && terms.every(term => haystack.includes(term));
      card.hidden = !match;
      if (match) count++;
    }
    document.querySelectorAll('[data-group]').forEach(group => {
      group.hidden = !group.querySelector('[data-product]:not([hidden])');
    });
    document.getElementById('empty-state').hidden = count !== 0;
    document.getElementById('catalog-status').textContent = `${count} ${count === 1 ? 'presente encontrado' : 'presentes encontrados'}${Number.isFinite(limit) ? ' · opções a partir do valor indicado' : ''}`;
  }
  function resetFilters() {
    category = 'todos'; search.value = ''; budget.value = ''; personalized.checked = false;
    document.querySelectorAll('[data-category]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === category)));
    filter();
  }
  document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => {
    category = button.dataset.category;
    document.querySelectorAll('[data-category]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    filter();
  }));
  search.addEventListener('input', filter);
  budget.addEventListener('change', filter);
  personalized.addEventListener('change', filter);
  document.getElementById('clear-filters').addEventListener('click', resetFilters);
  document.querySelectorAll('[data-company-link]').forEach(link => link.addEventListener('click', resetFilters));

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
    const amount = Number(quantity.value);
    const valid = Number.isInteger(amount) && amount >= 1 && amount <= 999;
    document.getElementById('dialog-price').textContent = valid ? `Subtotal: ${money(option.preco * amount + (current.taxaArte || 0))}` : 'Informe uma quantidade entre 1 e 999.';
    document.getElementById('dialog-disclaimer').textContent = current.taxaArte ? `${money(current.taxaArte)} de arte, cortador e carimbo incluídos uma vez. Para logos diferentes, solicite novo orçamento.` : 'Valor por unidade/kit conforme a versão escolhida.';
    const image = document.createElement('img');
    image.src = option.imagem || `https://placehold.co/800/${current.cor}/526055?text=${encodeURIComponent(option.foto)}&font=roboto`;
    image.alt = option.imagem ? option.foto : `Foto em breve: ${option.foto}`;
    image.width = 800; image.height = 800;
    const frame = document.createElement('div'); frame.className = 'photo-frame'; frame.append(image);
    const label = document.createElement('span'); label.className = 'photo-label'; label.textContent = 'Foto em breve';
    if (!option.imagem) frame.append(label);
    document.getElementById('dialog-image').replaceChildren(frame);
    imageFallback(image);
  }
  function openProduct(id, trigger) {
    current = products.get(id);
    quantity.setCustomValidity('');
    lastTrigger = trigger;
    document.getElementById('dialog-title').textContent = current.nome;
    document.getElementById('dialog-description').textContent = current.detalhes;
    variant.replaceChildren(...current.variantes.map((v, index) => new Option(`${v.nome} · ${money(v.preco)}`, index)));
    flavor.replaceChildren(...(current.sabores || []).map(name => new Option(name, name)));
    document.getElementById('flavor-field').hidden = !current.sabores;
    quantity.value = 1;
    updateProduct(); dialog.showModal();
  }
  document.querySelectorAll('[data-open-product]').forEach(button => button.addEventListener('click', () => openProduct(button.dataset.openProduct, button)));
  variant.addEventListener('change', updateProduct);
  quantity.addEventListener('input', updateProduct);
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  [dialog, listDialog].forEach(modal => {
    modal.addEventListener('click', event => {
      const rect = modal.getBoundingClientRect();
      if (event.target === modal && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) modal.close();
    });
  });
  dialog.addEventListener('close', () => lastTrigger?.focus());

  function renderSelection() {
    const list = document.getElementById('selection-items');
    list.replaceChildren();
    const chargedSetup = new Set();
    let total = 0; let count = 0;
    const lines = [];
    for (const [key, item] of selection) {
      const p = products.get(item.id); const v = p.variantes[item.variant];
      const setup = chargedSetup.has(p.id) ? 0 : (p.taxaArte || 0);
      chargedSetup.add(p.id);
      const subtotal = v.preco * item.quantity + setup;
      total += subtotal; count += item.quantity;
      const article = document.createElement('article'); article.className = 'selection-item';
      const copy = document.createElement('div'); copy.className = 'selection-item-copy';
      const title = document.createElement('h3'); title.textContent = p.nome;
      const detail = document.createElement('p'); detail.textContent = `${item.quantity} × ${v.nome}${item.flavor ? ` · ${item.flavor}` : ''}${setup ? ` · ${money(setup)} de arte/cortador/carimbo` : ''}`;
      const price = document.createElement('strong'); price.textContent = money(subtotal);
      copy.append(title, detail, price);
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'icon-button'; remove.textContent = '×'; remove.setAttribute('aria-label', `Remover ${p.nome}, ${v.nome}${item.flavor ? ', ' + item.flavor : ''}`);
      remove.addEventListener('click', () => {
        const index = [...selection.keys()].indexOf(key);
        selection.delete(key); renderSelection();
        if (!selection.size) { listDialog.close(); document.querySelector('[data-category="todos"]').focus(); }
        else { const controls = list.querySelectorAll('button'); controls[Math.min(index, controls.length - 1)].focus(); }
      });
      article.append(copy, remove); list.append(article);
      lines.push(`${item.quantity}x ${p.nome} — ${v.nome}${item.flavor ? ` (${item.flavor})` : ''}: ${money(subtotal)}${setup ? `, inclui ${money(setup)} por uma arte/cortador/carimbo` : ''}`);
    }
    document.getElementById('selection-bar').hidden = selection.size === 0;
    document.body.classList.toggle('has-selection', selection.size > 0);
    document.getElementById('selection-count').textContent = `${count} ${count === 1 ? 'item' : 'itens'} · ${money(total)}`;
    document.getElementById('selection-total').textContent = money(total);
    const message = `Olá! Gostaria de encomendar estes presentes de Natal:\n\n${lines.join('\n')}\n\nTotal estimado${data.publicado ? '' : ' (valores da prévia)'}: ${money(total)}.\nPodemos confirmar a disponibilidade, os detalhes, o valor final e a data de retirada?`;
    document.getElementById('send-selection').href = `https://wa.me/${data.whatsapp}?text=${encodeURIComponent(message)}`;
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const chosenFlavor = current.sabores ? flavor.value : '';
    const key = JSON.stringify([current.id, Number(variant.value), chosenFlavor]);
    const amount = Number(quantity.value);
    const previous = selection.get(key);
    if ((previous?.quantity || 0) + amount > 999) {
      quantity.setCustomValidity('O limite é de 999 unidades por versão.'); quantity.reportValidity(); return;
    }
    selection.set(key, { id: current.id, variant: Number(variant.value), flavor: chosenFlavor, quantity: amount + (previous?.quantity || 0) });
    renderSelection(); dialog.close();
    document.getElementById('selection-status').textContent = `${current.nome} adicionado à sua lista.`;
  });
  quantity.addEventListener('input', () => quantity.setCustomValidity(''));
  document.getElementById('open-selection').addEventListener('click', () => listDialog.showModal());
  document.body.classList.add('js-ready');
  filter();
})();
