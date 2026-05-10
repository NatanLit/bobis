// ── Live data from API ─────────────────────────────────────
let liveReviews  = [];
let liveProducts = [];
let liveOffers   = [];

function adminKey() { return sessionStorage.getItem('admin_key') || 'review123'; }

async function fetchReviews() {
  try {
    const res = await fetch(`/admin/reviews?key=${adminKey()}&limit=100`);
    const json = await res.json();
    if (!json.success) return;

    liveReviews = (json.data || []).map(r => ({
      id:       r.id,
      itemId:   r.item_id || null,
      name:     r.users?.phone_or_email || 'Гость',
      product:  r.item_name || r.items?.name || 'Неизвестный товар',
      stars:    r.stars,
      score:    r.score,
      text:     r.text,
      time:     timeAgo(r.created_at),
      photoUrl: r.photo_url || null,
      hasPhoto: !!r.photo_url,
      points:   r.points_earned,
    }));
  } catch (e) {
    console.warn('Reviews API failed:', e);
  }
}

async function fetchProducts() {
  try {
    const res = await fetch(`/admin/products?key=${adminKey()}`);
    const json = await res.json();
    if (json.success) liveProducts = json.data || [];
  } catch (e) {
    console.warn('Products API failed:', e);
  }
}

async function fetchOffers() {
  try {
    const res = await fetch('/offers');
    const json = await res.json();
    if (json.success) liveOffers = json.data || [];
  } catch (e) {
    console.warn('Offers API failed:', e);
  }
}

// Map item_id → reviews count from live reviews data, used for live updates
function reviewsForProduct(productId) {
  return liveReviews.filter(r => r.itemId === productId);
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
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}
// Apply saved theme on load (default: dark)
(function () {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
})();

// ── Navigation ────────────────────────────────────────────
const navHistory = ['dashboard'];
let currentSection = 'dashboard';

function switchSection(sectionId, opts = {}) {
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
    dashboard: { t: 'Дашборд',       s: 'Обзор отзывов и рейтингов' },
    reviews:   { t: 'Отзывы',       s: 'Управление откликами клиентов' },
    products:  { t: 'Товары',       s: 'Рейтинг позиций меню' },
    qr:        { t: 'QR-коды',      s: 'Генератор ссылок для кассиров' },
    insights:  { t: 'AI Анализ',    s: 'Рекомендации на основе отзывов' },
    offers:    { t: 'Предложения', s: 'Бонусные предложения для клиентов' },
  };
  const info = titles[sectionId];
  if (info) {
    document.getElementById('page-title').textContent    = info.t;
    document.getElementById('page-subtitle').textContent = info.s;
  }

  // Track history for back navigation (skip if explicitly going back)
  if (!opts.fromBack && currentSection !== sectionId) {
    navHistory.push(sectionId);
  }
  currentSection = sectionId;
  updateBackButton();

  if (sectionId === 'products') renderProductsGrid();
  if (sectionId === 'offers')   { fetchOffers().then(() => renderOffersGrid()); }
  if (sectionId === 'insights') { loadInsights(false); }
  if (sectionId === 'qr' && !qrInited) {
    qrInited = true;
    fetchProducts().then(() => qrRenderProductPicker());
  }
}

function goBack() {
  if (navHistory.length > 1) {
    navHistory.pop();
    const prev = navHistory[navHistory.length - 1];
    switchSection(prev, { fromBack: true });
  } else {
    switchSection('dashboard', { fromBack: true });
  }
}

