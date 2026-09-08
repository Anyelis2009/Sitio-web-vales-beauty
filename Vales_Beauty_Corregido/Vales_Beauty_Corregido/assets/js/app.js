
(() => {
  'use strict';

  const WHATSAPP_NUMBER = '50499568532';
  const STORAGE_KEY = 'valesBeautyCart';
  const LEGACY_KEY = 'carrito';

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

  const money = value => new Intl.NumberFormat('es-HN', {
    style: 'currency', currency: 'HNL', minimumFractionDigits: 2
  }).format(Number(value) || 0);

  function readCart() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(saved)) return saved;

      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY));
      if (Array.isArray(legacy) && legacy.length) {
        const migrated = legacy.map((item, index) => ({
          id: item.id || `legacy-${index}-${String(item.nombre || 'producto').toLowerCase().replace(/\s+/g, '-')}`,
          name: item.name || item.nombre || 'Producto',
          price: Number(item.price ?? item.precio) || 0,
          image: (() => {
            const legacyImage = item.image || item.imagen || '';
            const imageMap = {
              'imagen1.jpeg': 'assets/img/maquillaje.jpeg',
              'imagen2.jpeg': 'assets/img/maquillaje-exhibidor.jpeg',
              'imagen4.jpeg': 'assets/img/maquillaje-kit.jpeg',
              'ropa2.jpeg': 'assets/img/ropa-coleccion.jpeg',
              'aseo.jpeg': 'assets/img/aseo.jpeg',
              'lociones.jpeg': 'assets/img/perfume.jpeg',
              'cartera.jpeg': 'assets/img/cartera.jpeg'
            };
            return imageMap[legacyImage] || legacyImage || 'assets/img/logo.jpeg';
          })(),
          quantity: Number(item.quantity) || 1
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        localStorage.removeItem(LEGACY_KEY);
        return migrated;
      }
    } catch (error) {
      console.warn('No se pudo leer el carrito:', error);
    }
    return [];
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    updateCartBadges(cart);
  }

  function cartCount(cart = readCart()) {
    return cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }

  function updateCartBadges(cart = readCart()) {
    const count = cartCount(cart);
    $$('.cart-badge').forEach(badge => {
      badge.textContent = count;
      badge.setAttribute('aria-label', `${count} productos en el carrito`);
    });
  }

  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    const text = $('.toast-text', toast);
    if (text) text.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function addToCart(product) {
    const cart = readCart();
    const found = cart.find(item => item.id === product.id);
    if (found) found.quantity += 1;
    else cart.push({ ...product, quantity: 1 });
    saveCart(cart);
    showToast(`${product.name} se agregó al carrito.`);
  }

  function setupNavigation() {
    const toggle = $('.menu-toggle');
    const menu = $('#primary-nav');
    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        const open = menu.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
        toggle.innerHTML = open ? '<i class="fi fi-rr-cross" aria-hidden="true"></i>' : '<i class="fi fi-rr-menu-burger" aria-hidden="true"></i>';
      });
      menu.addEventListener('click', event => {
        if (event.target.closest('a')) {
          menu.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.innerHTML = '<i class="fi fi-rr-menu-burger" aria-hidden="true"></i>';
        }
      });
      document.addEventListener('click', event => {
        if (!menu.contains(event.target) && !toggle.contains(event.target)) {
          menu.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.innerHTML = '<i class="fi fi-rr-menu-burger" aria-hidden="true"></i>';
        }
      });
    }

    const page = document.body.dataset.page;
    if (page) {
      $$(`[data-nav="${page}"]`).forEach(link => link.setAttribute('aria-current', 'page'));
    }
  }

  function setupSlider() {
    const slider = $('[data-slider]');
    if (!slider) return;
    const track = $('.slides', slider);
    const slides = $$('.slide', slider);
    const dotsBox = $('.slider-dots', slider);
    if (!track || slides.length < 2) return;

    let index = 0;
    let timer;

    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `slider-dot${i === 0 ? ' active' : ''}`;
      dot.setAttribute('aria-label', `Ver promoción ${i + 1}`);
      dot.addEventListener('click', () => go(i, true));
      dotsBox?.appendChild(dot);
    });

    const go = (next, restart = false) => {
      index = (next + slides.length) % slides.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      $$('.slider-dot', slider).forEach((dot, i) => dot.classList.toggle('active', i === index));
      if (restart) start();
    };

    const start = () => {
      clearInterval(timer);
      timer = setInterval(() => go(index + 1), 5500);
    };

    $('[data-prev]', slider)?.addEventListener('click', () => go(index - 1, true));
    $('[data-next]', slider)?.addEventListener('click', () => go(index + 1, true));
    slider.addEventListener('mouseenter', () => clearInterval(timer));
    slider.addEventListener('mouseleave', start);
    start();
  }

  function setupCatalog() {
    const grid = $('#product-grid');
    if (!grid) return;
    const cards = $$('.product-card', grid);
    const search = $('#product-search');
    const filterButtons = $$('.filter-btn');
    const empty = $('#no-results');
    const requestedCategory = new URLSearchParams(window.location.search).get('categoria');
    let category = requestedCategory || 'todos';
    if (requestedCategory) {
      filterButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.filter === requestedCategory);
      });
    }

    const applyFilters = () => {
      const term = (search?.value || '').trim().toLowerCase();
      let visible = 0;
      cards.forEach(card => {
        const cardCategory = card.dataset.category;
        const text = `${card.dataset.name} ${card.dataset.search || ''}`.toLowerCase();
        const matchCategory = category === 'todos' || cardCategory === category;
        const matchSearch = !term || text.includes(term);
        card.hidden = !(matchCategory && matchSearch);
        if (!card.hidden) visible += 1;
      });
      if (empty) empty.style.display = visible ? 'none' : 'block';
    };

    search?.addEventListener('input', applyFilters);
    filterButtons.forEach(button => button.addEventListener('click', () => {
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      category = button.dataset.filter || 'todos';
      applyFilters();
    }));

    applyFilters();

    $$('.add-cart', grid).forEach(button => button.addEventListener('click', () => {
      addToCart({
        id: button.dataset.id,
        name: button.dataset.name,
        price: Number(button.dataset.price),
        image: button.dataset.image
      });
    }));
  }

  function renderCart() {
    const list = $('#cart-items');
    const empty = $('#cart-empty');
    const content = $('#cart-content');
    if (!list || !empty || !content) return;

    let cart = readCart();

    const render = () => {
      cart = readCart();
      list.innerHTML = '';
      const isEmpty = cart.length === 0;
      empty.hidden = !isEmpty;
      content.hidden = isEmpty;

      if (isEmpty) {
        $('#subtotal').textContent = money(0);
        $('#total').textContent = money(0);
        return;
      }

      cart.forEach(item => {
        const article = document.createElement('article');
        article.className = 'cart-item';
        article.innerHTML = `
          <img src="${item.image}" alt="${item.name}">
          <div>
            <h3>${item.name}</h3>
            <div class="item-price">${money(item.price)}</div>
            <div class="quantity" aria-label="Cantidad de ${item.name}">
              <button class="qty-btn" type="button" data-action="decrease" data-id="${item.id}" aria-label="Disminuir cantidad"><i class="fi fi-rr-minus-small" aria-hidden="true"></i></button>
              <strong>${item.quantity}</strong>
              <button class="qty-btn" type="button" data-action="increase" data-id="${item.id}" aria-label="Aumentar cantidad"><i class="fi fi-rr-plus-small" aria-hidden="true"></i></button>
            </div>
          </div>
          <button class="remove-btn" type="button" data-action="remove" data-id="${item.id}" aria-label="Eliminar ${item.name}"><i class="fi fi-rr-trash" aria-hidden="true"></i> <span>Eliminar</span></button>
        `;
        list.appendChild(article);
      });

      const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      $('#subtotal').textContent = money(subtotal);
      $('#total').textContent = money(subtotal);
      updateCartBadges(cart);
    };

    list.addEventListener('click', event => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const item = cart.find(product => product.id === button.dataset.id);
      if (!item) return;

      if (button.dataset.action === 'increase') item.quantity += 1;
      if (button.dataset.action === 'decrease') item.quantity -= 1;
      if (button.dataset.action === 'remove' || item.quantity <= 0) {
        cart = cart.filter(product => product.id !== item.id);
      }
      saveCart(cart);
      render();
    });

    $('#clear-cart')?.addEventListener('click', () => {
      if (cart.length && confirm('¿Deseas vaciar todo el carrito?')) {
        cart = [];
        saveCart(cart);
        render();
      }
    });

    $('#checkout-whatsapp')?.addEventListener('click', () => {
      if (!cart.length) return;
      const lines = cart.map(item => `• ${item.name} x${item.quantity} — ${money(item.price * item.quantity)}`);
      const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const message = [
        "Hola, Vale's Beauty. Quiero realizar este pedido:",
        '',
        ...lines,
        '',
        `Total: ${money(total)}`,
        '',
        '¿Me confirman disponibilidad y forma de entrega?'
      ].join('\n');
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    });

    render();
  }

  function setupContactForm() {
    const form = $('#whatsapp-form');
    if (!form) return;
    form.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(form);
      const name = String(data.get('nombre') || '').trim();
      const topic = String(data.get('asunto') || '').trim();
      const message = String(data.get('mensaje') || '').trim();
      if (!name || !message) {
        showToast('Escribe tu nombre y mensaje para continuar.');
        return;
      }
      const text = [
        "Hola, Vale's Beauty.",
        `Mi nombre es ${name}.`,
        topic ? `Consulta: ${topic}.` : '',
        '',
        message
      ].filter(Boolean).join('\n');
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    updateCartBadges();
    setupSlider();
    setupCatalog();
    renderCart();
    setupContactForm();
    $$('.current-year').forEach(el => { el.textContent = new Date().getFullYear(); });
  });
})();
