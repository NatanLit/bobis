// ── Mock Data (Products — до подключения QR) ──────────────
const mockProducts = [
  { name: 'Круассан классический', reviews: 187, avg: 4.7, trend: +0.3, img: 'https://images.unsplash.com/photo-1555507036-ab1d4075c6f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
  { name: 'Латте карамель',        reviews: 156, avg: 4.4, trend: +0.1, img: 'https://images.unsplash.com/photo-1557006021-b85faa2bc5e2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
  { name: 'Тирамису',              reviews: 134, avg: 4.6, trend: +0.4, img: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
  { name: 'Чизкейк ягодный',       reviews: 128, avg: 4.5, trend: -0.1, img: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
  { name: 'Эклер шоколадный',      reviews: 112, avg: 3.8, trend: -0.3, img: 'https://images.unsplash.com/photo-1603532648955-039310d9ed75?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
  { name: 'Капучино',              reviews: 98,  avg: 3.2, trend: -0.5, img: 'https://images.unsplash.com/photo-1534045618451-26c361907b22?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
  { name: 'Эспрессо',              reviews: 145, avg: 4.8, trend: +0.2, img: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
  { name: 'Макарун',               reviews: 210, avg: 4.5, trend: +0.1, img: 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
];

// ── Live reviews from API ─────────────────────────────────
let liveReviews = [];

async function fetchReviews() {
  try {
    const key = sessionStorage.getItem('admin_key') || 'review123';
    const res = await fetch(`/admin/reviews?key=${key}&limit=100`);
    const json = await res.json();
    if (!json.success || !json.data.length) return;

    liveReviews = json.data.map(r => ({
      id:       r.id,
      name:     r.users?.phone_or_email || 'Гость',
      product:  r.item_name || r.items?.name || 'Неизвестный товар',
      stars:    r.stars,
      score:    r.score,
      text:     r.text,
      time:     timeAgo(r.created_at),
      hasPhoto: !!r.photo_url,
      points:   r.points_earned,
    }));
  } catch (e) {
    console.warn('API недоступен, используем моки');
  }
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'только что';
  if (m < 60)  return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h} ч назад`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Вчера';
  return `${d} дн назад`;
}

// ── Theme Toggle ──────────────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? '' : 'dark');
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
}
(function () {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
})();

// ── Navigation ────────────────────────────────────────────
function switchSection(sectionId) {
  document.querySelectorAll('.section-content').forEach(el => {
    el.style.display = 'none';
    el.classList.remove('section-enter');
  });
  document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active'));

  const activeSection = document.getElementById(`section-${sectionId}`);
  if (activeSection) {
    activeSection.style.display = 'block';
    activeSection.classList.add('section-enter');
  }
  const navLink = document.getElementById(`nav-${sectionId}`);
  if (navLink) navLink.classList.add('active');

  const titles = {
    dashboard: { t: 'Дашборд',   s: 'Обзор отзывов и рейтингов' },
    reviews:   { t: 'Отзывы',    s: 'Управление откликами клиентов' },
    products:  { t: 'Товары',    s: 'Рейтинг позиций меню' },
    qr:        { t: 'QR-коды',   s: 'Генератор ссылок для кассиров' },
  };
  const info = titles[sectionId];
  if (info) {
    document.getElementById('page-title').textContent    = info.t;
    document.getElementById('page-subtitle').textContent = info.s;
  }

  if (sectionId === 'products' && document.getElementById('products-grid').innerHTML === '') {
    renderProductsGrid();
  }
  if (sectionId === 'qr' && !qrInited) {
    qrInited = true;
    qrAddItem();
    qrAddItem();
  }
}

// ── Helpers ───────────────────────────────────────────────
function starsHTML(count) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    const fill = i <= count ? 'var(--score-yellow)' : 'var(--border)';
    html += `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="${fill}"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
  }
  return html;
}

function getAvatarBg(name) {
  const colors = ['#C8713E', '#D4A574', '#5C3D2E', '#8B7355', '#E8944A', '#B5612F'];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return colors[sum % colors.length];
}

// ── Render Dashboard ──────────────────────────────────────
function initDashboard() {
  const reviews = liveReviews;

  // Stats
  const totalReviews = reviews.length;
  const avgStars     = totalReviews ? (reviews.reduce((s, r) => s + r.stars, 0) / totalReviews).toFixed(1) : '0.0';
  const withPhoto    = reviews.filter(r => r.hasPhoto).length;
  const todayCount   = reviews.filter(r => r.time.includes('мин') || r.time.includes('ч') || r.time === 'только что').length;

  const stats = [
    { label: 'Всего отзывов', value: totalReviews || '—', change: `сегодня: ${todayCount}`, up: true,  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>' },
    { label: 'Средний балл',  value: avgStars,             change: '/ 5 звёзд',              up: true,  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>' },
    { label: 'Товаров',       value: mockProducts.length,  change: 'mock-данные',             up: true,  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>' },
    { label: 'С фото',        value: withPhoto || '—',     change: 'из отзывов',              up: false, icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>' },
  ];

  const grid = document.getElementById('stats-grid');
  grid.innerHTML = '';
  stats.forEach((s, i) => {
    grid.innerHTML += `
      <div class="dash-card clickable p-5 animate-fade-up" style="animation-delay:${i * 0.1}s" onclick="switchSection('dashboard')">
        <div class="flex items-start justify-between mb-4">
          <div class="stat-icon-wrap"><svg class="w-5 h-5" fill="none" stroke="var(--accent)" viewBox="0 0 24 24" stroke-width="2">${s.icon}</svg></div>
          <span class="stat-change ${s.up ? 'up' : 'down'}">${s.change}</span>
        </div>
        <p class="stat-value animate-count" style="color:var(--text);animation-delay:${i * 0.1 + 0.2}s">${s.value}</p>
        <p class="stat-label mt-2">${s.label}</p>
      </div>`;
  });

  // Rating distribution
  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => { if (dist[r.stars] !== undefined) dist[r.stars]++; });
  document.getElementById('avg-score').innerText = avgStars;

  const barsContainer = document.getElementById('rating-bars');
  barsContainer.innerHTML = '';
  [5, 4, 3, 2, 1].forEach((stars, i) => {
    const count    = dist[stars];
    const pct      = totalReviews ? Math.round((count / totalReviews) * 100) : 0;
    const barColor = stars >= 4 ? 'var(--score-green)' : stars === 3 ? 'var(--score-yellow)' : 'var(--score-red)';
    barsContainer.innerHTML += `
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1 w-12 justify-end">
          <span class="text-sm font-bold" style="color:var(--text)">${stars}</span>
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="${barColor}"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <div class="flex-1 progress-track">
          <div class="progress-value" style="width:${pct}%;background:${barColor};animation-delay:${i * 0.1 + 0.3}s"></div>
        </div>
        <span class="text-xs font-semibold w-14 text-right" style="color:var(--text-secondary)">${count} (${pct}%)</span>
      </div>`;
  });

  // Products table (mock)
  const tbody = document.getElementById('products-tbody');
  tbody.innerHTML = '';
  mockProducts.forEach((p, i) => {
    const scoreClass = p.avg >= 4.5 ? 'score-high' : p.avg >= 3.5 ? 'score-mid' : 'score-low';
    const scoreText  = p.avg >= 4.5 ? 'Отлично'   : p.avg >= 3.5 ? 'Средне'   : 'Плохо';
    const trendUp    = p.trend >= 0;
    tbody.innerHTML += `
      <tr onclick="switchSection('products')">
        <td>
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style="background:var(--accent-light);color:var(--accent)">${i + 1}</div>
            <span class="font-semibold" style="color:var(--text)">${p.name}</span>
          </div>
        </td>
        <td style="color:var(--text-secondary)">${p.reviews}</td>
        <td>
          <div class="flex items-center gap-2">
            <div class="flex gap-0.5">${starsHTML(Math.round(p.avg))}</div>
            <span class="font-bold" style="color:var(--text)">${p.avg}</span>
          </div>
        </td>
        <td><span class="score-badge ${scoreClass}">${scoreText}</span></td>
        <td><span class="stat-change ${trendUp ? 'up' : 'down'}">${trendUp ? '↑' : '↓'} ${trendUp ? '+' : ''}${p.trend.toFixed(1)}</span></td>
      </tr>`;
  });

  // Reviews lists
  renderReviewsList(reviews, 'reviews-list-dash', true);
  renderReviewsList(reviews, 'reviews-full-list', false);

  // Today badge
  const badge = document.querySelector('#section-dashboard .pts-badge, span[style*="accent"]');
  const todayEl = document.querySelector('#section-dashboard span.text-xs.font-semibold.px-3');
  if (todayEl) todayEl.textContent = `Сегодня: ${todayCount}`;
}

// ── Render Reviews ────────────────────────────────────────
function renderReviewsList(reviews, containerId, compact = false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  if (!reviews.length) {
    container.innerHTML = `
      <div class="empty-state">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
        <p>Отзывов пока нет</p>
      </div>`;
    return;
  }

  reviews.forEach((r, i) => {
    const initials   = r.name.split('').slice(0, 2).join('').toUpperCase();
    const bg         = getAvatarBg(r.name);
    const isLong     = r.text.length > 80;
    const displayText = (compact && isLong) ? r.text.substring(0, 80) + '...' : r.text;
    const moreBtn    = (compact && isLong) ? `<span class="text-xs font-bold ml-1 cursor-pointer" style="color:var(--accent)" onclick="event.stopPropagation();switchSection('reviews')">читать далее</span>` : '';
    const scoreBadge = r.score != null ? `<span class="score-badge ${r.score >= 61 ? 'score-high' : r.score >= 31 ? 'score-mid' : 'score-low'}" style="font-size:10px;padding:2px 8px">AI: ${r.score}</span>` : '';
    const actions    = compact ? '' : `
      <div class="mt-3 flex gap-2" onclick="event.stopPropagation()">
        <button class="action-btn ghost" onclick="alert('Скоро')">Ответить</button>
        <button class="action-btn danger" onclick="if(confirm('Удалить?'))this.closest('.review-item').style.display='none'">Удалить</button>
      </div>`;

    container.innerHTML += `
      <div class="review-item animate-fade-up" style="animation-delay:${i * 0.05}s" onclick="${compact ? "switchSection('reviews')" : ''}">
        <div class="flex gap-3">
          <div class="avatar" style="background:${bg}">${initials}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold" style="color:var(--text)">${r.name}</span>
                ${r.hasPhoto ? '<span class="text-[10px] px-1.5 py-0.5 rounded font-semibold" style="background:var(--accent-light);color:var(--accent)">📷 Фото</span>' : ''}
                ${scoreBadge}
              </div>
              <span class="text-xs" style="color:var(--text-tertiary)">${r.time}</span>
            </div>
            <p class="text-xs font-semibold mb-1" style="color:var(--accent)">${r.product}</p>
            <div class="flex gap-0.5 mb-1.5">${starsHTML(r.stars)}</div>
            <p class="text-sm leading-relaxed" style="color:var(--text-secondary)">${displayText}${moreBtn}</p>
            ${actions}
          </div>
        </div>
      </div>`;
  });
}

function filterReviews(stars, btn) {
  document.querySelectorAll('.filter-pill').forEach(el => el.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const filtered = stars === 0 ? liveReviews : liveReviews.filter(r => r.stars === stars);
  renderReviewsList(filtered, 'reviews-full-list', false);
}

// ── Render Products Grid (mock) ───────────────────────────
function renderProductsGrid() {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '';
  mockProducts.forEach((p, i) => {
    grid.innerHTML += `
      <div class="product-card animate-scale-in" style="animation-delay:${i * 0.08}s" onclick="filterReviewsByProduct('${p.name}')">
        <div class="relative">
          <img src="${p.img}" class="product-img" alt="${p.name}">
          <div class="product-overlay">
            <h3 class="text-white font-bold text-lg mb-1">${p.name}</h3>
            <div class="flex items-center gap-2">
              <div class="flex gap-0.5">${starsHTML(Math.round(p.avg))}</div>
              <span class="text-white font-bold text-sm">${p.avg}</span>
            </div>
          </div>
        </div>
        <div class="p-4 flex justify-between items-center bg-surface">
          <span class="text-sm font-semibold" style="color:var(--text-secondary)">Отзывов: ${p.reviews}</span>
          <span class="stat-change ${p.trend >= 0 ? 'up' : 'down'}">${p.trend >= 0 ? '↑' : '↓'} ${Math.abs(p.trend)}</span>
        </div>
      </div>`;
  });
}

function filterReviewsByProduct(productName) {
  switchSection('reviews');
  document.querySelectorAll('.filter-pill').forEach(el => el.classList.remove('active'));
  const filtered = liveReviews.filter(r => r.product === productName);
  renderReviewsList(filtered, 'reviews-full-list', false);
}

// ── QR Generator ─────────────────────────────────────────
let qrItems = [];
let qrCurrentUrl = '';

function qrAddItem(val = '') {
  const id = Date.now() + Math.random();
  qrItems.push({ id, val });
  qrRenderItems();
  const inputs = document.querySelectorAll('.qr-item-input');
  inputs[inputs.length - 1]?.focus();
}

function qrRemoveItem(id) {
  qrItems = qrItems.filter(i => i.id !== id);
  qrRenderItems();
}

function qrSyncItem(id, val) {
  const item = qrItems.find(i => i.id === id);
  if (item) item.val = val;
}

function qrRenderItems() {
  const list = document.getElementById('qr-items-list');
  if (!list) return;
  list.innerHTML = qrItems.map((item, idx) => `
    <div class="flex items-center gap-2">
      <div class="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
           style="background:var(--accent-light);color:var(--accent)">${idx + 1}</div>
      <input class="qr-item-input flex-1 h-10 rounded-xl px-3 text-sm font-medium outline-none"
        style="background:var(--input-bg);border:1px solid var(--border);color:var(--text);font-family:inherit"
        type="text" placeholder="Название товара"
        value="${item.val.replace(/"/g,'&quot;')}"
        oninput="qrSyncItem(${item.id}, this.value)"
        onkeydown="if(event.key==='Enter'){event.preventDefault();qrAddItem()}">
      ${qrItems.length > 1 ? `<button onclick="qrRemoveItem(${item.id})"
        class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
        style="background:transparent;border:none;cursor:pointer;color:var(--text-tertiary)"
        onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='var(--text-tertiary)'">✕</button>` : '<div class="w-7"></div>'}
    </div>
  `).join('');
}

function qrGenerate() {
  const shop  = (document.getElementById('qr-shop')?.value || '').trim();
  const names = qrItems.map(i => i.val.trim()).filter(Boolean);
  if (!names.length) { showToast('Добавьте хотя бы один товар', 'error'); return; }

  const base   = location.origin;
  const params = new URLSearchParams();
  if (shop) params.set('shop', shop);
  params.set('items', names.join(','));
  qrCurrentUrl = `${base}/?${params.toString()}`;

  const wrap = document.getElementById('qr-canvas-wrap');
  wrap.innerHTML = '';
  new QRCode(wrap, {
    text: qrCurrentUrl,
    width: 200, height: 200,
    colorDark: '#000000', colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M,
  });

  document.getElementById('qr-url-text').textContent = qrCurrentUrl;
  document.getElementById('qr-placeholder').classList.add('hidden');
  document.getElementById('qr-output').classList.remove('hidden');
  document.getElementById('qr-output').classList.add('flex');
}

function qrCopy() {
  navigator.clipboard.writeText(qrCurrentUrl).then(() => showToast('Ссылка скопирована!', 'success'));
}

let qrInited = false;

// ── Init ──────────────────────────────────────────────────
fetchReviews().then(() => {
  initDashboard();
  switchSection('dashboard');
});