function updateBackButton() {
  const btn = document.getElementById('back-btn');
  if (!btn) return;
  // Show back button anywhere except dashboard
  const visible = currentSection !== 'dashboard';
  btn.classList.toggle('hidden', !visible);
  btn.classList.toggle('flex', visible);
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
    { label: 'Товаров',       value: liveProducts.length || '—', change: 'в каталоге',           up: true,  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>' },
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

  // Products table (live)
  const tbody = document.getElementById('products-tbody');
  tbody.innerHTML = '';
  if (!liveProducts.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:32px;color:var(--text-tertiary)">Товаров пока нет — добавьте в разделе «Товары»</td></tr>`;
  } else {
    liveProducts.forEach((p, i) => {
      const scoreClass = p.avg >= 4.5 ? 'score-high' : p.avg >= 3.5 ? 'score-mid' : 'score-low';
      const scoreText  = p.avg >= 4.5 ? 'Отлично'   : p.avg >= 3.5 ? 'Средне'   : (p.reviews ? 'Плохо' : '—');
      tbody.innerHTML += `
        <tr onclick="filterReviewsByProduct('${p.id}','${p.name.replace(/'/g, "\\'")}')">
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
              <span class="font-bold" style="color:var(--text)">${p.avg || '—'}</span>
            </div>
          </td>
          <td><span class="score-badge ${scoreClass}">${scoreText}</span></td>
          <td style="color:var(--text-tertiary);font-size:12px">${p.reviews ? `AI: ${p.avg_score}` : 'нет данных'}</td>
        </tr>`;
    });
  }

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

    const photoThumb = r.photoUrl
      ? `<img src="${r.photoUrl}" onclick="event.stopPropagation();openLightbox('${r.photoUrl}')" alt="фото отзыва" loading="lazy"
           class="rounded-xl object-cover flex-shrink-0 cursor-pointer transition-transform"
           style="width:88px;height:88px;border:1px solid var(--border)"
           onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">`
      : '';

    container.innerHTML += `
      <div class="review-item animate-fade-up" style="animation-delay:${i * 0.05}s" onclick="${compact ? "switchSection('reviews')" : ''}">
        <div class="flex gap-3">
          <div class="avatar" style="background:${bg}">${initials}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold" style="color:var(--text)">${r.name}</span>
                ${scoreBadge}
              </div>
              <span class="text-xs" style="color:var(--text-tertiary)">${r.time}</span>
            </div>
            <p class="text-xs font-semibold mb-1" style="color:var(--accent)">${r.product}</p>
            <div class="flex gap-0.5 mb-1.5">${starsHTML(r.stars)}</div>
            <p class="text-sm leading-relaxed" style="color:var(--text-secondary)">${displayText}${moreBtn}</p>
            ${actions}
          </div>
          ${photoThumb}
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

// ── Render Products Grid (live from /admin/products) ─────
async function renderProductsGrid() {
  const grid = document.getElementById('products-grid');
  if (!liveProducts.length) {
    await fetchProducts();
  }
  grid.innerHTML = '';
  if (!liveProducts.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
      </svg>
      <p>Товаров пока нет — добавьте через форму выше</p>
    </div>`;
    return;
  }
  liveProducts.forEach((p, i) => {
    const img = p.image_url || `https://placehold.co/600x400/${'333'}/fff?text=${encodeURIComponent(p.name.slice(0,18))}`;
    grid.innerHTML += `
      <div class="product-card animate-scale-in" style="animation-delay:${i * 0.06}s">
        <div class="relative" onclick="filterReviewsByProduct('${p.id}','${p.name.replace(/'/g, "\\'")}')" style="cursor:pointer">
          <img src="${img}" class="product-img" alt="${p.name}" onerror="this.src='https://placehold.co/600x400/333/fff?text=No+Image'">
          <div class="product-overlay">
            <h3 class="text-white font-bold text-lg mb-1">${p.name}</h3>
            <div class="flex items-center gap-2">
              <div class="flex gap-0.5">${starsHTML(Math.round(p.avg))}</div>
              <span class="text-white font-bold text-sm">${p.avg || '0.0'}</span>
            </div>
          </div>
          <button onclick="event.stopPropagation();deleteProduct('${p.id}','${p.name.replace(/'/g, "\\'")}')" title="Удалить"
            class="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style="background:rgba(0,0,0,.6);color:#fff;border:none;cursor:pointer;backdrop-filter:blur(8px)">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"/></svg>
          </button>
        </div>
        <div class="p-4 flex justify-between items-center" style="background:var(--surface)">
          <span class="text-sm font-semibold" style="color:var(--text-secondary)">Отзывов: ${p.reviews}</span>
          ${p.reviews ? `<span class="text-xs font-semibold" style="color:var(--accent)">★ ${p.avg}</span>` : ''}
        </div>
      </div>`;
  });
}

