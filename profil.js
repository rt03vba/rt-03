// =============================================
// js/profil.js — Profil & Log Aktivitas
// =============================================

/** Load halaman profil (berbeda untuk admin dan warga) */
async function loadProfil() {
  const isAdmin = currentUser === 'admin';
  const el = document.getElementById('profil-content');

  if (isAdmin) {
    const { count: tw } = await db.from('warga').select('id', { count: 'exact' });
    const { count: tkas } = await db.from('kas').select('id', { count: 'exact' });
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F0F0F0;">
          <span>Role</span><b>👮 Administrator</b>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F0F0F0;">
          <span>Total Warga</span><b>${tw}</b>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;">
          <span>Total Transaksi Kas</span><b>${tkas}</b>
        </div>
      </div>`;
    loadLog();
  } else {
    const w = currentUser;
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F0F0F0;">
          <span>Nama KK</span><b>${w.nama_kk}</b>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F0F0F0;">
          <span>Alamat</span><b>Blok ${w.blok}-${w.nomor_rumah}</b>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F0F0F0;">
          <span>Status</span><b>${w.status_hunian}</b>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F0F0F0;">
          <span>Anggota Keluarga</span><b>${w.jumlah_anggota} orang</b>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;">
          <span>No. HP</span><b>${w.no_hp || '-'}</b>
        </div>
      </div>`;
  }
}

/** Load log aktivitas admin */
async function loadLog() {
  const { data } = await db.from('log_aktivitas').select('*')
    .order('created_at', { ascending: false })
    .limit(30);

  const el = document.getElementById('list-log');
  if (!data || data.length === 0) {
    el.innerHTML = '<div class="empty-state">Belum ada aktivitas</div>';
    return;
  }

  el.innerHTML = data.map(l => `
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F0F0F0;font-size:13px;">
      <div>
        <b>${l.aksi}</b><br>
        <span style="color:#aaa;">${l.detail || ''}</span>
      </div>
      <div style="font-size:11px;color:#aaa;white-space:nowrap;margin-left:8px;">${fmtDate(l.created_at)}</div>
    </div>`).join('');
}

/** Hapus semua log aktivitas */
async function clearLog() {
  if (!confirm('Hapus semua log?')) return;
  await db.from('log_aktivitas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  showToast('Log dihapus!');
  loadLog();
}
