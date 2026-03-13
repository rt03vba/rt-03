// =============================================
// js/iuran.js — Manajemen Iuran Warga
// =============================================

/** Load data iuran berdasarkan filter bulan & tahun */
async function loadIuran() {
  const bulan = parseInt(document.getElementById('filter-bulan-iuran').value);
  const tahun = parseInt(document.getElementById('filter-tahun-iuran').value);
  const isAdmin = currentUser === 'admin';

  let wargaQuery = db.from('warga').select('*').order('blok').order('nomor_rumah');
  if (!isAdmin) wargaQuery = wargaQuery.eq('id', currentUser.id);

  const [resW, resI] = await Promise.all([
    wargaQuery,
    db.from('iuran').select('*').eq('bulan', bulan).eq('tahun', tahun)
  ]);

  const wargaList = resW.data || [];
  const iuranList = resI.data || [];

  // Gabungkan data warga + iuran bulan tsb
  allIuranData = wargaList.map(w => ({
    ...w,
    iuran: iuranList.find(i => i.warga_id === w.id) || null
  }));

  renderIuran(allIuranData);
}

/** Render tabel iuran */
function renderIuran(data) {
  const isAdmin = currentUser === 'admin';
  const tbody = document.getElementById('tabel-iuran');

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">Tidak ada data</div></td></tr>';
    return;
  }

  tbody.innerHTML = data.map(item => `
    <tr>
      <td><b>Blok ${item.blok}-${item.nomor_rumah}</b></td>
      <td>${item.nama_kk}</td>
      <td>
        ${item.iuran
          ? `<span class="badge ${item.iuran.status === 'lunas' ? 'badge-success' : 'badge-danger'}">${item.iuran.status}</span>`
          : `<span class="badge badge-warning">Belum input</span>`}
      </td>
      <td style="font-size:12px;">${item.iuran ? fmtDate(item.iuran.tgl_bayar) : '-'}</td>
      <td>
        ${isAdmin
          ? `<button class="btn btn-primary btn-sm" onclick="showModalIuran('${item.id}','${item.nama_kk}',${item.iuran ? `'${item.iuran.id}'` : 'null'})">✏️</button>`
          : ''}
      </td>
    </tr>`).join('');
}

/** Filter iuran berdasarkan pencarian */
function filterIuran(q) {
  if (!q) { renderIuran(allIuranData); return; }
  const lq = q.toLowerCase();
  renderIuran(allIuranData.filter(w =>
    w.nama_kk.toLowerCase().includes(lq) || w.blok.toLowerCase().includes(lq)
  ));
}

/** Tampilkan modal update status iuran */
function showModalIuran(wargaId, nama, iuranId) {
  const item = allIuranData.find(w => w.id === wargaId);
  document.getElementById('modal-iuran-nama').textContent = nama;
  document.getElementById('i-warga-id').value = wargaId;
  document.getElementById('i-id').value = iuranId || '';

  if (item && item.iuran) {
    document.getElementById('i-status').value = item.iuran.status;
    document.getElementById('i-nominal').value = item.iuran.nominal || 50000;
    document.getElementById('i-tglbayar').value = item.iuran.tgl_bayar ? item.iuran.tgl_bayar.slice(0, 10) : '';
    document.getElementById('i-ket').value = item.iuran.keterangan || '';
  } else {
    document.getElementById('form-iuran').reset();
    document.getElementById('i-nominal').value = 50000;
    document.getElementById('i-tglbayar').value = new Date().toISOString().slice(0, 10);
  }

  openModal('modal-iuran');
}

/** Simpan status iuran */
async function saveIuran(e) {
  e.preventDefault();
  const iuranId = document.getElementById('i-id').value;
  const wargaId = document.getElementById('i-warga-id').value;
  const bulan = parseInt(document.getElementById('filter-bulan-iuran').value);
  const tahun = parseInt(document.getElementById('filter-tahun-iuran').value);

  const payload = {
    warga_id: wargaId,
    bulan,
    tahun,
    status: document.getElementById('i-status').value,
    nominal: parseInt(document.getElementById('i-nominal').value) || 50000,
    tgl_bayar: document.getElementById('i-tglbayar').value || null,
    keterangan: document.getElementById('i-ket').value
  };

  let err;
  if (iuranId) {
    const r = await db.from('iuran').update(payload).eq('id', iuranId);
    err = r.error;
  } else {
    const r = await db.from('iuran').insert(payload);
    err = r.error;
  }

  if (err) { showToast('Gagal: ' + err.message, 'error'); return; }

  showToast('Status iuran disimpan!');
  closeModal('modal-iuran');
  document.getElementById('form-iuran').reset();
  logAktivitas('Update Iuran', wargaId);

  // Sinkronisasi: reload iuran dan dashboard
  loadIuran();
  loadDashboard();
}

/** Generate data iuran untuk semua warga di bulan/tahun yang dipilih */
async function generateIuranBulanan() {
  const bulan = parseInt(document.getElementById('filter-bulan-iuran').value);
  const tahun = parseInt(document.getElementById('filter-tahun-iuran').value);

  const { data: wargaList } = await db.from('warga').select('id');
  const { data: existing } = await db.from('iuran').select('warga_id').eq('bulan', bulan).eq('tahun', tahun);

  const existingIds = new Set((existing || []).map(i => i.warga_id));
  const toInsert = (wargaList || [])
    .filter(w => !existingIds.has(w.id))
    .map(w => ({ warga_id: w.id, bulan, tahun, status: 'belum', nominal: 50000 }));

  if (toInsert.length === 0) {
    showToast('Semua warga sudah ada data iuran bulan ini', 'info');
    return;
  }

  const { error } = await db.from('iuran').insert(toInsert);
  if (error) { showToast('Gagal generate: ' + error.message, 'error'); return; }

  showToast(`Generate ${toInsert.length} data iuran berhasil!`);
  loadIuran();
  loadDashboard();
}

// Expose ke global
window.loadIuran            = loadIuran;
window.renderIuran          = renderIuran;
window.filterIuran          = filterIuran;
window.showModalIuran       = showModalIuran;
window.saveIuran            = saveIuran;
window.generateIuranBulanan = generateIuranBulanan;
