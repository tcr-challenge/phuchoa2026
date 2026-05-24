# 📸 Race Photo Finder

Web tìm ảnh giải chạy thông minh theo số BIB — host trên GitHub Pages, ảnh lưu trên Google Drive.

---

## 🚀 Hướng Dẫn Cài Đặt

### Bước 1 — Fork & Clone repo này

```bash
git clone https://github.com/YOUR_USERNAME/race-photo-finder.git
cd race-photo-finder
```

---

### Bước 2 — Tạo Google Drive API Key

1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo Project mới
3. Enable **Google Drive API**
4. Tạo **Credentials → API Key**
5. Restrict key: **HTTP referrers** → thêm `https://YOUR_USERNAME.github.io/*`

---

### Bước 3 — Chuẩn bị thư mục Google Drive

Tạo 4 thư mục trên Google Drive:
- `flycam`
- `khaimac`
- `traogiai`
- `lienhoan`

Với mỗi thư mục:
1. Upload ảnh vào đó
2. **Share → Anyone with the link → Viewer**
3. Copy **Folder ID** từ URL: `https://drive.google.com/drive/folders/[FOLDER_ID_HERE]`

**💡 Đặt tên ảnh theo chuẩn BIB để tìm kiếm chính xác:**
```
F001_DSC1234.jpg   → Ảnh của vận động viên nữ BIB F001
M023_DSC5678.jpg   → Ảnh của vận động viên nam BIB M023
```

---

### Bước 4 — Cấu hình `js/config.js`

```javascript
const CONFIG = {
  GOOGLE_API_KEY: 'AIzaSy...YOUR_KEY...',  // ← Điền API Key

  FOLDERS: {
    flycam:   '1AbCdEfGhIjK...',  // ← Điền Folder ID
    khaimac:  '1AbCdEfGhIjK...',
    traogiai: '1AbCdEfGhIjK...',
    lienhoan: '1AbCdEfGhIjK...',
  },

  EVENT_NAME: 'TÊN GIẢI CHẠY',  // ← Tên sự kiện của bạn
  EVENT_SUBTITLE: 'Tìm ảnh của bạn',
};
```

---

### Bước 5 — Tạo BIB Index (quan trọng cho tìm kiếm nhanh)

Cài Node.js, rồi chạy indexer:

```bash
npm install googleapis
node bib-indexer.js
```

Sau đó commit file `bib-index.json` được tạo ra:

```bash
git add bib-index.json
git commit -m "Update BIB index"
git push
```

> ⚠️ **Cần chạy lại indexer mỗi khi thêm ảnh mới vào Drive**

---

### Bước 6 — Deploy lên GitHub Pages

1. Vào **Settings → Pages**
2. Source: **GitHub Actions**
3. Push code → tự động deploy!

URL web: `https://YOUR_USERNAME.github.io/race-photo-finder/`

---

## 📁 Cấu Trúc Project

```
race-photo-finder/
├── index.html          # Trang chính
├── css/
│   └── style.css       # Giao diện
├── js/
│   ├── config.js       # ⚙️ CẤU HÌNH CHÍNH
│   ├── drive.js        # Google Drive API
│   ├── bib.js          # BIB Detection Engine
│   └── app.js          # App Controller
├── bib-index.json      # Index BIB (tạo bởi bib-indexer.js)
├── bib-indexer.js      # Script tạo BIB index
└── .github/workflows/
    └── deploy.yml      # Auto-deploy to GitHub Pages
```

---

## 🏷️ Format BIB

| Giới tính | Format | Ví dụ |
|-----------|--------|-------|
| Nữ | `F` + 3 chữ số | F001, F023, F999 |
| Nam | `M` + 3 chữ số | M001, M023, M999 |

---

## 🔍 Cơ Chế Tìm BIB

1. **Index file** (nhanh nhất): Tìm trong `bib-index.json` được build sẵn
2. **Filename search** (fallback): Quét tên file theo regex `[FM]\d{3,4}`
3. **Fuzzy match**: Normalize input (f1 → F001, m23 → M023)

---

## 🛠️ Cập Nhật Ảnh

```bash
# Thêm ảnh mới vào Drive → chạy lại indexer
node bib-indexer.js

# Commit & push → tự động deploy
git add bib-index.json
git commit -m "Update photos $(date +%Y-%m-%d)"
git push
```

---

## 📝 Lưu Ý

- API Key Google Drive chỉ cần **Drive API**, không cần OAuth
- Thư mục Drive phải ở chế độ **"Anyone with the link"**
- File `service-account.json` (cho indexer) **KHÔNG commit** lên GitHub
- Thêm vào `.gitignore`: `service-account.json`, `node_modules/`

---

*Built with ❤️ for race organizers · Race Photo Finder*