function filterReviewsByProduct(productId, productName) {
  switchSection('reviews');
  document.querySelectorAll('.filter-pill').forEach(el => el.classList.remove('active'));
  const filtered = productId
    ? liveReviews.filter(r => r.itemId === productId)
    : liveReviews.filter(r => r.product === productName);
  renderReviewsList(filtered, 'reviews-full-list', false);
  // Show context in subtitle
  const sub = document.getElementById('page-subtitle');
  if (sub && productName) sub.textContent = `Отзывы на «${productName}» — ${filtered.length}`;
}

// ── Add / Delete products ────────────────────────────────
async function addProduct() {
  const nameEl = document.getElementById('new-product-name');
  const imgEl  = document.getElementById('new-product-image');
  const name   = nameEl.value.trim();
  const image  = imgEl.value.trim();
  if (!name) { showToast?.('Введите название', 'error'); return; }
  try {
    const res = await fetch(`/admin/products?key=${adminKey()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, image_url: image || null }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Не удалось добавить');
    nameEl.value = ''; imgEl.value = '';
    showToast?.('Товар добавлен', 'success');
    await fetchProducts();
    renderProductsGrid();
  } catch (e) {
    alert('Ошибка: ' + e.message);
  }
}

async function deleteProduct(id, name) {
  if (!confirm(`Удалить «${name}»?\nЕго отзывы останутся, но потеряют связь с товаром.`)) return;
  try {
    const res = await fetch(`/admin/products/${id}?key=${adminKey()}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Не удалось удалить');
    showToast?.('Товар удалён', 'success');
    await fetchProducts();
    renderProductsGrid();
  } catch (e) {
    alert('Ошибка: ' + e.message);
  }
}

// Tiny toast helper
function showToast(msg, kind = 'info') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const colors = { success: 'var(--score-green)', error: 'var(--score-red)', info: 'var(--accent)' };
  const t = document.createElement('div');
  t.style.cssText = `background:var(--surface);border:1px solid ${colors[kind]};color:var(--text);padding:10px 16px;border-radius:12px;margin-top:8px;box-shadow:var(--shadow);font-size:13px;font-weight:600;animation:toastIn .3s ease forwards`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.animation = 'toastOut .3s ease forwards'; setTimeout(() => t.remove(), 300); }, 2200);
}

// ── QR Generator (product picker → IDs in URL) ───────────
let qrSelectedIds = new Set();
let qrCurrentUrl = '';

function qrRenderProductPicker() {
  const wrap = document.getElementById('qr-product-picker');
  if (!wrap) return;
  if (!liveProducts.length) {
    wrap.innerHTML = `<div class="text-sm" style="color:var(--text-tertiary);padding:16px;text-align:center;background:var(--cream);border-radius:12px">Нет товаров. Добавьте в разделе «Товары»</div>`;
    return;
  }
  wrap.innerHTML = liveProducts.map(p => {
    const checked = qrSelectedIds.has(p.id);
    const img = p.image_url || `https://placehold.co/80x80/333/fff?text=${encodeURIComponent(p.name.slice(0,2))}`;
    return `
      <label class="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all" style="background:${checked ? 'var(--accent-light)' : 'var(--cream)'};border:1px solid ${checked ? 'var(--accent)' : 'var(--border)'}">
        <input type="checkbox" data-product-id="${p.id}" ${checked ? 'checked' : ''} onchange="qrToggleProduct('${p.id}')" style="width:18px;height:18px;accent-color:var(--accent);cursor:pointer">
        <img src="${img}" alt="" style="width:36px;height:36px;border-radius:8px;object-fit:cover" onerror="this.style.display='none'">
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold truncate" style="color:var(--text)">${p.name}</div>
          <div class="text-xs" style="color:var(--text-tertiary)">${p.reviews} ${p.reviews === 1 ? 'отзыв' : (p.reviews >= 2 && p.reviews <= 4) ? 'отзыва' : 'отзывов'}</div>
        </div>
      </label>
    `;
  }).join('');
}

function qrToggleProduct(id) {
  if (qrSelectedIds.has(id)) qrSelectedIds.delete(id);
  else qrSelectedIds.add(id);
  qrRenderProductPicker();
}

