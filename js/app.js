/**
 * app.js — Main Application Controller
 * Quản lý: gallery tabs, lightbox, BIB search, lazy loading
 */

// ───────────────────────────────────────────────
//  STATE
// ───────────────────────────────────────────────
const State = {
  currentTab: 'flycam',
  loaded: { flycam: false, khaimac: false, traogiai: false, lienhoan: false },
  hasMore: { flycam: false, khaimac: false, traogiai: false, lienhoan: false },
  lightbox: { photos: [], index: 0 },
  searching: false,
  totalPhotos: 0,
};

// ───────────────────────────────────────────────
//  INIT
// ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Cập nhật tên sự kiện
  document.title = CONFIG.EVENT_NAME + ' — Tìm Ảnh';
  document.querySelector('.banner-title').innerHTML =
    CONFIG.EVENT_NAME.replace(' ', '<span class="accent">') + '</span>';
  document.querySelector('.banner-sub').textContent = CONFIG.EVENT_SUBTITLE;

  // Pre-load BIB index (background)
  BibEngine.loadIndex();

  // Load tab đầu tiên
  await loadTab('flycam');

  // Keyboard: Enter để search
  document.getElementById('bibInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchBib();
    if (e.key === 'Escape') clearSearch();
  });

  // Auto-format BIB input
  document.getElementById('bibInput').addEventListener('input', e => {
    let v = e.target.value.toUpperCase().replace(/[^FM0-9]/g, '');
    if (v.length > 0 && !/^[FM]/.test(v)) v = '';
    e.target.value = v;
  });

  // Keyboard lightbox navigation
  document.addEventListener('keydown', e => {
    const lb = document.getElementById('lightbox');
    if (!lb.classList.contains('open')) return;
    if (e.key === 'ArrowLeft') lbNavigate(-1);
    if (e.key === 'ArrowRight') lbNavigate(1);
    if (e.key === 'Escape') closeLightbox();
  });
});

// ───────────────────────────────────────────────
//  TAB MANAGEMENT
// ───────────────────────────────────────────────
async function switchTab(btnEl) {
  const tab = btnEl.dataset.tab;
  if (tab === State.currentTab) return;

  // Update active button
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');

  // Update panel
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + tab).classList.add('active');

  State.currentTab = tab;

  // Load nếu chưa load
  if (!State.loaded[tab]) {
    await loadTab(tab);
  } else {
    updateTabStats(tab);
  }
}

async function loadTab(tab) {
  const grid = document.getElementById('grid-' + tab);
  if (!grid) return;

  // Show skeleton
  renderSkeletons(grid, 16);

  try {
    const { files, nextPageToken } = await Drive.loadPage(tab);
    grid.innerHTML = '';
    renderPhotos(files, grid, tab);
    State.loaded[tab] = true;
    State.hasMore[tab] = !!nextPageToken;
    State.totalPhotos += files.length;

    const moreBtn = document.getElementById('more-' + tab);
    if (moreBtn) moreBtn.style.display = nextPageToken ? 'inline-block' : 'none';

    document.getElementById('totalPhotos').textContent = State.totalPhotos.toLocaleString();
    updateTabStats(tab);
  } catch (err) {
    grid.innerHTML = `<div style="padding:40px;color:var(--text3);grid-column:1/-1;text-align:center">
      ⚠️ Không thể tải ảnh: ${err.message}<br><small style="color:var(--text3)">Kiểm tra API Key và Folder ID trong config.js</small>
    </div>`;
    console.error('[App] loadTab error:', err);
  }
}

async function loadMore(tab) {
  const btn = document.getElementById('more-' + tab);
  if (btn) { btn.textContent = 'Đang tải...'; btn.disabled = true; }

  const grid = document.getElementById('grid-' + tab);
  const { files, nextPageToken } = await Drive.loadNextPage(tab);
  renderPhotos(files, grid, tab);
  State.hasMore[tab] = !!nextPageToken;
  State.totalPhotos += files.length;
  document.getElementById('totalPhotos').textContent = State.totalPhotos.toLocaleString();

  if (btn) {
    btn.textContent = 'Tải thêm ảnh';
    btn.disabled = false;
    btn.style.display = nextPageToken ? 'inline-block' : 'none';
  }
}

function updateTabStats(tab) {
  const grid = document.getElementById('grid-' + tab);
  const count = grid ? grid.querySelectorAll('.photo-card').length : 0;
  document.getElementById('photoCount').textContent =
    `${TAB_LABELS[tab]} · ${count.toLocaleString()} ảnh đã tải${State.hasMore[tab] ? ' (còn thêm)' : ''}`;
}

