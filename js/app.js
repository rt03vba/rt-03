import { state, STRUKTUR_KEY } from './state.js';
import { db } from './supabase.js';
import * as api from './api.js';
import * as ui from './ui.js';
import { showToast, openModal, closeModal, initFilterBulanTahun, rp, fmtDate } from './utils.js';

export async function loadDashboard() {
  const now = new Date();
  const bln = now.getMonth() + 1;
  const thn = now.getFullYear();

  const [resWarga, resIuran, resKas] = await api.fetchDashboardData(bln, thn);
  
  const totalWarga = resWarga.count || 0;
  const lunasCount = (resIuran.data || []).filter(i => i.status === 'lunas').length;
  const totalMasuk = (resKas.data || []).filter(k => k.jenis === 'masuk').reduce((s, k) => s + k.nominal, 0);
  const totalKeluar = (resKas.data || []).filter(k => k.jenis === 'keluar').reduce((s, k) => s + k.nominal, 0);
  const saldo = totalMasuk - totalKeluar;

  ui.renderDashboardSummary(totalWarga, lunasCount, saldo);

  // Load Struktur
  const resStruk = await api.fetchStruktur();
  const s = resStruk?.data?.nilai || { ketua: '', sekretaris1: '', sekretaris2: '', bendahara1: '', bendahara2: '' };
  ui.renderStruktur(s);

  // Load Pengumuman
  const resP = await api.fetchPengumuman();
  ui.renderPengumuman(resP.data);

  // Load Kegiatan
  const today = new Date().toISOString().slice(0, 10);
  const resK = await api.fetchKegiatan(today);
  ui.renderKegiatan(resK.data);
}

export async function loadWarga() {
  const { data, error } = await api.fetchWarga();
  if (error) { showToast('Gagal memuat warga', 'error'); return; }
  state.allWarga = data || [];
  
  // Render filters
  const bloks = [...new Set(state.allWarga.map(w => w.blok))].sort();
  const filterEl = document.getElementById('filter-blok');
  if (filterEl) {
    const active = state.filterBlokAktif;
    filterEl.innerHTML = '<button class="filter-chip ' + (!active ? 'active' : '') + '" data-blok="">Semua</button>' +
      bloks.map(b => `<button class="filter-chip ${active === b ? 'active' : ''}" data-blok="${b}">Blok ${b}</button>`).join('');
  }
  
  applyFilterWarga();
}

export function applyFilterWarga() {
  const query = document.getElementById('search-warga')?.value.toLowerCase() || '';
  const blok = state.filterBlokAktif;
  let filtered = state.allWarga;
  if (blok) filtered = filtered.filter(w => w.blok === blok);
  if (query) filtered = filtered.filter(w => 
    w.nama_kk.toLowerCase().includes(query) || 
    w.blok.toLowerCase().includes(query) || 
    w.nomor_rumah.toLowerCase().includes(query) || 
    w.nik.includes(query)
  );
  ui.renderWarga(filtered);
}

export async function loadIuran() {
  const bulan = parseInt(document.getElementById('filter-bulan-iuran').value);
  const tahun = parseInt(document.getElementById('filter-tahun-iuran').value);
  
  const { data: warga } = await api.fetchWarga();
  const { data: iuran } = await api.fetchIuran(bulan, tahun);
  
  const mapIuran = {};
  (iuran || []).forEach(i => mapIuran[i.warga_id] = i);
  
  state.allIuranData = (warga || []).map(w => ({ ...w, iuran: mapIuran[w.id] || null }));
  
  // Render filters
  const bloks = [...new Set(state.allIuranData.map(w => w.blok))].sort();
  const filterEl = document.getElementById('filter-blok-iuran');
  if (filterEl) {
    const active = state.filterBlokIuranAktif;
    filterEl.innerHTML = '<button class="filter-chip ' + (!active ? 'active' : '') + '" data-blok="">Semua</button>' +
      bloks.map(b => `<button class="filter-chip ${active === b ? 'active' : ''}" data-blok="${b}">Blok ${b}</button>`).join('');
  }
  
  applyFilterIuran();
}