function qrGenerate() {
  const shop = (document.getElementById('qr-shop')?.value || '').trim();
  const ids  = [...qrSelectedIds];
  if (!ids.length) { showToast('Выберите хотя бы один товар', 'error'); return; }

  const base   = location.origin;
  const params = new URLSearchParams();
  if (shop) params.set('shop', shop);
  params.set('ids', ids.join(','));
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

// ── Lightbox (фото-галерея с навигацией стрелками) ───────
let lbPhotos = [];
let lbIndex  = 0;

function openLightbox(url) {
  // Collect all photos from current liveReviews in display order
  lbPhotos = liveReviews.filter(r => r.photoUrl).map(r => ({
    url: r.photoUrl,
    user: r.name,
    product: r.product,
    text: r.text,
    stars: r.stars,
  }));
  lbIndex = Math.max(0, lbPhotos.findIndex(p => p.url === url));
  if (lbIndex < 0) lbIndex = 0;
  renderLightbox();
}

function closeLightbox() {
  const el = document.getElementById('lightbox');
  if (el) el.remove();
  document.removeEventListener('keydown', lbKeydown);
}

function lbNav(delta) {
  if (!lbPhotos.length) return;
  lbIndex = (lbIndex + delta + lbPhotos.length) % lbPhotos.length;
  renderLightbox();
}

function lbKeydown(e) {
  if (e.key === 'Escape')    closeLightbox();
  if (e.key === 'ArrowLeft') lbNav(-1);
  if (e.key === 'ArrowRight') lbNav(1);
}

function renderLightbox() {
  let el = document.getElementById('lightbox');
  if (!el) {
    el = document.createElement('div');
    el.id = 'lightbox';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:200;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease forwards';
    el.onclick = e => { if (e.target === el) closeLightbox(); };
    document.body.appendChild(el);
    document.addEventListener('keydown', lbKeydown);
  }
  const p = lbPhotos[lbIndex];
  el.innerHTML = `
    <button onclick="closeLightbox()" style="position:absolute;top:20px;right:20px;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.1);border:none;color:#fff;font-size:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2" onmouseover="this.style.background='rgba(255,255,255,.2)'" onmouseout="this.style.background='rgba(255,255,255,.1)'">×</button>
    ${lbPhotos.length > 1 ? `
      <button onclick="lbNav(-1)" style="position:absolute;left:20px;top:50%;transform:translateY(-50%);width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.1);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2" onmouseover="this.style.background='rgba(255,255,255,.2)'" onmouseout="this.style.background='rgba(255,255,255,.1)'">
        <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      </button>
      <button onclick="lbNav(1)" style="position:absolute;right:20px;top:50%;transform:translateY(-50%);width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.1);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2" onmouseover="this.style.background='rgba(255,255,255,.2)'" onmouseout="this.style.background='rgba(255,255,255,.1)'">
        <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
      </button>
    ` : ''}
    <div style="max-width:90vw;max-height:90vh;display:flex;flex-direction:column;align-items:center;gap:16px">
      <img src="${p.url}" style="max-width:90vw;max-height:75vh;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.5)">
      <div style="text-align:center;color:#fff;max-width:600px">
        <div style="font-size:13px;opacity:.7;margin-bottom:4px">${p.user} · ${p.product} · ${'★'.repeat(p.stars)}</div>
        <div style="font-size:14px;line-height:1.5;opacity:.85">${p.text}</div>
        ${lbPhotos.length > 1 ? `<div style="font-size:12px;opacity:.5;margin-top:10px">${lbIndex + 1} / ${lbPhotos.length}</div>` : ''}
      </div>
    </div>
  `;
}

// ── Auto-refresh ─────────────────────────────────────────
let autoRefreshTimer = null;
function startAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(async () => {
    if (document.hidden) return; // pause when tab not visible
    const oldCount = liveReviews.length;
    await Promise.all([fetchReviews(), fetchProducts()]);
    if (liveReviews.length !== oldCount) {
      // Re-render only when something changed
      initDashboard();
      if (currentSection === 'reviews')  renderReviewsList(liveReviews, 'reviews-full-list', false);
      if (currentSection === 'products') renderProductsGrid();
      if (liveReviews.length > oldCount) showToast(`+${liveReviews.length - oldCount} новых отзыва`, 'success');
    }
  }, 15000);
}

// ── Init ────────────────────────────────────────────────────
Promise.all([fetchReviews(), fetchProducts(), fetchOffers()]).then(() => {
  initDashboard();
  switchSection('dashboard');
  startAutoRefresh();
});