// ───────────────────────────────────────────────
//  RENDER PHOTOS
// ───────────────────────────────────────────────
function renderPhotos(files, grid, tab) {
  files.forEach((file, i) => {
    const card = createPhotoCard(file, tab);
    grid.appendChild(card);

    // Lazy load with IntersectionObserver
    observeLazy(card, file);
  });
}

function createPhotoCard(file, tab) {
  const card = document.createElement('div');
  card.className = 'photo-card';
  card.dataset.fileId = file.id;
  card.dataset.tab = tab;
  card.dataset.name = file.name;

  // Extract BIBs from filename for badge
  const bibs = BibEngine.extractBibsFromFilename(file.name);
  const bibBadge = bibs.length > 0
    ? `<span class="bib-badge visible">${bibs[0]}</span>`
    : '';

  if (file._demo) {
    // Demo placeholder
    card.innerHTML = `
      <div style="
        width:100%;height:100%;
        background:#${file._color};
        display:flex;flex-direction:column;
        align-items:center;justify-content:center;
        gap:8px;color:rgba(255,255,255,0.3);
        font-size:13px;text-align:center;padding:12px;
      ">
        <div style="font-size:28px;opacity:0.4">🖼️</div>
        <div style="font-family:var(--font-display);letter-spacing:.08em;font-size:11px">
          ${file.name}
        </div>
        <div style="font-size:10px;opacity:0.5">Cấu hình Google Drive<br>trong config.js</div>
      </div>
      ${bibBadge}
    `;
    card.style.cursor = 'default';
  } else {
    card.innerHTML = `
      <img
        data-src="${Drive.thumbUrl(file.id)}"
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"
        alt="${file.name}"
        loading="lazy"
      >
      ${bibBadge}
    `;
    card.onclick = () => openLightbox(card, tab);
  }

  return card;
}

function renderSkeletons(grid, n) {
  grid.innerHTML = Array(n).fill(
    '<div class="photo-skeleton"></div>'
  ).join('');
}

// ───────────────────────────────────────────────
//  LAZY IMAGE LOADING
// ───────────────────────────────────────────────
const lazyObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target.querySelector('img[data-src]');
      if (img) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        img.onload = () => img.style.opacity = '1';
        img.style.opacity = '0';
        img.style.transition = 'opacity 0.3s ease';
      }
      lazyObserver.unobserve(entry.target);
    }
  });
}, { rootMargin: '200px 0px' });

function observeLazy(card) {
  lazyObserver.observe(card);
}

// ───────────────────────────────────────────────
//  BIB SEARCH
// ───────────────────────────────────────────────
async function searchBib() {
  const raw = document.getElementById('bibInput').value.trim();
  if (!raw) { showToast('Nhập số BIB để tìm kiếm'); return; }

  const bib = BibEngine.normalizeBib(raw);
  if (!bib) {
    showToast('BIB không hợp lệ. VD: F001 hoặc M023');
    document.getElementById('searchBox').style.borderColor = 'var(--accent)';
    setTimeout(() => document.getElementById('searchBox').style.borderColor = '', 1500);
    return;
  }

  showLoading(true);
  State.searching = true;

  try {
    const results = await BibEngine.search(bib, null);
    showSearchResults(bib, results);
  } catch (e) {
    showToast('Lỗi tìm kiếm: ' + e.message);
    console.error('[App] search error:', e);
  } finally {
    showLoading(false);
  }
}

