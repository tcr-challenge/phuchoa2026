/**
 * drive.js — Google Drive API integration
 * Tải danh sách ảnh từ các thư mục Google Drive
 */

const Drive = (() => {

  const BASE = 'https://www.googleapis.com/drive/v3/files';
  const FIELDS = 'files(id,name,mimeType,size,createdTime,imageMediaMetadata),nextPageToken';
  const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];

  // Cache per folder
  const _cache = {};
  const _tokens = {}; // nextPageToken per folder

  /**
   * Lấy danh sách files trong folder (có phân trang)
   * @param {string} folderId - Google Drive folder ID
   * @param {string|null} pageToken - để lấy trang tiếp theo
   * @returns {Promise<{files, nextPageToken}>}
   */
  async function listFiles(folderId, pageToken = null) {
    const params = new URLSearchParams({
      key: CONFIG.GOOGLE_API_KEY,
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: FIELDS,
      pageSize: CONFIG.PAGE_SIZE,
      orderBy: 'name',
    });

    if (pageToken) params.set('pageToken', pageToken);

    const url = `${BASE}?${params}`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return {
        files: (data.files || []).filter(f => IMAGE_MIME.includes(f.mimeType)),
        nextPageToken: data.nextPageToken || null,
      };
    } catch (e) {
      console.error('[Drive] listFiles error:', e);
      throw e;
    }
  }

  /**
   * Lấy TOÀN BỘ files trong folder (dùng cho BIB search)
   * @param {string} folderId
   * @returns {Promise<Array>}
   */
  async function listAllFiles(folderId) {
    if (_cache[folderId]?.complete) return _cache[folderId].files;

    const allFiles = [];
    let token = null;

    do {
      const { files, nextPageToken } = await listFiles(folderId, token);
      allFiles.push(...files);
      token = nextPageToken;
    } while (token);

    _cache[folderId] = { files: allFiles, complete: true };
    return allFiles;
  }

  /**
   * Load trang đầu của folder (cho gallery tabs)
   */
  async function loadPage(tab) {
    const folderId = CONFIG.FOLDERS[tab];
    if (!folderId || folderId === 'YOUR_' + tab.toUpperCase() + '_FOLDER_ID') {
      return { files: getDemoFiles(tab), nextPageToken: null };
    }

    const { files, nextPageToken } = await listFiles(folderId, _tokens[tab] || null);
    _tokens[tab] = nextPageToken;

    // Cache trang đầu
    if (!_cache[tab]) _cache[tab] = { files: [], complete: false };
    _cache[tab].files.push(...files);

    return { files, nextPageToken };
  }

  /**
   * Load trang tiếp theo
   */
  async function loadNextPage(tab) {
    return loadPage(tab);
  }

  function hasNextPage(tab) {
    return !!_tokens[tab];
  }

  /**
   * URL thumbnail Google Drive (tự resize)
   */
  function thumbUrl(fileId, size) {
    return CONFIG.THUMB_URL(fileId, size || CONFIG.THUMBNAIL_SIZE);
  }

  /**
   * URL xem ảnh full (cho lightbox)
   */
  function fullUrl(fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  /**
   * URL download ảnh gốc
   */
  function downloadUrl(fileId) {
    return CONFIG.FULL_URL(fileId);
  }

  /**
   * Demo files khi chưa config Google Drive
   */
  function getDemoFiles(tab) {
    const COLORS = { flycam: '1a1a2e', khaimac: '16213e', traogiai: '0f3460', lienhoan: '533483' };
    const COLOR = COLORS[tab] || '1a1a2e';
    return Array.from({ length: 24 }, (_, i) => ({
      id: `demo_${tab}_${i}`,
      name: `DEMO_${tab.toUpperCase()}_${String(i+1).padStart(3,'0')}.jpg`,
      _demo: true,
      _color: COLOR,
      _tab: tab,
    }));
  }

  return { listFiles, listAllFiles, loadPage, loadNextPage, hasNextPage, thumbUrl, fullUrl, downloadUrl, getDemoFiles };
})();

window.Drive = Drive;