// ── Offers CRUD ────────────────────────────────────────────────
async function addOffer() {
  const nameEl = document.getElementById('new-offer-name');
  const descEl = document.getElementById('new-offer-desc');
  const ptsEl  = document.getElementById('new-offer-pts');
  const name   = nameEl.value.trim();
  const desc   = descEl.value.trim();
  const pts    = parseInt(ptsEl.value);
  if (!name) { showToast('Введите название', 'error'); return; }
  if (!pts || pts < 1) { showToast('Укажите стоимость в поинтах', 'error'); return; }
  try {
    const res = await fetch(`/offers?key=${adminKey()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: desc || null, points_cost: pts }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Не удалось добавить');
    nameEl.value = ''; descEl.value = ''; ptsEl.value = '';
    showToast('Предложение добавлено', 'success');
    await fetchOffers();
    renderOffersGrid();
  } catch (e) {
    alert('Ошибка: ' + e.message);
  }
}

async function deleteOffer(id, name) {
  if (!confirm(`Удалить «${name}»?`)) return;
  try {
    const res = await fetch(`/offers/${id}?key=${adminKey()}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Не удалось удалить');
    showToast('Предложение удалено', 'success');
    await fetchOffers();
    renderOffersGrid();
  } catch (e) {
    alert('Ошибка: ' + e.message);
  }
}

function renderOffersGrid() {
  const grid = document.getElementById('offers-grid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!liveOffers.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>
      </svg>
      <p>Предложений пока нет — добавьте через форму выше</p>
    </div>`;
    return;
  }
  liveOffers.forEach((o, i) => {
    grid.innerHTML += `
      <div class="dash-card p-5 animate-scale-in" style="animation-delay:${i * 0.06}s;position:relative">
        <button onclick="deleteOffer('${o.id}','${(o.name || '').replace(/'/g, "\\\'")}')" title="Удалить"
          class="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
          style="background:var(--bg);color:var(--text-tertiary);border:1px solid var(--border);cursor:pointer">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"/>
          </svg>
        </button>
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style="background:var(--accent-light)">
          <svg class="w-6 h-6" fill="none" stroke="var(--accent)" viewBox="0 0 24 24" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>
          </svg>
        </div>
        <h4 class="text-base font-bold mb-1" style="color:var(--text)">${o.name}</h4>
        ${o.description ? `<p class="text-xs mb-2" style="color:var(--text-secondary)">${o.description}</p>` : ''}
        <div class="flex items-center gap-2 mt-2">
          <span class="text-sm font-bold" style="color:var(--accent)">${o.points_cost} pts</span>
          <span class="text-xs" style="color:var(--text-tertiary)">• ${timeAgo(o.created_at)}</span>
        </div>
      </div>`;
  });
}

// ── AI Insights ────────────────────────────────────────────────
let insightsData      = null;
let insightsTagFilter = 'all';

const TAG_COLORS = {
  'еда':       '#FF8C00',
  'сервис':    '#3B82F6',
  'атмосфера': '#A855F7',
  'цена':      '#22C55E',
  'чистота':   '#06B6D4',
  'скорость':  '#EAB308',
  'прочее':    '#737373',
};

const SEVERITY_META = {
  critical:   { label: 'Критично',  color: '#EF4444', bg: 'rgba(239,68,68,.10)',  border: 'rgba(239,68,68,.4)',  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>' },
  suggestion: { label: 'Совет',     color: '#EAB308', bg: 'rgba(234,179,8,.10)',  border: 'rgba(234,179,8,.4)',  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>' },
  praise:     { label: 'Хорошо',    color: '#22C55E', bg: 'rgba(34,197,94,.10)',  border: 'rgba(34,197,94,.4)',  icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/>' },
};

function fmtAge(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'только что';
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  return `${h} ч назад`;
}

async function loadInsights(force) {
  const grid    = document.getElementById('insights-grid');
  const loading = document.getElementById('insights-loading');
  const meta    = document.getElementById('insights-meta');
  const btn     = document.getElementById('insights-refresh-btn');
  const btnLabel = document.getElementById('insights-btn-label');

  // Show cached data instantly if we already have it and not forcing refresh
  if (!force && insightsData) {
    renderInsights();
    return;
  }

  loading.classList.remove('hidden');
  if (!force && !insightsData) grid.innerHTML = '';
  btn.disabled = true;
  btnLabel.textContent = force ? 'Обновляю…' : 'Загружаю…';

  try {
    const res  = await fetch(`/admin/insights?key=${adminKey()}${force ? '&force=1' : ''}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Ошибка анализа');

    insightsData = json;
    renderInsights();
    if (force) showToast('Анализ обновлён', 'success');
  } catch (e) {
    meta.textContent = 'Ошибка: ' + e.message;
    showToast('Ошибка анализа: ' + e.message, 'error');
  } finally {
    loading.classList.add('hidden');
    btn.disabled = false;
    btnLabel.textContent = 'Обновить';
  }
}

