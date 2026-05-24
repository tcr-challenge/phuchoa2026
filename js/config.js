/**
 * =============================================================
 *  RACE PHOTO FINDER — CẤU HÌNH
 *  Chỉnh sửa file này để kết nối với Google Drive của bạn
 * =============================================================
 */

const CONFIG = {

  // ──────────────────────────────────────────────────────────
  //  GOOGLE DRIVE API KEY
  //  Tạo tại: https://console.cloud.google.com/
  //  Enable: Google Drive API → Credentials → API Key
  //  Restrict: HTTP referrers → thêm domain GitHub Pages của bạn
  // ──────────────────────────────────────────────────────────
  GOOGLE_API_KEY: 'YOUR_GOOGLE_API_KEY_HERE',

  // ──────────────────────────────────────────────────────────
  //  ID CÁC THƯ MỤC GOOGLE DRIVE
  //  Cách lấy: Mở thư mục trên Drive → nhìn URL:
  //  https://drive.google.com/drive/folders/[FOLDER_ID_HERE]
  //  LƯU Ý: Thư mục phải được chia sẻ "Anyone with the link"
  // ──────────────────────────────────────────────────────────
  FOLDERS: {
    flycam:   'YOUR_FLYCAM_FOLDER_ID',
    khaimac:  'YOUR_KHAIMAC_FOLDER_ID',
    traogiai: 'YOUR_TRAOGIAI_FOLDER_ID',
    lienhoan: 'YOUR_LIENHOAN_FOLDER_ID',
  },

  // ──────────────────────────────────────────────────────────
  //  TÊN GIẢI ĐẤU (hiển thị trên banner/footer)
  // ──────────────────────────────────────────────────────────
  EVENT_NAME: 'Race Photo Finder',
  EVENT_SUBTITLE: 'Tìm ảnh giải chạy của bạn',

  // ──────────────────────────────────────────────────────────
  //  CẤU HÌNH HIỂN THỊ
  // ──────────────────────────────────────────────────────────
  PAGE_SIZE: 48,          // Số ảnh load mỗi lần (thumbnail)
  THUMBNAIL_SIZE: 400,    // Kích thước thumbnail (px) cho lưới

  // ──────────────────────────────────────────────────────────
  //  CẤU HÌNH QUÉT BIB (Bib Detection)
  //  Điều chỉnh độ nhạy tìm kiếm BIB
  // ──────────────────────────────────────────────────────────
  BIB: {
    // Định dạng BIB: F = Nữ, M = Nam + 3 chữ số
    PATTERN_FEMALE: /\bF\d{3,4}\b/gi,
    PATTERN_MALE:   /\bM\d{3,4}\b/gi,

    // Tìm trong tên file + metadata + (nếu có) file index JSON
    SEARCH_IN_FILENAME: true,
    SEARCH_IN_INDEX:    true,

    // File index BIB (tạo bằng script bib-indexer.js)
    // Đặt tại gốc repo GitHub: bib-index.json
    INDEX_FILE: './bib-index.json',

    // Fallback: tìm bib trong tên file thay vì index
    // Đặt tên ảnh dạng: F001_DSC1234.jpg hoặc M023_photo.jpg
    FILENAME_BIB_REGEX: /^([FM]\d{3,4})[_\-\.]/i,
  },

  // ──────────────────────────────────────────────────────────
  //  THUMBNAILS
  //  Google Drive hỗ trợ resize ảnh tự động qua URL
  // ──────────────────────────────────────────────────────────
  THUMB_URL: (fileId, size = 400) =>
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`,

  FULL_URL: (fileId) =>
    `https://drive.google.com/uc?export=download&id=${fileId}`,

  VIEW_URL: (fileId) =>
    `https://drive.google.com/file/d/${fileId}/view`,
};

// Tên hiển thị cho mỗi tab
const TAB_LABELS = {
  flycam:   '🚁 Flycam',
  khaimac:  '🎬 Khai Mạc',
  traogiai: '🏆 Trao Giải',
  lienhoan: '🎉 Liên Hoan',
};

// Xuất để dùng trong các module khác
window.CONFIG = CONFIG;
window.TAB_LABELS = TAB_LABELS;
