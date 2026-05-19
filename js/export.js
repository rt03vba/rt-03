import { state } from './state.js';
import { rp, fmtDate, showToast } from './utils.js';

export function exportKasPDF() {
  const { jsPDF } = window.jspdf;

  // Ambil filter aktif dari DOM
  const bulanEl = document.getElementById('filter-kas-bulan');
  const tahunEl = document.getElementById('filter-kas-tahun');
  const bulanVal = bulanEl?.value?.trim() || '';
  const tahunVal = tahunEl?.value?.trim() || '';

  const bulanNama = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const bulanIdx  = bulanVal ? parseInt(bulanVal) : 0;
  const periodeLabel = bulanVal && tahunVal
    ? `${bulanNama[bulanIdx]} ${tahunVal}`
    : bulanVal ? `${bulanNama[bulanIdx]}`
    : tahunVal ? `Tahun ${tahunVal}` : 'Semua Periode';

  // Nama file PDF
  const namaFile = bulanVal && tahunVal
    ? `laporan-kas-${bulanNama[bulanIdx]}-${tahunVal}.pdf`
    : bulanVal ? `laporan-kas-${bulanNama[bulanIdx]}.pdf`
    : tahunVal ? `laporan-kas-${tahunVal}.pdf`
    : `laporan-kas-semua.pdf`;

  // Filter data — sama persis dengan applyFilterKas di app.js
  let data = state.allKasData || [];
  if (bulanVal) data = data.filter(k => k.tanggal && k.tanggal.slice(5, 7) === bulanVal.padStart(2, '0'));
  if (tahunVal) data = data.filter(k => k.tanggal && k.tanggal.slice(0, 4) === tahunVal);

  // Pisahkan data ke 3 kategori
  const iuranMasuk  = data.filter(k => k.jenis === 'masuk' && k.created_by === 'auto');
  const manualMasuk = data.filter(k => k.jenis === 'masuk' && k.created_by !== 'auto');
  const manualKeluar= data.filter(k => k.jenis === 'keluar' && k.created_by !== 'auto');
  const akomodasiData = data.filter(k => k.jenis === 'keluar' && k.created_by === 'auto');

  // Hitung total akomodasi (grouping per nominal)
  const akomodasiGroups = {};
  akomodasiData.forEach(k => {
    const key = k.nominal;
    if (!akomodasiGroups[key]) akomodasiGroups[key] = { count: 0, total: 0, nominal: k.nominal };
    akomodasiGroups[key].count++;
    akomodasiGroups[key].total += k.nominal;
  });

  // Totals
  const totalIuran   = iuranMasuk.reduce((s, k) => s + k.nominal, 0);
  const totalManMasuk= manualMasuk.reduce((s, k) => s + k.nominal, 0);
  const totalManKeluar= manualKeluar.reduce((s, k) => s + k.nominal, 0);
  const totalAkomodasi= akomodasiData.reduce((s, k) => s + k.nominal, 0);
  const totalMasuk   = totalIuran + totalManMasuk;
  const totalKeluar  = totalManKeluar + totalAkomodasi;
  const saldo        = totalMasuk - totalKeluar;

  // Setup jsPDF A4 portrait
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const W = 210, mx = 14, cW = W - mx * 2;
  let y = 0;
  const now = new Date();
  const tglCetak = now.toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });

  // ─── Helper functions ───────────────────────────────────────
  const checkPage = (needed = 12) => {
    if (y + needed > 275) { doc.addPage(); y = 16; }
  };

  const sectionTitle = (label, r, g, b) => {
    checkPage(10);
    doc.setFillColor(r, g, b);
    doc.rect(mx, y, cW, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(label, mx + 3, y + 4.8);
    y += 7;
  };

  const tableHeader = (cols) => {
    checkPage(8);
    doc.setFillColor(240, 246, 255);
    doc.rect(mx, y, cW, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(21, 101, 192);
    cols.forEach(c => {
      if (c.align === 'right') doc.text(c.text, c.x + c.w, y + 4.5, { align: 'right' });
      else doc.text(c.text, c.x, y + 4.5);
    });
    y += 6.5;
    doc.setDrawColor(191, 219, 254);
    doc.line(mx, y, mx + cW, y);
  };

  const tableRow = (cols, isEven, isAkd = false) => {
    checkPage(8);
    if (isAkd) doc.setFillColor(255, 251, 235);
    else if (isEven) doc.setFillColor(248, 250, 252);
    else doc.setFillColor(255, 255, 255);
    doc.rect(mx, y, cW, 6.5, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    cols.forEach(c => {
      const txt = String(c.text || '');
      if (c.align === 'right') doc.text(txt, c.x + c.w, y + 4.5, { align: 'right' });
      else {
        // truncate jika kepanjangan
        const maxW = c.w - 2;
        const truncated = doc.getTextWidth(txt) > maxW
          ? txt.substring(0, Math.floor(txt.length * maxW / doc.getTextWidth(txt))) + '…'
          : txt;
        doc.text(truncated, c.x, y + 4.5);
      }
    });
    doc.setDrawColor(226, 232, 240);
    doc.line(mx, y + 6.5, mx + cW, y + 6.5);
    y += 6.5;
  };

  const totalRow = (label, nominal, r, g, b) => {
    checkPage(8);
    doc.setFillColor(r, g, b);
    doc.rect(mx, y, cW, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(r === 240 ? 21 : r, r === 240 ? 101 : g, r === 240 ? 192 : b);
    if (r === 240) doc.setTextColor(21, 101, 192);
    else if (r === 240 && g === 253) doc.setTextColor(21, 128, 61);
    doc.text(label, mx + cW - 3, y + 5, { align: 'right' });
    doc.text(rp(nominal), mx + cW - 3, y + 5, { align: 'right' });
    // label kiri, nominal kanan
    doc.setTextColor(80, 80, 80);
    doc.text(label, mx + 3, y + 5);
    doc.setTextColor(r < 100 ? 21 : (g > 200 ? 21 : 185), r < 100 ? 101 : (g > 200 ? 128 : 28), r < 100 ? 192 : (g > 200 ? 61 : 28));
    doc.text(rp(nominal), mx + cW - 3, y + 5, { align: 'right' });
    y += 7;
  };

  // ─── HEADER ─────────────────────────────────────────────────
  doc.setFillColor(21, 101, 192);
  doc.rect(0, 0, W, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('LAPORAN KAS RT 03 RW 12', mx, 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Villa Bintaro Asri, Kel. Baratan, Kec. Patrang, Kab. Jember', mx, 15.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Periode: ${periodeLabel}`, W - mx, 10, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Dicetak: ${tglCetak}`, W - mx, 15.5, { align: 'right' });
  y = 28;

  // ─── BAGIAN 1: IURAN MASUK ──────────────────────────────────
  sectionTitle(`💰  Dana Masuk — Iuran Warga  (${iuranMasuk.length} warga)`, 21, 101, 192);

  // Kolom: No(8) | Tanggal(28) | Nama(65) | Blok(25) | Nominal(28)
  const C1 = [
    { text: 'No',      x: mx,      w: 8,  align: 'left' },
    { text: 'Tanggal', x: mx+8,    w: 28, align: 'left' },
    { text: 'Nama Warga', x: mx+36, w: 62, align: 'left' },
    { text: 'Blok',    x: mx+98,   w: 24, align: 'left' },
    { text: 'Nominal', x: mx+122,  w: cW-122, align: 'right' },
  ];
  tableHeader(C1);

  iuranMasuk.forEach((k, i) => {
    // Ambil nama dari keterangan: "Iuran Mei 2026 - NamaWarga"
    const namaMatch = k.keterangan.match(/- (.+)$/);
    const nama = namaMatch ? namaMatch[1] : k.keterangan;
    const blok = k.blok_warga || '—';
    tableRow([
      { text: String(i+1),        x: mx,      w: 8,  align: 'left' },
      { text: fmtDate(k.tanggal), x: mx+8,    w: 28, align: 'left' },
      { text: nama,               x: mx+36,   w: 62, align: 'left' },
      { text: blok,               x: mx+98,   w: 24, align: 'left' },
      { text: rp(k.nominal),      x: mx+122,  w: cW-122, align: 'right' },
    ], i % 2 === 1);
  });

  if (iuranMasuk.length === 0) {
    tableRow([{ text: '— Tidak ada data —', x: mx+3, w: cW }], false);
  }

  // Total iuran
  checkPage(8);
  doc.setFillColor(219, 234, 254);
  doc.rect(mx, y, cW, 7, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(21, 101, 192);
  doc.text('Total Masuk Iuran', mx + 3, y + 5);
  doc.text(rp(totalIuran), mx + cW - 3, y + 5, { align: 'right' });
  y += 10;

  // ─── BAGIAN 2: PEMASUKAN MANUAL ─────────────────────────────
  sectionTitle(`➕  Pemasukan Lain — Manual  (${manualMasuk.length} transaksi)`, 21, 128, 61);

  const C2 = [
    { text: 'No',          x: mx,     w: 8,  align: 'left' },
    { text: 'Tanggal',     x: mx+8,   w: 28, align: 'left' },
    { text: 'Keterangan',  x: mx+36,  w: 86, align: 'left' },
    { text: 'Nominal',     x: mx+122, w: cW-122, align: 'right' },
  ];
  tableHeader(C2);

  manualMasuk.forEach((k, i) => {
    tableRow([
      { text: String(i+1),        x: mx,     w: 8,  align: 'left' },
      { text: fmtDate(k.tanggal), x: mx+8,   w: 28, align: 'left' },
      { text: k.keterangan,       x: mx+36,  w: 86, align: 'left' },
      { text: rp(k.nominal),      x: mx+122, w: cW-122, align: 'right' },
    ], i % 2 === 1);
  });

  if (manualMasuk.length === 0) {
    tableRow([{ text: '— Tidak ada pemasukan manual —', x: mx+3, w: cW }], false);
  }

  checkPage(8);
  doc.setFillColor(187, 247, 208);
  doc.rect(mx, y, cW, 7, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(21, 128, 61);
  doc.text('Total Pemasukan Lain', mx + 3, y + 5);
  doc.text(rp(totalManMasuk), mx + cW - 3, y + 5, { align: 'right' });
  y += 10;

  // ─── BAGIAN 3: PENGELUARAN ──────────────────────────────────
  sectionTitle(`📤  Pengeluaran  (${manualKeluar.length} manual + ${akomodasiData.length} akomodasi)`, 185, 28, 28);

  const C3 = [
    { text: 'No',         x: mx,     w: 8,  align: 'left' },
    { text: 'Tanggal',    x: mx+8,   w: 28, align: 'left' },
    { text: 'Keterangan', x: mx+36,  w: 86, align: 'left' },
    { text: 'Nominal',    x: mx+122, w: cW-122, align: 'right' },
  ];
  tableHeader(C3);

  // Pengeluaran manual dulu
  manualKeluar.forEach((k, i) => {
    tableRow([
      { text: String(i+1),        x: mx,     w: 8,  align: 'left' },
      { text: fmtDate(k.tanggal), x: mx+8,   w: 28, align: 'left' },
      { text: k.keterangan,       x: mx+36,  w: 86, align: 'left' },
      { text: rp(k.nominal),      x: mx+122, w: cW-122, align: 'right' },
    ], i % 2 === 1);
  });

  if (manualKeluar.length === 0) {
    tableRow([{ text: '— Tidak ada pengeluaran manual —', x: mx+3, w: cW }], false);
  }

  // Akomodasi: 1 baris per nominal group
  const baseIdx = manualKeluar.length;
  Object.values(akomodasiGroups).forEach((g, i) => {
    const label = `Akomodasi warga (sampah, keamanan, rukem) — ${g.count} warga × ${rp(g.nominal)}`;
    tableRow([
      { text: String(baseIdx + i + 1), x: mx,     w: 8,  align: 'left' },
      { text: periodeLabel,            x: mx+8,   w: 28, align: 'left' },
      { text: label,                   x: mx+36,  w: 86, align: 'left' },
      { text: rp(g.total),             x: mx+122, w: cW-122, align: 'right' },
    ], (baseIdx + i) % 2 === 1, true);
  });

  if (akomodasiData.length === 0 && manualKeluar.length === 0) {
    tableRow([{ text: '— Tidak ada pengeluaran —', x: mx+3, w: cW }], false);
  }

  checkPage(8);
  doc.setFillColor(254, 202, 202);
  doc.rect(mx, y, cW, 7, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(185, 28, 28);
  doc.text('Total Pengeluaran', mx + 3, y + 5);
  doc.text(rp(totalKeluar), mx + cW - 3, y + 5, { align: 'right' });
  y += 10;

  // ─── BAGIAN 4: RINGKASAN ────────────────────────────────────
  sectionTitle('📊  Ringkasan Keuangan', 55, 65, 81);
  checkPage(30);

  const bW = (cW - 6) / 3;
  const cards = [
    { label: 'Total Dana Masuk', sub: `Iuran: ${rp(totalIuran)}\nLain: ${rp(totalManMasuk)}`, val: rp(totalMasuk), r:21, g:128, b:61, fr:240, fg:253, fb:244 },
    { label: 'Total Pengeluaran', sub: `Manual: ${rp(totalManKeluar)}\nAkomodasi: ${rp(totalAkomodasi)}`, val: rp(totalKeluar), r:185, g:28, b:28, fr:254, fg:242, fb:242 },
    { label: 'Sisa Saldo', sub: `Per akhir ${periodeLabel}`, val: rp(saldo), r:21, g:101, b:192, fr:239, fg:246, fb:255 },
  ];

  cards.forEach((c, i) => {
    const cx = mx + i * (bW + 3);
    doc.setFillColor(c.fr, c.fg, c.fb);
    doc.roundedRect(cx, y, bW, 22, 2, 2, 'F');
    doc.setDrawColor(c.r, c.g, c.b);
    doc.setLineWidth(0.4);
    doc.roundedRect(cx, y, bW, 22, 2, 2, 'S');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(80,80,80);
    doc.text(c.label, cx + bW/2, y + 5, { align: 'center' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(c.r, c.g, c.b);
    doc.text(c.val, cx + bW/2, y + 12, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    c.sub.split('\n').forEach((line, li) => {
      doc.text(line, cx + bW/2, y + 16.5 + li * 3.5, { align: 'center' });
    });
  });
  y += 26;

  // ─── FOOTER ─────────────────────────────────────────────────
  checkPage(20);
  doc.setDrawColor(226, 232, 240);
  doc.line(mx, y, mx + cW, y);
  y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(148, 163, 184);
  doc.text('RT 03 RW 12 Villa Bintaro Asri', mx, y);
  doc.text('Dokumen digenerate otomatis oleh RT 03 App', mx, y + 4);

  // TTD kanan
  doc.setTextColor(100, 100, 100);
  doc.text('Ketua RT 03', mx + cW - 30, y, { align: 'center' });
  doc.line(mx + cW - 50, y + 14, mx + cW, y + 14);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(30, 41, 59);
  doc.text('Andilhika', mx + cW - 25, y + 18, { align: 'center' });

  doc.save(namaFile);
  showToast('PDF berhasil diunduh!');
}

export function exportKasExcel() {
  const rows = state.allKasData.map(k => ({
    Tanggal: fmtDate(k.tanggal),
    Keterangan: k.keterangan,
    Kategori: k.kategori,
    Jenis: k.jenis,
    Nominal: k.nominal
  }));
  
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kas RT');
  XLSX.writeFile(wb, `laporan-kas-rt-semua.xlsx`);
  showToast('Excel berhasil diunduh!');
}

export async function downloadBuktiPDF() {
  if (!state.currentBuktiData) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' });
  const { warga, iuran, noBukti, tglBayar, nominal, bulanLabel } = state.currentBuktiData;

  const W = 148, mx = 15;
  let y = 18;

  // Header
  doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(21, 101, 192);
  doc.text('Bukti Pembayaran Iuran Warga', W / 2, y, { align: 'center' }); y += 7;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
  doc.text('RT 03 RW 12 Villa Bintaro Asri', W / 2, y, { align: 'center' }); y += 5;
  doc.setDrawColor(21, 101, 192); doc.setLineWidth(0.5); doc.line(mx, y, W - mx, y); y += 7;

  // Info warga
  doc.setTextColor(0, 0, 0); doc.setFontSize(10);
  const rows = [
    ['No. Bukti', noBukti],
    ['Nama Warga', warga.nama_kk],
    ['No. Rumah', `Blok ${warga.blok}-${warga.nomor_rumah}`],
    ['Tanggal Bayar', tglBayar],
  ];
  rows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal'); doc.text(label, mx, y);
    doc.setFont('helvetica', 'bold'); doc.text(val, W - mx, y, { align: 'right' });
    y += 7;
  });
  y += 3;

  // Tabel
  doc.setFillColor(227, 242, 253); doc.rect(mx, y, W - mx * 2, 8, 'F');
  doc.setFont('helvetica', 'bold'); doc.setTextColor(21, 101, 192); doc.setFontSize(10);
  doc.text('Bulan', mx + 3, y + 5.5);
  doc.text('Nominal', W - mx - 3, y + 5.5, { align: 'right' }); y += 8;
  doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal');
  doc.text(bulanLabel, mx + 3, y + 5.5);
  doc.text(nominal, W - mx - 3, y + 5.5, { align: 'right' });
  doc.setDrawColor(200, 200, 200); doc.line(mx, y + 8, W - mx, y + 8); y += 8;
  doc.setFillColor(245, 245, 245); doc.rect(mx, y, W - mx * 2, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Total', mx + 3, y + 5.5);
  doc.text(nominal, W - mx - 3, y + 5.5, { align: 'right' }); y += 14;

  // Status
  doc.setTextColor(46, 125, 50); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('✓ Pembayaran Diterima', W / 2, y, { align: 'center' }); y += 10;

  // Penerima
  doc.setTextColor(0, 0, 0); doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text('Diterima oleh', mx, y);
  doc.setFont('helvetica', 'bold'); doc.text('Bendahara RT 03', W - mx, y, { align: 'right' }); y += 10;
  doc.setDrawColor(220, 220, 220); doc.line(mx, y, W - mx, y); y += 8;

  // Footer
  doc.setFontSize(8); doc.setTextColor(100, 100, 100); doc.setFont('helvetica', 'normal');
  doc.text('Terima kasih atas partisipasi Anda dalam iuran bulanan warga.', W / 2, y, { align: 'center' }); y += 5;
  doc.text('Simpan bukti ini sebagai arsip pribadi.', W / 2, y, { align: 'center' }); y += 7;
  doc.setTextColor(21, 101, 192); doc.setFont('helvetica', 'bolditalic');
  doc.text('Mari kita ciptakan lingkungan Villa Bintaro Asri', W / 2, y, { align: 'center' }); y += 5;
  doc.text('yang aman, nyaman, tenteram, dan harmonis', W / 2, y, { align: 'center' });

  doc.save(`bukti-iuran-${warga.blok}${warga.nomor_rumah}-${bulanLabel.replace(' ', '-')}.pdf`);
  showToast('PDF berhasil diunduh!');
}
