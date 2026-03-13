// =============================================
// js/kas.js — Manajemen Kas RT
// =============================================

/**
 * Load data kas dari Supabase.
 *
 * FIX: Sekarang ada filter bulan & tahun, serta filter jenis.
 * Summary (Total Masuk/Keluar/Saldo) dihitung dari data yang
 * sudah difilter — mengikuti pilihan filter yang aktif.
 */
async function loadKas() {
  const jenis  = document.getElementById('filter-kas-jenis').value;
  const bulan  = parseInt(document.getElementById('filter-bulan-kas').value);
  const tahun  = parseInt(document.getElementById('filter-tahun-kas').value);

  // Hitung range tanggal awal & akhir bulan yang dipilih
  const tglAwal  = `${tahun}-${String(bulan).padStart(2, '0')}-01`;
  const tglAkhir = new Date(tahun, bulan, 0).toISOString().slice(0, 10); // hari terakhir bulan

  let query = db.from('kas').select('*')
    .gte('tanggal', tglAwal)
    .lte('tanggal', tglAkhir)
    .order('tanggal', { ascending: false });

  if (jenis) query = query.eq('jenis', jenis);

  const { data, error } = await query;
  if (error) { showToast('Gagal memuat data kas', 'error'); return; }

  allKasData = data || [];

  // Summary mengikuti data yang sudah difilter
  const totalMasuk  = allKasData.filter(k => k.jenis === 'masuk').reduce((s, k) => s + k.nominal, 0);
  const totalKeluar = allKasData.filter(k => k.jenis === 'keluar').reduce((s, k) => s + k.nominal, 0);

  document.getElementById('kas-masuk-total').textContent = rp(totalMasuk);
  document.getElementById('kas-keluar-total').textContent = rp(totalKeluar);
  document.getElementById('kas-saldo').textContent = rp(totalMasuk - totalKeluar);

  renderKas(allKasData);
}

/** Render tabel riwayat kas */
function renderKas(data) {
  const isAdmin = currentUser === 'admin';
  const tbody = document.getElementById('tabel-kas');

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">💸</div>Belum ada transaksi pada periode ini</div></td></tr>';
    return;
  }

  tbody.innerHTML = data.map(k => `
    <tr>
      <td style="font-size:12px;white-space:nowrap;">${fmtDate(k.tanggal)}</td>
      <td>
        ${k.keterangan}
        <br><span style="font-size:11px;color:#aaa;">${k.kategori}</span>
      </td>
      <td><span class="badge ${k.jenis === 'masuk' ? 'badge-success' : 'badge-danger'}">${k.jenis}</span></td>
      <td style="white-space:nowrap;font-weight:600;color:${k.jenis === 'masuk' ? '#2E7D32' : '#C62828'}">
        ${rp(k.nominal)}
      </td>
      ${isAdmin ? `
        <td onclick="event.stopPropagation()">
          <div class="flex-row">
            <button class="btn btn-warning btn-sm" onclick="showModalEditKas('${k.id}')">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteKas('${k.id}')">🗑️</button>
          </div>
        </td>` : ''}
    </tr>`).join('');
}

/** Tampilkan modal tambah transaksi kas */
function showModalKas() {
  editKasId = null;
  document.getElementById('modal-kas-title').textContent = 'Tambah Transaksi';
  document.getElementById('form-kas').reset();
  document.getElementById('k-id').value = '';
  document.getElementById('k-tanggal').value = new Date().toISOString().slice(0, 10);
  openModal('modal-kas');
}

/** Tampilkan modal edit transaksi kas */
function showModalEditKas(id) {
  const k = allKasData.find(k => k.id === id);
  if (!k) return;
  editKasId = id;
  document.getElementById('modal-kas-title').textContent = 'Edit Transaksi';
  document.getElementById('k-id').value = id;
  document.getElementById('k-tanggal').value = k.tanggal;
  document.getElementById('k-jenis').value = k.jenis;
  document.getElementById('k-nominal').value = k.nominal;
  document.getElementById('k-ket').value = k.keterangan;
  document.getElementById('k-kategori').value = k.kategori || 'lainnya';
  openModal('modal-kas');
}

/** Simpan transaksi kas (tambah/edit) */
async function saveKas(e) {
  e.preventDefault();
  const id = document.getElementById('k-id').value;
  const payload = {
    tanggal:     document.getElementById('k-tanggal').value,
    jenis:       document.getElementById('k-jenis').value,
    nominal:     parseInt(document.getElementById('k-nominal').value),
    keterangan:  document.getElementById('k-ket').value,
    kategori:    document.getElementById('k-kategori').value
  };

  let err;
  if (id) {
    const r = await db.from('kas').update(payload).eq('id', id);
    err = r.error;
  } else {
    const r = await db.from('kas').insert(payload);
    err = r.error;
  }

  if (err) { showToast('Gagal: ' + err.message, 'error'); return; }

  showToast('Kas disimpan!');
  closeModal('modal-kas');
  document.getElementById('form-kas').reset();
  logAktivitas(id ? 'Edit Kas' : 'Tambah Kas', payload.keterangan);

  // Sinkronisasi: reload kas dan dashboard
  loadKas();
  loadDashboard();
}

/** Hapus transaksi kas */
async function deleteKas(id) {
  if (!confirm('Hapus transaksi ini?')) return;
  const { error } = await db.from('kas').delete().eq('id', id);
  if (error) { showToast('Gagal hapus!', 'error'); return; }

  showToast('Transaksi dihapus!');
  logAktivitas('Hapus Kas', id);

  // Sinkronisasi: reload kas dan dashboard
  loadKas();
  loadDashboard();
}

// =============================================
// EXPORT
// =============================================

/** Export laporan kas ke PDF */
function exportKasPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const bulan  = document.getElementById('filter-bulan-kas').options[document.getElementById('filter-bulan-kas').selectedIndex].text;
  const tahun  = document.getElementById('filter-tahun-kas').value;

  doc.setFontSize(16);
  doc.text(`Laporan Kas RT — ${bulan} ${tahun}`, 14, 20);
  doc.setFontSize(11);

  let y = 35;
  doc.text('Tanggal', 14, y);
  doc.text('Keterangan', 50, y);
  doc.text('Jenis', 120, y);
  doc.text('Nominal', 155, y);
  y += 6;
  doc.line(14, y, 196, y);
  y += 4;

  allKasData.forEach(k => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(fmtDate(k.tanggal), 14, y);
    doc.text(k.keterangan.substring(0, 35), 50, y);
    doc.text(k.jenis, 120, y);
    doc.text(rp(k.nominal), 155, y);
    y += 7;
  });

  doc.save(`laporan-kas-rt-${bulan}-${tahun}.pdf`);
  showToast('PDF berhasil diunduh!');
}

/** Export laporan kas ke Excel */
function exportKasExcel() {
  const bulan = document.getElementById('filter-bulan-kas').options[document.getElementById('filter-bulan-kas').selectedIndex].text;
  const tahun = document.getElementById('filter-tahun-kas').value;

  const rows = allKasData.map(k => ({
    Tanggal:     fmtDate(k.tanggal),
    Keterangan:  k.keterangan,
    Kategori:    k.kategori,
    Jenis:       k.jenis,
    Nominal:     k.nominal
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kas RT');
  XLSX.writeFile(wb, `laporan-kas-rt-${bulan}-${tahun}.xlsx`);
  showToast('Excel berhasil diunduh!');
}