function renderInsights() {
  const grid        = document.getElementById('insights-grid');
  const meta        = document.getElementById('insights-meta');
  const tagFilterEl = document.getElementById('insights-tag-filter');

  if (!insightsData) return;

  if (insightsData.empty || !insightsData.insights?.length) {
    meta.textContent = 'Отзывов пока нет — добавьте первые для анализа';
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
      </svg>
      <p>Нет данных для анализа</p>
    </div>`;
    tagFilterEl.innerHTML = '';
    return;
  }

  // Header meta
  const ageStr = fmtAge(insightsData.age_ms || 0);
  meta.textContent = `Проанализировано ${insightsData.reviewCount} отзывов · ${ageStr}${insightsData.cached ? ' (из кэша)' : ''}`;

  // Tag filter pills — only the tags that actually appear
  const presentTags = new Set();
  insightsData.insights.forEach(i => i.tags.forEach(t => presentTags.add(t)));
  const tagsArr = ['all', ...presentTags];
  tagFilterEl.innerHTML = tagsArr.map(tag => {
    const isAll  = tag === 'all';
    const active = insightsTagFilter === tag;
    const color  = isAll ? 'var(--accent)' : (TAG_COLORS[tag] || 'var(--accent)');
    return `<button onclick="setInsightsFilter('${tag}')"
      class="text-xs font-bold px-3 py-1.5 rounded-full transition-all"
      style="background:${active ? color : 'transparent'};color:${active ? '#fff' : color};border:1px solid ${color};cursor:pointer">
      ${isAll ? 'Все' : '#' + tag}
    </button>`;
  }).join('');

  // Filter + sort by severity (critical first)
  const filtered = insightsTagFilter === 'all'
    ? insightsData.insights
    : insightsData.insights.filter(i => i.tags.includes(insightsTagFilter));
  const order = { critical: 0, suggestion: 1, praise: 2 };
  filtered.sort((a, b) => order[a.severity] - order[b.severity]);

  grid.innerHTML = filtered.map((ins, i) => {
    const sev = SEVERITY_META[ins.severity] || SEVERITY_META.suggestion;
    const tagsHtml = ins.tags.map(t => {
      const c = TAG_COLORS[t] || '#737373';
      return `<span class="text-xs font-semibold px-2 py-0.5 rounded-md" style="background:${c}1a;color:${c}">#${t}</span>`;
    }).join('');
    return `
      <div class="dash-card p-5 animate-fade-up" style="animation-delay:${i * 0.05}s;border-left:3px solid ${sev.color}">
        <div class="flex items-start gap-3 mb-3">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style="background:${sev.bg};border:1px solid ${sev.border}">
            <svg class="w-4 h-4" fill="none" stroke="${sev.color}" viewBox="0 0 24 24" stroke-width="2">${sev.icon}</svg>
          </div>
          <div class="flex-1 min-w-0">
            <span class="text-[10px] font-bold uppercase tracking-wider" style="color:${sev.color}">${sev.label}</span>
            <h4 class="text-base font-bold leading-snug mt-0.5" style="color:var(--text)">${ins.title}</h4>
          </div>
        </div>
        <p class="text-sm leading-relaxed mb-3" style="color:var(--text-secondary)">${ins.description}</p>
        <div class="flex flex-wrap gap-1.5">${tagsHtml}</div>
      </div>`;
  }).join('');
}

function setInsightsFilter(tag) {
  insightsTagFilter = tag;
  renderInsights();
}
