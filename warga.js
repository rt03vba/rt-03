// =============================================
// js/warga.js — Manajemen Data Warga
// =============================================

/** Load semua data warga dari Supabase */
async function loadWarga() {
  const isAdmin = currentUser === 'admin';
  let query = db.from('warga').select('*').order('blok').order('nomor_rumah');
  if (!isAdmin) query = query.eq('id', currentUser.id);

  const { data, error } = await query;
  if (error) { showToast('Gagal memuat data warga', 'error'); return; }

  allWarga = data || [];

  // Build filter blok (admin only)
  if (isAdmin) {
    const bloks = [...new Set(allWarga.map(w => w.blok))].sort();
    const fc = document.getElementById('filter-blok');
    fc.innerHTML = `<button class="filter-chip ${filterBlokAktif === '' ? 'active' : ''}" onclick="setFilterBlok('', this)">Semua</button>`;
    bloks.forEach(b => {
      const btn = document.createElement('button');
      btn.className = `filter-chip ${filterBlokAktif === b ? 'active' : ''}`;
      btn.textContent = 'Blok ' + b;
      btn.onclick = () => setFilterBlok(b, btn);
      fc.appendChild(btn);
    });
  }

  renderWarga(allWarga);
}

/** Render tabel warga */
function renderWarga(data) {
  const isAdmin = currentUser === 'admin';
  const tbody = document.getElementById('tabel-warga');

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">👥</div>Tidak ada warga</div></td></tr>';
    return;
  }

  tbody.innerHTML = data.map(w => `
    <tr class="warga-row-clickable" onclick="showRiwayatWarga('${w.id}', '${w.nama_kk}')">
      <td><b>Blok ${w.blok}-${w.nomor_rumah}</b></td>
      <td><span class="click-name">${w.nama_kk}</span></td>
      ${isAdmin ? `<td style="font-size:11px;color:#999;">${w.nik}</td>` : ''}
      <td><span class="badge ${w.status_hunian === 'pribadi' ? 'badge-success' : 'badge-warning'}">${w.status_hunian}</span></td>
      <td style="text-align:center;">${w.jumlah_anggota}</td>
      <td onclick="event.stopPropagation()">
        ${isAdmin ? `
        <div class="flex-row">
          <button class="btn btn-warning btn-sm" onclick="showModalEditWarga('${w.id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteWarga('${w.id}')">🗑️</button>
        </div>` : ''}
      </td>
    </tr>`).join('');
}

/** Set filter blok aktif */
function setFilterBlok(blok, btn) {
  filterBlokAktif = blok;
  document.querySelectorAll('#filter-blok .filter-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filterWarga(document.getElementById('search-warga').value);
}

/** Filter warga berdasarkan input pencarian + filter blok */
function filterWarga(q) {
  let data = allWarga;
  if (filterBlokAktif) data = data.filter(w => w.blok === filterBlokAktif);
  if (q) {
    const lq = q.toLowerCase();
    data = data.filter(w =>
      w.nama_kk.toLowerCase().includes(lq) ||
      w.blok.toLowerCase().includes(lq) ||
      (currentUser === 'admin' && w.nik && w.nik.includes(lq))
    );
  }
  renderWarga(data);
}

/** Tampilkan riwayat iuran warga (modal) */
async function showRiwayatWarga(wargaId, nama) {
  openModal('modal-riwayat');
  document.getElementById('modal-riwayat-nama').textContent = '📋 ' + nama;

  const { data } = await db.from('iuran').select('*')
    .eq('warga_id', wargaId)
    .order('tahun')
    .order('bulan');

  const el = document.getElementById('modal-riwayat-content');
  if (!data || data.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">💳</div>Belum ada riwayat iuran</div>';
    return;
  }

  const bulanNama = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  el.innerHTML = `
    <div class="table-wrap"><table>
      <thead><tr><th>Bulan</th><th>Tahun</th><th>Status</th><th>Bayar</th><th>Nominal</th></tr></thead>
      <tbody>
        ${data.map(i => `
          <tr>
            <td>${bulanNama[i.bulan]}</td>
            <td>${i.tahun}</td>
            <td><span class="badge ${i.status === 'lunas' ? 'badge-success' : 'badge-danger'}">${i.status}</span></td>
            <td style="font-size:12px;">${fmtDate(i.tgl_bayar)}</td>
            <td>${rp(i.nominal)}</td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;
}

/** Tampilkan modal tambah warga */
function showModalTambahWarga() {
  editWargaId = null;
  document.getElementById('modal-warga-title').textContent = 'Tambah Warga';
  document.getElementById('form-warga').reset();
  document.getElementById('w-id').value = '';
  document.getElementById('w-password').value = '123';
  openModal('modal-warga');
}

/** Tampilkan modal edit warga */
function showModalEditWarga(id) {
  const w = allWarga.find(w => w.id === id);
  if (!w) return;
  editWargaId = id;
  document.getElementById('modal-warga-title').textContent = 'Edit Data Warga';
  document.getElementById('w-id').value = id;
  document.getElementById('w-nik').value = w.nik;
  document.getElementById('w-nama').value = w.nama_kk;
  document.getElementById('w-blok').value = w.blok;
  document.getElementById('w-nomor').value = w.nomor_rumah;
  document.getElementById('w-status').value = w.status_hunian;
  document.getElementById('w-anggota').value = w.jumlah_anggota;
  document.getElementById('w-hp').value = w.no_hp || '';
  document.getElementById('w-password').value = w.password || '123';
  openModal('modal-warga');
}

/** Simpan data warga (tambah/edit) */
async function saveWarga(e) {
  e.preventDefault();
  const id = document.getElementById('w-id').value;
  const nik = document.getElementById('w-nik').value.trim();
  const payload = {
    nik,
    nama_kk: document.getElementById('w-nama').value.trim(),
    blok: document.getElementById('w-blok').value.trim().toUpperCase(),
    nomor_rumah: document.getElementById('w-nomor').value.trim(),
    status_hunian: document.getElementById('w-status').value,
    jumlah_anggota: parseInt(document.getElementById('w-anggota').value) || 1,
    no_hp: document.getElementById('w-hp').value.trim(),
    password: document.getElementById('w-password').value.trim() || '123'
  };

  // Cek duplikat NIK
  const { data: existing } = await db.from('warga').select('id')
    .eq('nik', nik)
    .neq('id', id || '00000000-0000-0000-0000-000000000000');
  if (existing && existing.length > 0) { showToast('NIK sudah terdaftar!', 'error'); return; }

  let err;
  if (id) {
    const res = await db.from('warga').update(payload).eq('id', id);
    err = res.error;
  } else {
    const res = await db.from('warga').insert(payload);
    err = res.error;
  }

  if (err) { showToast('Gagal menyimpan: ' + err.message, 'error'); return; }
  showToast(id ? 'Data warga diperbarui!' : 'Warga berhasil ditambahkan!');
  closeModal('modal-warga');
  document.getElementById('form-warga').reset();
  logAktivitas(id ? 'Edit Warga' : 'Tambah Warga', payload.nama_kk);
  loadWarga();
}

/** Hapus data warga */
async function deleteWarga(id) {
  if (!confirm('Hapus data warga ini?')) return;
  const { error } = await db.from('warga').delete().eq('id', id);
  if (error) { showToast('Gagal menghapus!', 'error'); return; }
  showToast('Warga dihapus!');
  logAktivitas('Hapus Warga', id);
  loadWarga();
}
