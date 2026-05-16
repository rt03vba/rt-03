import { state } from './state.js';
import { rp, fmtDate, showToast } from './utils.js';

export function exportKasPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const now = new Date();
  const label = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  
  doc.setFontSize(16);
  doc.text(`Laporan Kas RT — Semua Periode`, 14, 20);
  doc.setFontSize(11);
  let y = 35;
  
  doc.text('Tanggal', 14, y);
  doc.text('Keterangan', 50, y);
  doc.text('Jenis', 120, y);
  doc.text('Nominal', 155, y);
  y += 6;
  doc.line(14, y, 196, y);
  y += 4;
  
  state.allKasData.forEach(k => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(fmtDate(k.tanggal), 14, y);
    doc.text(k.keterangan.substring(0, 35), 50, y);
    doc.text(k.jenis, 120, y);
    doc.text(rp(k.nominal), 155, y);
    y += 7;
  });
  
  doc.save(`laporan-kas-rt-semua.pdf`);
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