export function applyFilterIuran() {
  const query = document.getElementById('search-iuran')?.value.toLowerCase() || '';
  const blok = state.filterBlokIuranAktif;
  let filtered = state.allIuranData;
  if (blok) filtered = filtered.filter(w => w.blok === blok);
  if (query) filtered = filtered.filter(w => w.nama_kk.toLowerCase().includes(query));
  ui.renderIuran(filtered);
}

export async function loadKas() {
  const { data, error } = await api.fetchKas();
  if (error) { showToast('Gagal memuat kas', 'error'); return; }
  state.allKasData = data || [];
  
  const totalMasuk  = state.allKasData.filter(k => k.jenis === 'masuk').reduce((s, k) => s + k.nominal, 0);
  const totalKeluar = state.allKasData.filter(k => k.jenis === 'keluar').reduce((s, k) => s + k.nominal, 0);
  
  const elM = document.getElementById('kas-masuk-total');
  const elK = document.getElementById('kas-keluar-total');
  const elS = document.getElementById('kas-saldo');
  if (elM) elM.textContent = rp(totalMasuk);
  if (elK) elK.textContent = rp(totalKeluar);
  if (elS) elS.textContent = rp(totalMasuk - totalKeluar);
  
  // Populate tahun filter
  const tahunEl = document.getElementById('filter-kas-tahun');
  if (tahunEl) {
    const years = [...new Set(state.allKasData.map(k => k.tanggal ? k.tanggal.slice(0, 4) : null).filter(Boolean))].sort().reverse();
    const selVal = tahunEl.value || '';
    tahunEl.innerHTML = '<option value="">Semua Tahun</option>' +
      years.map(y => `<option value="${y}" ${y === selVal ? 'selected' : ''}>${y}</option>`).join('');
  }
  
  applyFilterKas();
}

export function applyFilterKas() {
  const jenis    = document.getElementById('filter-kas-jenis')?.value || '';
  const kategori = document.getElementById('filter-kas-kategori')?.value || '';
  const bulan    = document.getElementById('filter-kas-bulan')?.value || '';
  const tahun    = document.getElementById('filter-kas-tahun')?.value || '';

  let filtered = state.allKasData;
  if (jenis)    filtered = filtered.filter(k => k.jenis === jenis);
  if (kategori) filtered = filtered.filter(k => k.kategori === kategori);
  if (bulan)    filtered = filtered.filter(k => k.tanggal && k.tanggal.slice(5, 7) === bulan.padStart(2, '0'));
  if (tahun)    filtered = filtered.filter(k => k.tanggal && k.tanggal.slice(0, 4) === tahun);

  const summaryEl = document.getElementById('kas-filter-summary');
  if (summaryEl) {
    const hasFilter = bulan || tahun;
    summaryEl.style.display = hasFilter ? 'block' : 'none';
    if (hasFilter) {
      const totalMasuk  = filtered.filter(k => k.jenis === 'masuk').reduce((s, k) => s + k.nominal, 0);
      const totalKeluar = filtered.filter(k => k.jenis === 'keluar').reduce((s, k) => s + k.nominal, 0);
      const saldo       = totalMasuk - totalKeluar;
      document.getElementById('summary-masuk').textContent  = rp(totalMasuk);
      document.getElementById('summary-keluar').textContent = rp(totalKeluar);
      const saldoEl = document.getElementById('summary-saldo');
      saldoEl.textContent = rp(Math.abs(saldo));
      saldoEl.style.color = saldo >= 0 ? '#1565C0' : '#C62828';
    }
  }

  ui.renderKas(filtered);
}

