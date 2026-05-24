#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 *  BIB INDEXER — Tạo file bib-index.json từ Google Drive
 *  Chạy offline, đẩy lên GitHub cùng code
 * ═══════════════════════════════════════════════════════════════
 *
 *  CÁCH DÙNG:
 *    1. npm install googleapis
 *    2. Tạo Service Account trên Google Cloud Console
 *    3. Share thư mục Drive với email Service Account
 *    4. Điền thông tin vào phần CONFIG bên dưới
 *    5. Chạy: node bib-indexer.js
 *
 *  OUTPUT: bib-index.json
 *  Format: { "F001": ["fileId1", "fileId2"], "M023": ["fileId3"] }
 *
 *  ĐẶC ĐIỂM QUÉT BIB THÔNG MINH:
 *  - Quét tên file: F001_DSC1234.jpg → BIB F001
 *  - Hỗ trợ nhiều BIB trong 1 tên file
 *  - Normalize: f1 → F001, m023 → M023
 *  - Log chi tiết quá trình index
 * ═══════════════════════════════════════════════════════════════
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// ───────────────── CONFIG ─────────────────────
const CONFIG = {
  // Service Account credentials JSON (download từ Google Cloud Console)
  CREDENTIALS_FILE: './service-account.json',

  // Các folder ID cần index (lấy từ URL Google Drive)
  FOLDERS: {
    flycam:   'YOUR_FLYCAM_FOLDER_ID',
    khaimac:  'YOUR_KHAIMAC_FOLDER_ID',
    traogiai: 'YOUR_TRAOGIAI_FOLDER_ID',
    lienhoan: 'YOUR_LIENHOAN_FOLDER_ID',
  },

  // File output
  OUTPUT: './bib-index.json',

  // Regex tìm BIB trong tên file
  BIB_REGEX: /\b([FM])(\d{3,4})\b/gi,
};
// ──────────────────────────────────────────────

function normalizeBib(gender, num) {
  return `${gender.toUpperCase()}${String(parseInt(num)).padStart(3, '0')}`;
}

function extractBibsFromName(filename) {
  const bibs = new Set();
  const name = filename.toUpperCase();
  const re = /\b([FM])(\d{3,4})\b/g;
  let m;
  while ((m = re.exec(name)) !== null) {
    bibs.add(normalizeBib(m[1], m[2]));
  }
  return [...bibs];
}

async function listAllFiles(drive, folderId, tabName) {
  const files = [];
  let pageToken = null;
  let page = 0;

  do {
    page++;
    process.stdout.write(`\r  [${tabName}] Đang quét trang ${page}... (${files.length} files)`);

    const res = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: 'files(id,name),nextPageToken',
      pageSize: 1000,
      pageToken: pageToken || undefined,
      orderBy: 'name',
    });

    const batch = res.data.files || [];
    files.push(...batch);
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  console.log(`\r  [${tabName}] ✓ ${files.length} ảnh tìm thấy              `);
  return files;
}

async function buildIndex() {
  console.log('\n═══════════════════════════════════════');
  console.log('  RACE PHOTO BIB INDEXER');
  console.log('═══════════════════════════════════════\n');

  // Auth
  let credentials;
  try {
    credentials = JSON.parse(fs.readFileSync(CONFIG.CREDENTIALS_FILE, 'utf8'));
  } catch (e) {
    console.error('✗ Không đọc được file credentials:', CONFIG.CREDENTIALS_FILE);
    console.error('  Tạo Service Account tại: https://console.cloud.google.com/iam-admin/serviceaccounts');
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  const drive = google.drive({ version: 'v3', auth });

  // Build index
  const index = {};
  let totalFiles = 0;
  let totalBibMatches = 0;
  const stats = {};

  for (const [tabName, folderId] of Object.entries(CONFIG.FOLDERS)) {
    if (folderId.startsWith('YOUR_')) {
      console.log(`  [${tabName}] ⚠ Bỏ qua — chưa cấu hình folder ID`);
      continue;
    }

    console.log(`  [${tabName}] Bắt đầu quét...`);

    try {
      const files = await listAllFiles(drive, folderId, tabName);
      totalFiles += files.length;
      let tabMatches = 0;

      for (const file of files) {
        const bibs = extractBibsFromName(file.name);
        for (const bib of bibs) {
          if (!index[bib]) index[bib] = [];
          index[bib].push(file.id);
          tabMatches++;
          totalBibMatches++;
        }
      }

      stats[tabName] = { files: files.length, matches: tabMatches };
    } catch (e) {
      console.error(`  [${tabName}] ✗ Lỗi:`, e.message);
    }
  }

  // Sort index keys
  const sorted = Object.fromEntries(
    Object.entries(index).sort(([a], [b]) => a.localeCompare(b))
  );

  // Write output
  const output = {
    _meta: {
      generated: new Date().toISOString(),
      totalFiles,
      totalBibMatches,
      stats,
    },
    ...sorted,
  };

  fs.writeFileSync(CONFIG.OUTPUT, JSON.stringify(sorted, null, 2));

  // Summary
  console.log('\n═══════════════════════════════════════');
  console.log('  KẾT QUẢ INDEX');
  console.log('═══════════════════════════════════════');
  console.log(`  📁 Tổng ảnh quét: ${totalFiles.toLocaleString()}`);
  console.log(`  🏷️  BIB duy nhất: ${Object.keys(sorted).length.toLocaleString()}`);
  console.log(`  🔗 BIB mappings: ${totalBibMatches.toLocaleString()}`);
  console.log(`  📄 File output: ${CONFIG.OUTPUT}`);
  console.log('\n  Tabs:');
  for (const [tab, s] of Object.entries(stats)) {
    console.log(`    ${TAB_EMOJI[tab] || ''} ${tab}: ${s.files} ảnh, ${s.matches} BIB matches`);
  }

  // Sample output
  const sample = Object.entries(sorted).slice(0, 5);
  if (sample.length > 0) {
    console.log('\n  Mẫu index:');
    for (const [bib, ids] of sample) {
      console.log(`    ${bib}: ${ids.length} ảnh`);
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log('  ✓ Hoàn thành! Commit bib-index.json lên GitHub.');
  console.log('═══════════════════════════════════════\n');
}

const TAB_EMOJI = { flycam: '🚁', khaimac: '🎬', traogiai: '🏆', lienhoan: '🎉' };

buildIndex().catch(e => {
  console.error('✗ Lỗi không mong đợi:', e);
  process.exit(1);
});