function showSearchResults(bib, results) {
  // Hide main content
  document.getElementById('mainContent').style.display = 'none';
  const section = document.getElementById('resultsSection');
  section.style.display = 'block';

  document.getElementById('resultsBib').textContent = 'BIB: ' + bib;
  document.getElementById('resultsCount').textContent = `${results.length} ảnh tìm thấy`;

  const grid = document.getElementById('resultsGrid');
  const noRes = document.getElementById('noResults');

  if (results.length === 0) {
    grid.innerHTML = '';
    noRes.style.display = 'block';
    document.getElementById('noResultsBib').textContent = bib;
  } else {
    noRes.style.display = 'none';
    grid.innerHTML = '';
    results.forEach(({ file, tab }) => {
      const card = createPhotoCard(file, tab);
      grid.appendChild(card);
      observeLazy(card);
    });

    // Store for lightbox navigation
    State.lightbox.photos = results.map(r => r.file);
  }

  // Scroll to results
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearSearch() {
  State.searching = false;
  document.getElementById('bibInput').value = '';
  document.getElementById('resultsSection').style.display = 'none';
  document.getElementById('mainContent').style.display = 'block';
  document.getElementById('resultsGrid').innerHTML = '';
}

function quickSearch(gender) {
  document.getElementById('bibInput').value = gender;
  document.getElementById('bibInput').focus();
}

// ───────────────────────────────────────────────
//  LIGHTBOX
// ───────────────────────────────────────────────
function openLightbox(card, tab) {
  const fileId = card.dataset.fileId;
  const name = card.dataset.name;
  const bibs = BibEngine.extractBibsFromFilename(name);

  // Build photo list from current context
  let photos;
  if (State.searching) {
    photos = State.lightbox.photos;
  } else {
    const grid = document.getElementById('grid-' + tab);
    photos = [...grid.querySelectorAll('.photo-card')].map(c => ({
      id: c.dataset.fileId,
      name: c.dataset.name,
      _demo: !c.dataset.fileId || c.dataset.fileId.startsWith('demo_'),
    }));
  }

  const idx = photos.findIndex(p => p.id === fileId);
  State.lightbox.photos = photos;
  State.lightbox.index = idx >= 0 ? idx : 0;

  setLightboxPhoto(State.lightbox.index, bibs);

  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function setLightboxPhoto(idx, bibs) {
  const photos = State.lightbox.photos;
  const photo = photos[idx];
  if (!photo) return;

  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lbImg');
  const spinner = document.getElementById('lbSpinner');
  const bibEl = document.getElementById('lbBib');
  const caption = document.getElementById('lbCaption');
  const download = document.getElementById('lbDownload');

  spinner.style.display = 'flex';
  img.style.opacity = '0';

  const extractedBibs = bibs || BibEngine.extractBibsFromFilename(photo.name || '');

  bibEl.textContent = extractedBibs.length > 0 ? extractedBibs.join(' · ') : '';
  caption.textContent = photo.name ? photo.name.replace(/\.[^.]+$/, '') : '';

  if (photo._demo || !photo.id) {
    img.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='533'%3E%3Crect fill='%231e1e2e' width='800' height='533'/%3E%3Ctext fill='%23444' font-size='20' x='400' y='270' text-anchor='middle'%3EDemo — Cấu hình Google Drive%3C/text%3E%3C/svg%3E`;
    spinner.style.display = 'none';
    img.style.opacity = '1';
    download.href = '#';
  } else {
    const fullSrc = Drive.fullUrl(photo.id);
    img.src = fullSrc;
    img.onload = () => {
      spinner.style.display = 'none';
      img.style.opacity = '1';
    };
    img.onerror = () => {
      // Fallback to thumbnail
      img.src = Drive.thumbUrl(photo.id, 1600);
      spinner.style.display = 'none';
      img.style.opacity = '1';
    };
    download.href = CONFIG.FULL_URL(photo.id);
  }

  // Navigation buttons
  document.getElementById('lbPrev').style.opacity = idx > 0 ? '1' : '0.3';
  document.getElementById('lbNext').style.opacity = idx < photos.length - 1 ? '1' : '0.3';
}

function lbNavigate(dir) {
  const next = State.lightbox.index + dir;
  if (next < 0 || next >= State.lightbox.photos.length) return;
  State.lightbox.index = next;
  setLightboxPhoto(next);
}

function closeLightbox(e) {
  if (e && e.target !== document.getElementById('lightbox') &&
      !e.target.classList.contains('lb-close')) return;
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}

function sharePhoto() {
  const photo = State.lightbox.photos[State.lightbox.index];
  if (!photo || photo._demo) { showToast('Không thể chia sẻ ảnh demo'); return; }
  const url = CONFIG.VIEW_URL(photo.id);
  if (navigator.share) {
    navigator.share({ title: 'Ảnh giải chạy', url });
  } else {
    navigator.clipboard.writeText(url).then(() => showToast('Đã sao chép link ảnh!'));
  }
}

// ───────────────────────────────────────────────
//  UTILITIES
// ───────────────────────────────────────────────
function showLoading(show) {
  document.getElementById('loadingOverlay').classList.toggle('show', show);
}

let _toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// Expose to HTML onclick
window.searchBib = searchBib;
window.clearSearch = clearSearch;
window.switchTab = switchTab;
window.loadMore = loadMore;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.lbNavigate = lbNavigate;
window.sharePhoto = sharePhoto;
window.quickSearch = quickSearch;