export async function loadProfil() {
  const isAdmin = state.currentUser === 'admin';
  const el = document.getElementById('profil-content');
  if (!el) return;
  
  if (isAdmin) {
    const { count: tw } = await db.from('warga').select('id', { count: 'exact' });
    const { count: tkas } = await db.from('kas').select('id', { count: 'exact' });
    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F0F0F0;"><span>Role</span><b>👮 Administrator</b></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F0F0F0;"><span>Total Warga</span><b>${tw}</b></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F0F0F0;"><span>Total Transaksi Kas</span><b>${tkas}</b></div>
      <div style="padding:8px 0;border-bottom:1px solid #F0F0F0;"><button class="btn btn-outline btn-sm" id="btn-ganti-pass-admin" style="width:100%;margin-top:4px;">🔑 Ganti Password Admin</button></div>
      <div style="padding:8px 0;border-bottom:1px solid #F0F0F0;"><button class="btn btn-outline btn-sm" id="btn-reset-pass-warga" style="width:100%;margin-top:4px;color:#E53935;border-color:#E53935;">🔑 Reset Password Semua Warga</button></div>
      <div style="padding:8px 0;"><button class="btn btn-outline btn-sm" id="btn-manage-device" style="width:100%;margin-top:4px;color:#1976D2;border-color:#1976D2;">📱 Kelola Device Login</button></div>
    </div>`;
    loadLog();
  } else {
    const w = state.currentUser;
    const passDisplay = '•'.repeat((w.password || '123').length);
    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F0F0F0;"><span>Nama KK</span><b>${w.nama_kk}</b></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F0F0F0;"><span>Alamat</span><b>Blok ${w.blok}-${w.nomor_rumah}</b></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F0F0F0;"><span>Status</span><b>${w.status_hunian}</b></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F0F0F0;"><span>Anggota Keluarga</span><b>${w.jumlah_anggota} orang</b></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F0F0F0;"><span>No. HP</span><b>${w.no_hp || '-'}</b></div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #F0F0F0;">
        <span>Password</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <b id="profil-pass-display">${passDisplay}</b>
          <button type="button" id="btn-toggle-pass-profil" style="background:none;border:none;cursor:pointer;font-size:16px;">👁️</button>
        </div>
      </div>
    </div>`;
  }
}

