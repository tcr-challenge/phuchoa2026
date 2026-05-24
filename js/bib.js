/**
 * bib.js — BIB Detection Engine
 *
 * Chiến lược tìm BIB (ưu tiên từ cao xuống thấp):
 * 1. Tìm trong bib-index.json (do script indexer tạo ra)
 * 2. Tìm trong tên file ảnh (regex)
 * 3. Fuzzy match prefix (F0 → F001, F002, ...)
 *
 * Format BIB hỗ trợ:
 *   - Nữ: F001, F002, ..., F999, F1000
 *   - Nam: M001, M002, ..., M999, M1000
 */

const BibEngine = (() => {

  // BIB index được load từ file JSON
  let _index = null;
  let _indexLoaded = false;
  let _indexLoading = false;

  /**
   * Load BIB index từ file JSON (tạo bởi indexer script)
   * Format: { "F001": ["fileId1","fileId2"], "M023": ["fileId3"] }
   */
  async function loadIndex() {
    if (_indexLoaded) return _index;
    if (_indexLoading) {
      // Chờ loading hoàn tất
      await new Promise(r => {
        const check = setInterval(() => {
          if (_indexLoaded) { clearInterval(check); r(); }
        }, 100);
      });
      return _index;
    }

    _indexLoading = true;
    try {
      const res = await fetch(CONFIG.BIB.INDEX_FILE + '?v=' + Date.now());
      if (res.ok) {
        _index = await res.json();
        console.log(`[BIB] Index loaded: ${Object.keys(_index).length} BIBs`);
      } else {
        _index = null;
        console.warn('[BIB] No index file found — will use filename search');
      }
    } catch (e) {
      _index = null;
      console.warn('[BIB] Index load error:', e.message);
    }
    _indexLoaded = true;
    _indexLoading = false;
    return _index;
  }

  /**
   * Normalize BIB input
   * "f1" → "F001", "m23" → "M023", "F001" → "F001"
   */
  function normalizeBib(raw) {
    if (!raw) return null;
    const s = raw.trim().toUpperCase();
    const m = s.match(/^([FM])(\d{1,4})$/);
    if (!m) return null;
    const gender = m[1];
    const num = m[2].padStart(3, '0');
    return `${gender}${num}`;
  }

  /**
   * Lấy tất cả biến thể của BIB (F001, F1, F01, v.v.)
   */
  function bibVariants(bib) {
    const m = bib.match(/^([FM])(\d+)$/);
    if (!m) return [bib];
    const g = m[1];
    const n = parseInt(m[2]);
    const variants = new Set();
    variants.add(`${g}${String(n).padStart(3,'0')}`);
    variants.add(`${g}${String(n).padStart(4,'0')}`);
    variants.add(`${g}${n}`);
    variants.add(`${g}${String(n).padStart(2,'0')}`);
    return [...variants];
  }

  /**
   * Kiểm tra tên file có chứa BIB không
   */
  function filenameContainsBib(filename, bib) {
    const name = filename.toUpperCase();
    const variants = bibVariants(bib);
    return variants.some(v => {
      // Tìm BIB là "từ" độc lập (không phải một phần số khác)
      const regex = new RegExp(`(?:^|[^A-Z0-9])${v}(?:[^A-Z0-9]|$)`);
      return regex.test(name);
    });
  }

  /**
   * TÌM KIẾM CHÍNH — search BIB trong một tab cụ thể
   * @param {string} rawBib - BIB người dùng nhập (vd: "F001", "m23")
   * @param {string|null} tab - null = tìm tất cả tab
   * @returns {Promise<Array<{file, tab, bib}>>}
   */
  async function search(rawBib, tab = null) {
    const bib = normalizeBib(rawBib);
    if (!bib) return [];

    const results = [];
    const tabs = tab ? [tab] : Object.keys(CONFIG.FOLDERS);

    // Thử tìm trong index trước
    const index = await loadIndex();
    if (index) {
      const fileIds = index[bib] || [];
      if (fileIds.length > 0) {
        // Tìm file objects từ Drive cache
        for (const t of tabs) {
          const cached = await Drive.listAllFiles(CONFIG.FOLDERS[t]);
          for (const f of cached) {
            if (fileIds.includes(f.id)) {
              results.push({ file: f, tab: t, bib });
            }
          }
        }
        return results;
      }
    }

    // Fallback: tìm trong tên file
    for (const t of tabs) {
      const folderId = CONFIG.FOLDERS[t];
      if (!folderId || folderId.startsWith('YOUR_')) continue;

      try {
        showScanStatus(t);
        const files = await Drive.listAllFiles(folderId);
        for (const f of files) {
          if (filenameContainsBib(f.name, bib)) {
            results.push({ file: f, tab: t, bib });
          }
        }
      } catch (e) {
        console.error(`[BIB] Search in ${t} failed:`, e);
      }
    }

    hideScanStatus();
    return results;
  }

  /**
   * Tìm tất cả BIBs có trong 1 file (dùng cho badge hiển thị)
   */
  function extractBibsFromFilename(filename) {
    const name = filename.toUpperCase();
    const found = [];
    const re = /\b([FM])(\d{3,4})\b/g;
    let m;
    while ((m = re.exec(name)) !== null) {
      found.push(`${m[1]}${m[2].padStart(3,'0')}`);
    }
    return found;
  }

  let _scanEl = null;

  function showScanStatus(tab) {
    if (!_scanEl) {
      _scanEl = document.createElement('div');
      _scanEl.className = 'scan-status';
      _scanEl.innerHTML = '<div class="scan-dot"></div><span id="scanText">Đang quét...</span>';
      const hint = document.querySelector('.search-hint');
      if (hint) hint.after(_scanEl);
    }
    _scanEl.style.display = 'flex';
    const t = document.getElementById('scanText');
    if (t) t.textContent = `Đang quét tab ${TAB_LABELS[tab] || tab}...`;
  }

  function hideScanStatus() {
    if (_scanEl) _scanEl.style.display = 'none';
  }

  return { search, normalizeBib, extractBibsFromFilename, loadIndex, filenameContainsBib };
})();

window.BibEngine = BibEngine;
