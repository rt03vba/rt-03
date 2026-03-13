// =============================================
// js/pengumuman.js — Pengumuman & Kegiatan RT
// =============================================

// ===== PENGUMUMAN =====

/** Load dan render daftar pengumuman aktif */
async function loadPengumuman() {
  const { data } = await db.from('pengumuman').select('*')
    .eq('aktif', true)
    .order('created_at', { ascending: false })
    .limit(5);

  const el = document.getElementById('list-pengumuman');
  if (!data || data.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><div>Belum ada pengumuman</div></div>';
    return;
  }

  const priColor = { normal: 'badge-info', penting: 'badge-warning', urgent: 'badge-danger' };
  el.innerHTML = data.map(p => `
    <div style="padding:12px 0;border-bottom:1px solid #F0F0F0;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span class="badge ${priColor[p.prioritas] || 'badge-info'}">${p.prioritas.toUpperCase()}</span>
        <span style="font-weight:700;font-size:14px;">${p.judul}</span>
        ${currentUser === 'admin'
          ? `<button onclick="deletePengumuman('${p.id}')" style="margin-left:auto;background:none;border:none;color:#E53935;cursor:pointer;font-size:12px;">🗑️</button>`
          : ''}
      </div>
      <div style="font-size:13px;color:#555;line-height:1.5;">${p.isi}</div>
      <div style="font-size:11px;color:#aaa;margin-top:4px;">${fmtDate(p.created_at)}</div>
    </div>`).join('');
}

/** Tampilkan modal tambah pengumuman */
function showModalPengumuman() {
  document.getElementById('form-pengumuman').reset();
  document.getElementById('p-id').value = '';
  openModal('modal-pengumuman');
}

/** Simpan pengumuman (tambah/edit) */
async function savePengumuman(e) {
  e.preventDefault();
  const id = document.getElementById('p-id').value;
  const payload = {
    judul: document.getElementById('p-judul').value,
    isi: document.getElementById('p-isi').value,
    prioritas: document.getElementById('p-prioritas').value
  };

  const r = id
    ? await db.from('pengumuman').update(payload).eq('id', id)
    : await db.from('pengumuman').insert(payload);

  if (r.error) { showToast('Gagal!', 'error'); return; }
  showToast('Pengumuman disimpan!');
  closeModal('modal-pengumuman');
  document.getElementById('form-pengumuman').reset();
  loadPengumuman();
}

/** Hapus pengumuman */
async function deletePengumuman(id) {
  if (!confirm('Hapus pengumuman?')) return;
  await db.from('pengumuman').delete().eq('id', id);
  showToast('Pengumuman dihapus!');
  loadPengumuman();
}

// ===== KEGIATAN =====

/** Load dan render kegiatan mendatang */
async function loadKegiatan() {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db.from('kegiatan').select('*')
    .gte('tanggal', today)
    .order('tanggal')
    .limit(5);

  const el = document.getElementById('list-kegiatan');
  if (!data || data.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><div>Belum ada kegiatan</div></div>';
    return;
  }

  el.innerHTML = data.map(k => `
    <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #F0F0F0;align-items:center;">
      <div style="background:var(--primary-light);color:var(--primary);padding:8px 10px;border-radius:10px;text-align:center;min-width:48px;">
        <div style="font-size:16px;font-weight:800;">${new Date(k.tanggal).getDate()}</div>
        <div style="font-size:10px;">${new Date(k.tanggal).toLocaleDateString('id-ID', { month: 'short' })}</div>
      </div>
      <div style="flex:1;">
        <div style="font-weight:700;font-size:14px;">${k.nama}</div>
        <div style="font-size:12px;color:#777;">${k.waktu || ''} ${k.lokasi ? '· ' + k.lokasi : ''}</div>
      </div>
      ${currentUser === 'admin'
        ? `<button onclick="deleteKegiatan('${k.id}')" style="background:none;border:none;color:#E53935;cursor:pointer;">🗑️</button>`
        : ''}
    </div>`).join('');
}

/** Tampilkan modal tambah kegiatan */
function showModalKegiatan() {
  document.getElementById('form-kegiatan').reset();
  document.getElementById('kg-id').value = '';
  openModal('modal-kegiatan');
}

/** Simpan kegiatan (tambah/edit) */
async function saveKegiatan(e) {
  e.preventDefault();
  const id = document.getElementById('kg-id').value;
  const payload = {
    nama: document.getElementById('kg-nama').value,
    tanggal: document.getElementById('kg-tanggal').value,
    waktu: document.getElementById('kg-waktu').value || null,
    lokasi: document.getElementById('kg-lokasi').value,
    deskripsi: document.getElementById('kg-deskripsi').value
  };

  const r = id
    ? await db.from('kegiatan').update(payload).eq('id', id)
    : await db.from('kegiatan').insert(payload);

  if (r.error) { showToast('Gagal!', 'error'); return; }
  showToast('Kegiatan disimpan!');
  closeModal('modal-kegiatan');
  document.getElementById('form-kegiatan').reset();
  loadKegiatan();
}

/** Hapus kegiatan */
async function deleteKegiatan(id) {
  if (!confirm('Hapus kegiatan?')) return;
  await db.from('kegiatan').delete().eq('id', id);
  showToast('Kegiatan dihapus!');
  loadKegiatan();
}

// Expose ke global
window.loadPengumuman    = loadPengumuman;
window.showModalPengumuman = showModalPengumuman;
window.savePengumuman    = savePengumuman;
window.deletePengumuman  = deletePengumuman;
window.loadKegiatan      = loadKegiatan;
window.showModalKegiatan = showModalKegiatan;
window.saveKegiatan      = saveKegiatan;
window.deleteKegiatan    = deleteKegiatan;