export async function loadLog() {
  const { data } = await api.fetchLogAktivitas();
  const el = document.getElementById('list-log');
  if (!el) return;
  if (!data || !data.length) { el.innerHTML = '<div class="empty-state">Belum ada aktivitas</div>'; return; }
  el.innerHTML = data.map(l => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F0F0F0;font-size:13px;"><div><b>${l.aksi}</b><br><span style="color:#aaa;">${l.detail || ''}</span></div><div style="font-size:11px;color:#aaa;white-space:nowrap;margin-left:8px;">${fmtDate(l.created_at)}</div></div>`).join('');
}

export async function clearLog() {
  if (!confirm('Hapus semua log?')) return;
  await db.from('log_aktivitas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  showToast('Log dihapus!');
  loadLog();
}

// ... (previous functions)

export async function saveWarga(e) {
  e.preventDefault();
  const id = document.getElementById('w-id').value;
  const payload = {
    nik: document.getElementById('w-nik').value,
    nama_kk: document.getElementById('w-nama').value,
    blok: document.getElementById('w-blok').value.toUpperCase(),
    nomor_rumah: document.getElementById('w-nomor').value,
    status_hunian: document.getElementById('w-status').value,
    jumlah_anggota: parseInt(document.getElementById('w-anggota').value),
    no_hp: document.getElementById('w-hp').value
  };

  let err;
  if (id) { const r = await db.from('warga').update(payload).eq('id', id); err = r.error; }
  else {
    const { data: existing } = await db.from('warga').select('id').eq('nik', payload.nik).maybeSingle();
    if (existing) { showToast('Warga dengan NIK tersebut sudah ada!', 'error'); return; }
    const r = await db.from('warga').insert({ ...payload, password: '123' }).select();
    err = r.error;
    if (!err && r.data && r.data[0]) {
      const newId = r.data[0].id;
      const rows = Array.from(document.querySelectorAll('.anggota-row')).map(row => ({
        warga_id: newId,
        nama: row.querySelector('.a-nama-input').value.trim(),
        hubungan: row.querySelector('.a-hub-input').value
      })).filter(a => a.nama);
      if (rows.length) await db.from('anggota_keluarga').insert(rows);
    }
  }

  if (err) { showToast('Gagal: ' + err.message, 'error'); return; }
  showToast('Data warga disimpan!');
  closeModal('modal-warga');
  api.logAktivitas(id ? 'Edit Warga' : 'Tambah Warga', payload.nama_kk);
  loadWarga();
}

export async function deleteWarga(id) {
  if (!confirm('Hapus warga ini? Semua data iuran & anggota keluarga juga akan terhapus.')) return;
  const { error } = await db.from('warga').delete().eq('id', id);
  if (error) { showToast('Gagal hapus!', 'error'); return; }
  showToast('Warga dihapus!');
  api.logAktivitas('Hapus Warga', id);
  loadWarga();
}

export async function saveIuran(e) {
  e.preventDefault();
  const wargaId  = document.getElementById('i-warga-id').value;
  const bulan    = parseInt(document.getElementById('i-bulan-tagihan').value);
  const tahun    = parseInt(document.getElementById('i-tahun-tagihan').value);
  const status   = document.getElementById('i-status').value;
  const nominal  = parseInt(document.getElementById('i-nominal').value) || 50000;
  const tglBayar = new Date().toISOString().slice(0, 10);
  const ket      = document.getElementById('i-ket').value;

  const payload = { warga_id: wargaId, bulan, tahun, status, nominal, tgl_bayar: tglBayar, keterangan: ket };
  const { error: upsertErr } = await db.from('iuran').upsert(payload, { onConflict: 'warga_id,bulan,tahun' });
  if (upsertErr) { showToast('Gagal: ' + upsertErr.message, 'error'); return; }

  const { data: savedIuran } = await db.from('iuran').select('id').eq('warga_id', wargaId).eq('bulan', bulan).eq('tahun', tahun).single();
  const finalIuranId = savedIuran ? savedIuran.id : null;

  const warga = state.allIuranData.find(w => w.id === wargaId);
  const namaWarga = warga ? warga.nama_kk : wargaId;
  const bulanNama = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const ketKas = `Iuran ${bulanNama[bulan]} ${tahun} - ${namaWarga}`;
  const ketAkomodasi = `Akomodasi warga - ${namaWarga} ${bulanNama[bulan]} ${tahun}`;
  const blokWarga = warga ? `Blok ${warga.blok}-${warga.nomor_rumah}` : null;

  const bulanPadded = String(bulan).padStart(2, '0');
  const bulanAwal   = `${tahun}-${bulanPadded}-01`;
  const bulanAkhir  = `${tahun}-${bulanPadded}-31`;

  // Hapus kas lama — cari by bulan_iuran+tahun_iuran jika ada, fallback ke tanggal range
  const { data: kasLamaMasuk } = await db.from('kas').select('id')
    .eq('jenis', 'masuk').eq('kategori', 'iuran').eq('blok_warga', blokWarga)
    .eq('bulan_iuran', bulan).eq('tahun_iuran', tahun);
  if (kasLamaMasuk?.length) for (const k of kasLamaMasuk) await db.from('kas').delete().eq('id', k.id);
  // fallback untuk data lama yg belum punya bulan_iuran
  const { data: kasLamaMasukFb } = await db.from('kas').select('id')
    .eq('jenis', 'masuk').eq('kategori', 'iuran').eq('blok_warga', blokWarga)
    .is('bulan_iuran', null).gte('tanggal', bulanAwal).lte('tanggal', bulanAkhir);
  if (kasLamaMasukFb?.length) for (const k of kasLamaMasukFb) await db.from('kas').delete().eq('id', k.id);

  const { data: kasLamaKeluar } = await db.from('kas').select('id')
    .eq('jenis', 'keluar').eq('kategori', 'operasional').eq('blok_warga', blokWarga)
    .eq('bulan_iuran', bulan).eq('tahun_iuran', tahun);
  if (kasLamaKeluar?.length) for (const k of kasLamaKeluar) await db.from('kas').delete().eq('id', k.id);
  // fallback untuk data lama
  const { data: kasLamaKeluarFb } = await db.from('kas').select('id')
    .eq('jenis', 'keluar').eq('kategori', 'operasional').eq('blok_warga', blokWarga)
    .is('bulan_iuran', null).gte('tanggal', bulanAwal).lte('tanggal', bulanAkhir);
  if (kasLamaKeluarFb?.length) for (const k of kasLamaKeluarFb) await db.from('kas').delete().eq('id', k.id);

  if (status === 'lunas') {
    const paket = ket;
    const nominalBayar = parseInt(paket) || nominal;
    // tanggal = tanggal input (untuk history), bulan_iuran/tahun_iuran = bulan tagihan (untuk laporan)
    await db.from('kas').insert({
      tanggal: tglBayar, jenis: 'masuk', nominal: nominalBayar,
      keterangan: ketKas, kategori: 'iuran', created_by: 'auto',
      blok_warga: blokWarga, bulan_iuran: bulan, tahun_iuran: tahun
    });
    let nominalPotong = 0;
    if (paket === '50000') nominalPotong = 45000;
    else if (paket === '70000') nominalPotong = 65000;
    else if (paket === '20000') nominalPotong = 20000;
    if (nominalPotong > 0) {
      await db.from('kas').insert({
        tanggal: tglBayar, jenis: 'keluar', nominal: nominalPotong,
        keterangan: ketAkomodasi, kategori: 'operasional', created_by: 'auto',
        blok_warga: blokWarga, bulan_iuran: bulan, tahun_iuran: tahun
      });
    }
  }

  showToast('Status iuran disimpan!');
  closeModal('modal-iuran');
  api.logAktivitas('Update Iuran', wargaId);
  await loadIuran();
  loadDashboard();
  loadKas();
  if (status === 'lunas' && finalIuranId) showBuktiPembayaran(wargaId, finalIuranId, true);
}

export async function generateIuranBulanan() {
  const bulan = parseInt(document.getElementById('filter-bulan-iuran').value);
  const tahun = parseInt(document.getElementById('filter-tahun-iuran').value);
  const { data: wargaList } = await db.from('warga').select('id');
  const { data: existing } = await db.from('iuran').select('warga_id').eq('bulan', bulan).eq('tahun', tahun);
  const existingIds = new Set((existing || []).map(i => i.warga_id));
  const toInsert = (wargaList || []).filter(w => !existingIds.has(w.id)).map(w => ({ warga_id: w.id, bulan, tahun, status: 'belum', nominal: 50000 }));
  if (!toInsert.length) { showToast('Semua warga sudah ada data iuran bulan ini', 'info'); return; }
  const { error } = await db.from('iuran').insert(toInsert);
  if (error) { showToast('Gagal generate: ' + error.message, 'error'); return; }
  showToast(`Generate ${toInsert.length} data iuran berhasil!`);
  loadIuran();
  loadDashboard();
}

export async function saveKas(e) {
  e.preventDefault();
  const id = document.getElementById('k-id').value;
  const payload = {
    tanggal: document.getElementById('k-tanggal').value,
    jenis: document.getElementById('k-jenis').value,
    nominal: parseInt(document.getElementById('k-nominal').value),
    keterangan: document.getElementById('k-ket').value,
    kategori: document.getElementById('k-kategori').value
  };
  let err;
  if (id) { const r = await db.from('kas').update(payload).eq('id', id); err = r.error; }
  else { const r = await db.from('kas').insert(payload); err = r.error; }
  if (err) { showToast('Gagal: ' + err.message, 'error'); return; }
  showToast('Kas disimpan!');
  closeModal('modal-kas');
  api.logAktivitas(id ? 'Edit Kas' : 'Tambah Kas', payload.keterangan);
  loadKas();
  loadDashboard();
}

export async function deleteKas(id) {
  if (!confirm('Hapus transaksi ini?')) return;
  const { error } = await db.from('kas').delete().eq('id', id);
  if (error) { showToast('Gagal hapus!', 'error'); return; }
  showToast('Transaksi dihapus!');
  api.logAktivitas('Hapus Kas', id);
  loadKas();
  loadDashboard();
}

export async function showBuktiPembayaran(wargaId, iuranId, autoKirimWA = false) {
  const warga = state.allIuranData.find(w => w.id === wargaId);
  if (!warga) return;
  const { data: iuran } = await db.from('iuran').select('*').eq('id', iuranId).single();
  if (!iuran) return;

  const bulanNama = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const noBukti = `RT03/${iuran.tahun}/${String(iuran.bulan).padStart(2, '0')}/${iuranId.slice(-6).toUpperCase()}`;
  const tglBayar = iuran.tgl_bayar ? new Date(iuran.tgl_bayar).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';
  const nominal = rp(iuran.nominal);
  const bulanLabel = `${bulanNama[iuran.bulan]} ${iuran.tahun}`;

  state.currentBuktiData = { warga, iuran, noBukti, tglBayar, nominal, bulanLabel };

  // Generate link bukti standalone (bisa dibuka warga tanpa login)
  const buktiData = {
    nama : warga.nama_kk,
    blok : warga.blok,
    nomor: warga.nomor_rumah,
    bulan: iuran.bulan,
    tahun: iuran.tahun,
    nominal: iuran.nominal,
    tgl  : iuran.tgl_bayar || '',
    id   : iuran.id,
    keterangan: iuran.keterangan || ''
  };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(buktiData))));
  const linkBukti = `${window.location.origin}${window.location.pathname}?bukti=${encoded}`;

  // Rincian paket (sesuai kode lama)
  const rincian = (iuran.keterangan === '50000')
    ? '\nRincian Iuran anda :\nRp.45.000 untuk sampah, keamanan, rukem.\nRp.5.000 untuk kas RT\n'
    : (iuran.keterangan === '70000')
    ? '\nRincian Iuran anda :\nRp.65.000 untuk sampah, keamanan, rukem.\nRp.5.000 untuk kas RT\n'
    : '';

  // Buat pesan WA format lengkap (sama dengan versi lama)
  const noHp = (warga.no_hp || '').replace(/\D/g, '').replace(/^0/, '62');
  const nominalStr = 'Rp ' + Number(iuran.nominal).toLocaleString('id-ID');
  const pesanTeks =
    `RT 03 APP – Manajemen Warga\n` +
    `🔗 ${window.location.origin}\n\n` +
    `Yth. Bapak/Ibu *${warga.nama_kk}*\n\n` +
    `Pembayaran iuran bulan *${bulanLabel}* telah kami terima.\n\n` +
    `📋 No. Bukti : ${noBukti}\n` +
    `🏠 No. Rumah : Blok ${warga.blok}-${warga.nomor_rumah}\n` +
    `💰 Nominal   : ${nominalStr}\n` +
    `📅 Tgl Bayar : ${tglBayar}\n` +
    `${rincian}\n` +
    `🖼️ Bukti pembayaran:\n${linkBukti}\n\n` +
    `Terima kasih atas kepercayaan dan partisipasi aktif Bapak/Ibu. Bersama kita wujudkan lingkungan Villa Bintaro Asri yang nyaman dan harmonis 🤝\n` +
    `*RT 03 RW 12 Villa Bintaro Asri*`;

  const pesanWA = encodeURIComponent(pesanTeks);
  const urlWA = noHp ? `https://wa.me/${noHp}?text=${pesanWA}` : null;

  const tombolWA = urlWA
    ? `<a href="${urlWA}" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;gap:8px;background:#25D366;color:white;font-weight:700;font-size:14px;padding:12px;border-radius:10px;text-decoration:none;margin-top:10px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.857L.057 23.882l6.196-1.453A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.877 9.877 0 01-5.031-1.378l-.36-.214-3.732.875.937-3.63-.235-.374A9.861 9.861 0 012.106 12C2.106 6.58 6.58 2.106 12 2.106S21.894 6.58 21.894 12 17.42 21.894 12 21.894z"/></svg>
        Kirim ke WhatsApp
      </a>`
    : `<div style="margin-top:10px;padding:10px;background:#FEF9C3;border-radius:8px;font-size:12px;color:#92400E;text-align:center;">⚠️ No. HP warga belum diisi</div>`;

  document.getElementById('bukti-content').innerHTML = `
    <div id="bukti-print" style="font-family:'Segoe UI',sans-serif;">
      <div style="background:linear-gradient(135deg,#1565C0,#1E88E5);border-radius:14px 14px 0 0;padding:22px 20px 18px;text-align:center;position:relative;overflow:hidden;">
        <div style="font-size:16px;font-weight:800;color:white;line-height:1.3;">Bukti Pembayaran<br>Iuran Warga</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.75);margin-top:5px;">RT 03 RW 12 Villa Bintaro Asri</div>
      </div>
      <div style="background:white;padding:20px;">
        <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:8px 12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:11px;color:#64748B;">No. Bukti</span>
          <b style="font-size:12px;color:#1565C0;">${noBukti}</b>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #F1F5F9;"><span style="font-size:12px;color:#64748B;">Nama Warga</span><b style="font-size:13px;color:#1E293B;">${warga.nama_kk}</b></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #F1F5F9;"><span style="font-size:12px;color:#64748B;">No. Rumah</span><b style="font-size:13px;color:#1E293B;">Blok ${warga.blok}-${warga.nomor_rumah}</b></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #F1F5F9;"><span style="font-size:12px;color:#64748B;">Bulan</span><b style="font-size:13px;color:#1E293B;">${bulanLabel}</b></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #F1F5F9;"><span style="font-size:12px;color:#64748B;">Nominal</span><b style="font-size:13px;color:#1E293B;">${nominal}</b></div>
        <div style="margin-top:16px;background:#F0FDF4;border:1.5px solid #86EFAC;border-radius:10px;padding:10px;text-align:center;">
          <span style="font-size:14px;font-weight:800;color:#15803D;">✅ Pembayaran Diterima</span>
        </div>
        ${tombolWA}
      </div>
    </div>`;
  openModal('modal-bukti');

  // Jika dipanggil otomatis dari saveIuran, langsung buka WA
  if (autoKirimWA && urlWA) {
    setTimeout(() => window.open(urlWA, '_blank'), 800);
  }
}

