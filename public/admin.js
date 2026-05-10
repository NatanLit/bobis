// ── Live data from API ─────────────────────────────────────
let liveReviews  = [];
let liveProducts = [];

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

  // Track history for back navigation (skip if explicitly going back)
  if (!opts.fromBack && currentSection !== sectionId) {
    navHistory.push(sectionId);
  }
  currentSection = sectionId;
  updateBackButton();

  if (sectionId === 'products') renderProductsGrid();
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

// ── Init ──────────────────────────────────────────────────
Promise.all([fetchReviews(), fetchProducts()]).then(() => {
  initDashboard();
  switchSection('dashboard');
});
