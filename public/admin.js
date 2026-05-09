// ── Mock Data ─────────────────────────────────────────
const mockStats = [
  { label: 'Всего отзывов', value: '1,247', change: '+14%', up: true, icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>' },
  { label: 'Средний балл', value: '4.3', change: '+0.2', up: true, icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>' },
  { label: 'Товаров', value: '36', change: '+3', up: true, icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>' },
  { label: 'С фото', value: '412', change: '-2%', up: false, icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>' },
];

const mockReviews = [
  { id: 1, name: 'Анна К.', product: 'Круассан классический', stars: 5, text: 'Невероятно вкусный круассан! Хрустящая корочка и нежная начинка. Буду заказывать снова и рекомендовать всем друзьям. Обожаю вашу выпечку, всегда свежая.', time: '12 мин назад', hasPhoto: true },
  { id: 2, name: 'Дмитрий П.', product: 'Латте карамель', stars: 4, text: 'Хороший кофе, но можно было бы добавить чуть больше карамели. В целом очень доволен, уютное заведение.', time: '34 мин назад', hasPhoto: false },
  { id: 3, name: 'Мария С.', product: 'Тирамису', stars: 5, text: 'Лучший тирамису в городе! Очень нежная текстура и идеальный баланс кофе и крема. Обязательно попробуйте, это просто восторг! Каждый кусочек тает во рту, а порция достаточно большая чтобы насладиться сполна. Буду приходить еще и еще!', time: '1 час назад', hasPhoto: true },
  { id: 4, name: 'Алексей В.', product: 'Эклер шоколадный', stars: 3, text: 'Средний эклер, ожидал большего. Шоколад немного горчит.', time: '2 часа назад', hasPhoto: false },
  { id: 5, name: 'Елена Р.', product: 'Чизкейк ягодный', stars: 5, text: 'Обожаю этот чизкейк! Ягоды свежие, текстура кремовая. Идеально!', time: '3 часа назад', hasPhoto: true },
  { id: 6, name: 'Иван Г.', product: 'Капучино', stars: 2, text: 'Кофе слабый, пенка быстро оседает. Нужно доработать.', time: '4 часа назад', hasPhoto: false },
  { id: 7, name: 'Светлана М.', product: 'Эспрессо', stars: 5, text: 'Отличный, крепкий эспрессо. То что нужно для бодрого утра!', time: '5 часов назад', hasPhoto: false },
  { id: 8, name: 'Олег Д.', product: 'Макарун', stars: 4, text: 'Вкусные макаруны, особенно фисташковый. Цена немного кусается, но качество на высоте.', time: 'Вчера', hasPhoto: true },
  { id: 9, name: 'Ирина Б.', product: 'Сэндвич с лососем', stars: 5, text: 'Свежайший лосось и хрустящий хлеб. Прекрасный вариант для сытного перекуса.', time: 'Вчера', hasPhoto: true },
  { id: 10, name: 'Катя В.', product: 'Матча Латте', stars: 5, text: 'Самая вкусная матча, которую я пробовала! Не горчит, идеальные пропорции молока и чая.', time: 'Вчера', hasPhoto: false },
  { id: 11, name: 'Максим Т.', product: 'Круассан классический', stars: 4, text: 'Круассан хорош, но к вечеру уже не такой хрустящий. Лучше брать утром.', time: '2 дня назад', hasPhoto: false },
  { id: 12, name: 'Ольга Н.', product: 'Тирамису', stars: 5, text: 'Просто божественно! Беру каждый раз, когда прихожу к вам.', time: '2 дня назад', hasPhoto: true },
];

const mockProducts = [
  { name: 'Круассан классический', reviews: 187, avg: 4.7, trend: +0.3, img: 'https://images.unsplash.com/photo-1555507036-ab1d4075c6f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
  { name: 'Латте карамель', reviews: 156, avg: 4.4, trend: +0.1, img: 'https://images.unsplash.com/photo-1557006021-b85faa2bc5e2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
  { name: 'Тирамису', reviews: 134, avg: 4.6, trend: +0.4, img: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
  { name: 'Чизкейк ягодный', reviews: 128, avg: 4.5, trend: -0.1, img: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
  { name: 'Эклер шоколадный', reviews: 112, avg: 3.8, trend: -0.3, img: 'https://images.unsplash.com/photo-1603532648955-039310d9ed75?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
  { name: 'Капучино', reviews: 98, avg: 3.2, trend: -0.5, img: 'https://images.unsplash.com/photo-1534045618451-26c361907b22?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
  { name: 'Эспрессо', reviews: 145, avg: 4.8, trend: +0.2, img: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
  { name: 'Макарун', reviews: 210, avg: 4.5, trend: +0.1, img: 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
  { name: 'Сэндвич с лососем', reviews: 85, avg: 4.9, trend: +0.5, img: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
  { name: 'Матча Латте', reviews: 92, avg: 4.6, trend: +0.4, img: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
];

// ── Theme Toggle ──────────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? '' : 'dark');
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
}
(function() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
})();

// ── Navigation ────────────────────────────────────────
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
    'dashboard': { t: 'Дашборд', s: 'Обзор отзывов и рейтингов' },
    'reviews': { t: 'Отзывы', s: 'Управление откликами клиентов' },
    'products': { t: 'Товары', s: 'Рейтинг позиций меню' }
  };

  if (sectionId === 'products' && document.getElementById('products-grid').innerHTML === '') renderProductsGrid();
}

// ── Helpers ───────────────────────────────────────────
function starsHTML(count) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    const fill = i <= count ? 'var(--score-yellow)' : 'var(--border)';
    html += `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="${fill}"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
  }
  return html;
}

function getAvatarBg(name) {
  const colors = ['#C8713E','#D4A574','#5C3D2E','#8B7355','#E8944A','#B5612F'];
  let sum = 0; for(let i=0; i<name.length; i++) sum += name.charCodeAt(i);
  return colors[sum % colors.length];
}

// ── Render Dashboard ──────────────────────────────────
function initDashboard() {
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = '';
  mockStats.forEach((s, i) => {
    grid.innerHTML += `
      <div class="dash-card clickable p-5 animate-fade-up" style="animation-delay:${i * 0.1}s" onclick="switchSection('dashboard')">
        <div class="flex items-start justify-between mb-4">
          <div class="stat-icon-wrap"><svg class="w-5 h-5" fill="none" stroke="var(--accent)" viewBox="0 0 24 24" stroke-width="2">${s.icon}</svg></div>
          <span class="stat-change ${s.up ? 'up' : 'down'}">${s.up ? '↑' : '↓'} ${s.change}</span>
        </div>
        <p class="stat-value animate-count" style="color:var(--text);animation-delay:${i * 0.1 + 0.2}s">${s.value}</p>
        <p class="stat-label mt-2">${s.label}</p>
      </div>`;
  });

  // Calculate Rating Distribution
  let totalStars = 0, totalCount = 0;
  const dist = {5:0, 4:0, 3:0, 2:0, 1:0};
  mockReviews.forEach(r => { dist[r.stars]++; totalStars += r.stars; totalCount++; });
  const avg = (totalStars / totalCount).toFixed(1);
  document.getElementById('avg-score').innerText = avg;

  // Rating Bars
  const barsContainer = document.getElementById('rating-bars');
  barsContainer.innerHTML = '';
  [5,4,3,2,1].forEach((stars, i) => {
    const count = dist[stars];
    const pct = totalCount ? Math.round((count / totalCount) * 100) : 0;
    const barColor = stars >= 4 ? 'var(--score-green)' : stars === 3 ? 'var(--score-yellow)' : 'var(--score-red)';
    barsContainer.innerHTML += `
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1 w-12 justify-end">
          <span class="text-sm font-bold" style="color:var(--text)">${stars}</span>
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="${barColor}"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <div class="flex-1 progress-track" onclick="switchSection('reviews'); setTimeout(()=>filterReviews(${stars}, document.querySelectorAll('.filter-pill')[6-${stars}]), 100)">
          <div class="progress-value" style="width:${pct}%;background:${barColor};animation-delay:${i * 0.1 + 0.3}s"></div>
        </div>
        <span class="text-xs font-semibold w-14 text-right" style="color:var(--text-secondary)">${count} (${pct}%)</span>
      </div>`;
  });

  // Products Table
  const tbody = document.getElementById('products-tbody');
  tbody.innerHTML = '';
  mockProducts.forEach((p, i) => {
    const scoreClass = p.avg >= 4.5 ? 'score-high' : p.avg >= 3.5 ? 'score-mid' : 'score-low';
    const scoreText = p.avg >= 4.5 ? 'Отлично' : p.avg >= 3.5 ? 'Средне' : 'Плохо';
    const trendUp = p.trend >= 0;
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
        <td>
          <span class="stat-change ${trendUp ? 'up' : 'down'}">
            ${trendUp ? '↑' : '↓'} ${trendUp ? '+' : ''}${p.trend.toFixed(1)}
          </span>
        </td>
      </tr>`;
  });

  renderReviewsList(mockReviews, 'reviews-list-dash', true);
  renderReviewsList(mockReviews, 'reviews-full-list', false);
}

// ── Render Reviews ────────────────────────────────────
function renderReviewsList(reviews, containerId, compact = false) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  if (reviews.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>Отзывов не найдено</p></div>`;
    return;
  }
  reviews.forEach((r, i) => {
    const initials = r.name.split(' ').map(w => w[0]).join('');
    const bg = getAvatarBg(r.name);
    // Truncate text logic
    const isLong = r.text.length > 80;
    const displayText = (compact && isLong) ? r.text.substring(0, 80) + '...' : r.text;
    const moreBtn = (compact && isLong) ? `<span class="text-xs font-bold ml-1 cursor-pointer" style="color:var(--accent)" onclick="event.stopPropagation(); switchSection('reviews')">читать далее</span>` : '';

    const actions = compact ? '' : `
      <div class="mt-3 flex gap-2" onclick="event.stopPropagation()">
        <button class="action-btn ghost" onclick="alert('Форма ответа будет добавлена позже')">Ответить</button>
        <button class="action-btn danger" onclick="if(confirm('Удалить отзыв?')) this.closest('.review-item').style.display='none'">Удалить</button>
      </div>`;

    container.innerHTML += `
      <div class="review-item animate-fade-up" style="animation-delay:${i * 0.05}s" onclick="${compact ? `switchSection('reviews')` : ''}">
        <div class="flex gap-3">
          <div class="avatar" style="background:${bg}" onclick="event.stopPropagation();">${initials}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold" style="color:var(--text)">${r.name}</span>
                ${r.hasPhoto ? '<span class="text-[10px] px-1.5 py-0.5 rounded font-semibold" style="background:var(--accent-light);color:var(--accent)">📷 Фото</span>' : ''}
              </div>
              <span class="text-xs" style="color:var(--text-tertiary)">${r.time}</span>
            </div>
            <p class="text-xs font-semibold mb-1" style="color:var(--accent)">${r.product}</p>
            <div class="flex gap-0.5 mb-1.5">${starsHTML(r.stars)}</div>
            <p class="text-sm leading-relaxed" style="color:var(--text-secondary)">
              ${displayText}${moreBtn}
            </p>
            ${actions}
          </div>
        </div>
      </div>`;
  });
}

function filterReviews(stars, btn) {
  document.querySelectorAll('.filter-pill').forEach(el => el.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const filtered = stars === 0 ? mockReviews : mockReviews.filter(r => r.stars === stars);
  renderReviewsList(filtered, 'reviews-full-list', false);
}

// ── Render Products Grid ──────────────────────────────
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
  const filtered = mockReviews.filter(r => r.product === productName);
  renderReviewsList(filtered, 'reviews-full-list', false);
}


// ── Particles (Confetti) ──────────────────────────────
function shootConfetti() {
  const colors = ['#C8713E', '#D4A574', '#4CAF50', '#FF9800'];
  for(let i=0; i<30; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left = Math.random() * 100 + 'vw';
    el.style.top = -10 + 'px';
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDuration = (Math.random() * 2 + 2) + 's';
    el.style.animationDelay = (Math.random() * 0.5) + 's';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }
}

// Expose to window for fun
window.shootConfetti = shootConfetti;

// ── Initialization ────────────────────────────────────
initDashboard();