export async function savePengumuman(e) {
  e.preventDefault();
  const id = document.getElementById('p-id').value;
  const payload = {
    judul: document.getElementById('p-judul').value,
    isi: document.getElementById('p-isi').value,
    prioritas: document.getElementById('p-prioritas').value
  };
  if (id) payload.id = id;
  const { error } = await api.savePengumuman(payload);
  if (error) { showToast('Gagal: ' + error.message, 'error'); return; }
  showToast('Pengumuman disimpan!');
  closeModal('modal-pengumuman');
  api.logAktivitas(id ? 'Edit Pengumuman' : 'Tambah Pengumuman', payload.judul);
  loadDashboard();
}

export async function deletePengumuman(id) {
  if (!confirm('Hapus pengumuman ini?')) return;
  const { error } = await api.deletePengumuman(id);
  if (error) { showToast('Gagal: ' + error.message, 'error'); return; }
  showToast('Pengumuman dihapus!');
  api.logAktivitas('Hapus Pengumuman', id);
  loadDashboard();
}

export async function saveKegiatan(e) {
  e.preventDefault();
  const id = document.getElementById('kg-id').value;
  const payload = {
    nama: document.getElementById('kg-nama').value,
    tanggal: document.getElementById('kg-tanggal').value,
    waktu: document.getElementById('kg-waktu').value || null,
    lokasi: document.getElementById('kg-lokasi').value || null,
    deskripsi: document.getElementById('kg-deskripsi').value || null
  };
  if (id) payload.id = id;
  const { error } = await api.saveKegiatan(payload);
  if (error) { showToast('Gagal: ' + error.message, 'error'); return; }
  showToast('Kegiatan disimpan!');
  closeModal('modal-kegiatan');
  api.logAktivitas(id ? 'Edit Kegiatan' : 'Tambah Kegiatan', payload.nama);
  loadDashboard();
}

export async function deleteKegiatan(id) {
  if (!confirm('Hapus kegiatan ini?')) return;
  const { error } = await api.deleteKegiatan(id);
  if (error) { showToast('Gagal: ' + error.message, 'error'); return; }
  showToast('Kegiatan dihapus!');
  api.logAktivitas('Hapus Kegiatan', id);
  loadDashboard();
}

export async function saveStruktur(e) {
  e.preventDefault();
  const payload = {
    ketua: document.getElementById('s-ketua').value,
    sekretaris1: document.getElementById('s-sekretaris1').value,
    sekretaris2: document.getElementById('s-sekretaris2').value,
    bendahara1: document.getElementById('s-bendahara1').value,
    bendahara2: document.getElementById('s-bendahara2').value
  };
  const { error } = await api.saveStruktur(payload);
  if (error) { showToast('Gagal: ' + error.message, 'error'); return; }
  showToast('Struktur disimpan!');
  closeModal('modal-struktur');
  api.logAktivitas('Edit Struktur', '');
  loadDashboard();
}

export async function showAnggotaKeluarga(wargaId, namaKK) {
  state.currentWargaAnggota = { id: wargaId, nama: namaKK };
  const isAdmin = state.currentUser === 'admin';
  document.getElementById('modal-anggota-judul').textContent = '👨‍👩‍👧‍👦 ' + namaKK;
  ui.showLoading('modal-anggota-content');
  openModal('modal-anggota');

  const { data, error } = await api.fetchAnggotaKeluarga(wargaId);
  if (error) { document.getElementById('modal-anggota-content').innerHTML = '<div class="empty-state">Gagal memuat data</div>'; return; }
  ui.renderAnggotaKeluarga(data, isAdmin);
}
