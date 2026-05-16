import { state } from './state.js';
import * as auth from './auth.js';
import * as app from './app.js';
import * as ui from './ui.js';
import * as exportUtil from './export.js';
import { showToast, openModal, closeModal, initFilterBulanTahun, togglePass } from './utils.js';
import { db } from './supabase.js';

// ============================================================
// APP INITIALIZATION
// ============================================================
async function startApp() {
  const appEl = document.getElementById('app');
  const loginEl = document.getElementById('login-screen');
  if (loginEl) loginEl.style.display = 'none';
  if (appEl) appEl.style.display = 'flex';

  const isAdmin = state.currentUser === 'admin';
  const badgeEl = document.getElementById('user-badge');
  if (badgeEl) badgeEl.textContent = isAdmin ? 'Admin' : 'Warga';
  
  // Toggle Admin Only Elements
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? 'inline-flex' : 'none';
    if (el.tagName === 'BUTTON' && !isAdmin) el.style.display = 'none';
    if (el.tagName === 'TH' && !isAdmin) el.style.display = 'none';
    if (el.id === 'log-card' && !isAdmin) el.style.display = 'none';
  });

  // Initial Load
  await app.loadDashboard();
  initFilterBulanTahun('filter-bulan-iuran', 'filter-tahun-iuran', () => app.loadIuran());
  initFilterBulanTahun('i-bulan-tagihan', 'i-tahun-tagihan');
}

function handleStandaloneBukti(encoded) {
  try {
    let jsonStr;
    try {
      jsonStr = decodeURIComponent(atob(encoded).split('').map(c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    } catch(e2) {
      jsonStr = atob(encoded);
    }
    const data = JSON.parse(jsonStr);
    const bulanNama = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const idxBulan = bulanNama.indexOf(data.bulan);
    const noBukti = `RT03/${data.tahun}/${String(idxBulan).padStart(2, '0')}/${data.id.slice(-6).toUpperCase()}`;
    const tglBayar = data.tgl ? new Date(data.tgl).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';
    const nominal = 'Rp ' + Number(data.nominal).toLocaleString('id-ID');
    const bulanLabel = `${data.bulan} ${data.tahun}`;

    const loginEl = document.getElementById('login-screen');
    if (loginEl) loginEl.style.display = 'none';
    document.body.style.cssText = 'background:#E8EDF5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px 16px;font-family:Segoe UI,sans-serif;';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'width:100%;max-width:400px;';
    wrapper.innerHTML = `
      <div style="text-align:center;font-size:11px;font-weight:600;color:#94A3B8;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">Bukti Pembayaran</div>
      <div style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.12);">
        <div style="background:linear-gradient(135deg,#1565C0,#1E88E5);padding:24px 20px 20px;text-align:center;">
          <div style="font-size:18px;font-weight:800;color:white;line-height:1.3;">Bukti Pembayaran<br>Iuran Warga</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:6px;">RT 03 RW 12 Villa Bintaro Asri</div>
        </div>
        <div style="background:white;padding:20px;">
          <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:8px 12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:11px;color:#64748B;">No. Bukti</span>
            <b style="font-size:12px;color:#1565C0;">${noBukti}</b>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #F1F5F9;"><span style="font-size:12px;color:#64748B;">Nama Warga</span><b style="font-size:13px;color:#1E293B;">${data.nama}</b></div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #F1F5F9;"><span style="font-size:12px;color:#64748B;">No. Rumah</span><b style="font-size:13px;color:#1E293B;">Blok ${data.blok}-${data.nomor}</b></div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #F1F5F9;"><span style="font-size:12px;color:#64748B;">Bulan</span><b style="font-size:13px;color:#1E293B;">${bulanLabel}</b></div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #F1F5F9;"><span style="font-size:12px;color:#64748B;">Nominal</span><b style="font-size:13px;color:#1E293B;">${nominal}</b></div>
          <div style="margin-top:16px;background:#F0FDF4;border:1.5px solid #86EFAC;border-radius:10px;padding:10px;text-align:center;">
            <span style="font-size:14px;font-weight:800;color:#15803D;">✅ Pembayaran Diterima</span>
          </div>
        </div>
      </div>
      <div style="margin-top:16px;text-align:center;">
        <button onclick="window.print()" style="background:#1565C0;color:white;border:none;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">🖨️ Simpan / Print</button>
      </div>`;
    document.body.appendChild(wrapper);
  } catch(e) {
    document.body.innerHTML = '<div style="text-align:center;padding:40px;font-family:sans-serif;color:#E53935;">Link bukti tidak valid.</div>';
  }
}

// ============================================================
// EVENT LISTENERS
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Check for standalone proof view
  const params = new URLSearchParams(window.location.search);
  const buktiParam = params.get('bukti');
  if (buktiParam) {
    handleStandaloneBukti(buktiParam);
    return;
  }

  // Restore Session
  const restored = await auth.restoreSession();
  if (restored) {
    await startApp();
  }

  // Login Tabs
  const tabAdmin = document.getElementById('tab-admin-btn');
  const tabWarga = document.getElementById('tab-warga-btn');
  if (tabAdmin && tabWarga) {
    tabAdmin.onclick = () => {
      tabAdmin.classList.add('active');
      tabWarga.classList.remove('active');
      document.getElementById('login-form-admin').style.display = 'block';
      document.getElementById('login-form-warga').style.display = 'none';
    };
    tabWarga.onclick = () => {
      tabWarga.classList.add('active');
      tabAdmin.classList.remove('active');
      document.getElementById('login-form-warga').style.display = 'block';
      document.getElementById('login-form-admin').style.display = 'none';
    };
  }

  // Login Actions
  const loginAdminBtn = document.getElementById('login-admin-btn');
  if (loginAdminBtn) {
    loginAdminBtn.onclick = async () => {
      const pass = document.getElementById('admin-pass').value;
      if (await auth.loginAdmin(pass)) await startApp();
    };
  }
  const loginWargaBtn = document.getElementById('login-warga-btn');
  if (loginWargaBtn) {
    loginWargaBtn.onclick = async () => {
      const blok = document.getElementById('warga-blok').value;
      const pass = document.getElementById('warga-pass').value;
      if (await auth.loginWarga(blok, pass)) await startApp();
    };
  }

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      auth.logout();
      location.reload();
    };
  }

  // Navigation
  document.querySelectorAll('.nav-trigger').forEach(el => {
    el.onclick = async () => {
      const page = el.getAttribute('data-page');
      
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      const targetPage = document.getElementById('page-' + page);
      if (targetPage) targetPage.classList.add('active');
      
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      const navItem = document.querySelector(`.bottom-nav .nav-item[data-page="${page}"]`);
      if (navItem) navItem.classList.add('active');

      if (page === 'dashboard') await app.loadDashboard();
      if (page === 'warga') await app.loadWarga();
      if (page === 'iuran') await app.loadIuran();
      if (page === 'kas') await app.loadKas();
      if (page === 'profil') await app.loadProfil();
    };
  });

  // Warga Actions
  const searchWarga = document.getElementById('search-warga');
  if (searchWarga) searchWarga.oninput = () => app.applyFilterWarga();
  
  const addWargaBtn = document.getElementById('btn-tambah-warga');
  if (addWargaBtn) {
    addWargaBtn.onclick = () => {
      state.editWargaId = null;
      document.getElementById('modal-warga-title').textContent = 'Tambah Warga';
      document.getElementById('form-warga').reset();
      document.getElementById('w-id').value = '';
      ui.generateKolomAnggota(1);
      openModal('modal-warga');
    };
  }
  const wAnggota = document.getElementById('w-anggota');
  if (wAnggota) wAnggota.oninput = (e) => ui.generateKolomAnggota(e.target.value);
  
  const formWarga = document.getElementById('form-warga');
  if (formWarga) formWarga.onsubmit = (e) => app.saveWarga(e);

  // Iuran Actions
  const searchIuran = document.getElementById('search-iuran');
  if (searchIuran) searchIuran.oninput = () => app.applyFilterIuran();
  
  const genIuranBtn = document.getElementById('btn-generate-iuran');
  if (genIuranBtn) genIuranBtn.onclick = () => app.generateIuranBulanan();
  
  const formIuran = document.getElementById('form-iuran');
  if (formIuran) formIuran.onsubmit = (e) => app.saveIuran(e);

  // Kas Actions
  const addKasBtn = document.getElementById('btn-tambah-kas');
  if (addKasBtn) {
    addKasBtn.onclick = () => {
      state.editKasId = null;
      document.getElementById('modal-kas-title').textContent = 'Tambah Transaksi';
      document.getElementById('form-kas').reset();
      document.getElementById('k-id').value = '';
      document.getElementById('k-tanggal').value = new Date().toISOString().slice(0, 10);
      openModal('modal-kas');
    };
  }
  const formKas = document.getElementById('form-kas');
  if (formKas) formKas.onsubmit = (e) => app.saveKas(e);
  
  const fkJenis = document.getElementById('filter-kas-jenis');
  if (fkJenis) fkJenis.onchange = () => app.applyFilterKas();
  const fkKat = document.getElementById('filter-kas-kategori');
  if (fkKat) fkKat.onchange = () => app.applyFilterKas();
  const fkBulan = document.getElementById('filter-kas-bulan');
  if (fkBulan) fkBulan.onchange = () => app.applyFilterKas();
  const fkTahun = document.getElementById('filter-kas-tahun');
  if (fkTahun) fkTahun.onchange = () => app.applyFilterKas();
  
  const resetKasBtn = document.getElementById('btn-reset-kas');
  if (resetKasBtn) {
    resetKasBtn.onclick = () => {
      if(fkJenis) fkJenis.value = '';
      if(fkKat) fkKat.value = '';
      if(fkBulan) fkBulan.value = '';
      if(fkTahun) fkTahun.value = '';
      app.applyFilterKas();
    };
  }

  // Export & Misc
  const expPdfBtn = document.getElementById('btn-export-pdf');
  if (expPdfBtn) expPdfBtn.onclick = () => exportUtil.exportKasPDF();
  const expExcelBtn = document.getElementById('btn-export-excel');
  if (expExcelBtn) expExcelBtn.onclick = () => exportUtil.exportKasExcel();
  const dlPdfBtn = document.getElementById('btn-download-pdf');
  if (dlPdfBtn) dlPdfBtn.onclick = () => exportUtil.downloadBuktiPDF();
  
  // Profile & Admin Actions
  document.addEventListener('click', async (e) => {
    const target = e.target;
    if (target.id === 'btn-toggle-pass-profil') {
      const el = document.getElementById('profil-pass-display');
      const pass = state.currentUser.password || '123';
      el.textContent = el.textContent.includes('•') ? pass : '•'.repeat(pass.length);
    }
    if (target.id === 'btn-ganti-pass-admin') {
      const el = document.getElementById('ganti-pass-content');
      el.innerHTML = `
        <div class="form-group">
          <label>Password Lama</label>
          <div style="position:relative;">
            <input type="password" id="gp-lama" placeholder="Password saat ini" style="width:100%;padding-right:44px;">
            <button type="button" class="toggle-pass-btn" data-target="gp-lama" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;">👁️</button>
          </div>
        </div>
        <div class="form-group">
          <label>Password Baru</label>
          <div style="position:relative;">
            <input type="password" id="gp-baru" placeholder="Password baru" style="width:100%;padding-right:44px;">
            <button type="button" class="toggle-pass-btn" data-target="gp-baru" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;">👁️</button>
          </div>
        </div>
        <div class="form-group">
          <label>Konfirmasi Password Baru</label>
          <div style="position:relative;">
            <input type="password" id="gp-konfirm" placeholder="Ulangi password baru" style="width:100%;padding-right:44px;">
            <button type="button" class="toggle-pass-btn" data-target="gp-konfirm" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;">👁️</button>
          </div>
        </div>
        <div class="flex-row">
          <button class="btn btn-primary" id="btn-save-pass-admin">💾 Simpan</button>
          <button class="btn btn-outline" data-close="modal-ganti-password">Batal</button>
        </div>`;
      openModal('modal-ganti-password');
      
      document.getElementById('btn-save-pass-admin').onclick = () => {
        const lama = document.getElementById('gp-lama').value.trim();
        const baru = document.getElementById('gp-baru').value.trim();
        const konfirm = document.getElementById('gp-konfirm').value.trim();
        const passSkrg = localStorage.getItem('rt_admin_pass') || '111';
        if (lama !== passSkrg) { showToast('Password lama salah!', 'error'); return; }
        if (!baru) { showToast('Password baru tidak boleh kosong!', 'error'); return; }
        if (baru !== konfirm) { showToast('Konfirmasi password tidak cocok!', 'error'); return; }
        localStorage.setItem('rt_admin_pass', baru);
        showToast('Password admin berhasil diubah!');
        closeModal('modal-ganti-password');
      };
    }
    if (target.id === 'btn-reset-pass-warga') {
      const el = document.getElementById('ganti-pass-content');
      el.innerHTML = `
        <p style="font-size:13px;color:#757575;margin-bottom:16px;">Semua password warga akan direset menjadi password baru.</p>
        <div class="form-group">
          <label>Password Baru Semua Warga</label>
          <input type="password" id="rp-baru" placeholder="Password baru" style="width:100%;">
        </div>
        <div class="flex-row">
          <button class="btn btn-danger" id="btn-confirm-reset-warga">🔄 Reset Semua</button>
          <button class="btn btn-outline" data-close="modal-ganti-password">Batal</button>
        </div>`;
      openModal('modal-ganti-password');
      
      document.getElementById('btn-confirm-reset-warga').onclick = async () => {
        const baru = document.getElementById('rp-baru').value.trim();
        if (!baru) { showToast('Password baru tidak boleh kosong!', 'error'); return; }
        if (!confirm('Reset password SEMUA warga menjadi "' + baru + '"?')) return;
        const { error } = await db.from('warga').update({ password: baru }).neq('id','00000000-0000-0000-0000-000000000000');
        if (error) { showToast('Gagal: ' + error.message, 'error'); return; }
        showToast('Password semua warga berhasil direset!');
        closeModal('modal-ganti-password');
      };
    }
  });
  
  // Delegate Events
  document.addEventListener('click', async (e) => {
    const target = e.target.closest('button, .click-name');
    if (!target) return;
    
    if (target.classList.contains('edit-warga-btn')) {
      const id = target.getAttribute('data-id');
      const w = state.allWarga.find(item => item.id === id);
      if (w) {
        state.editWargaId = id;
        document.getElementById('modal-warga-title').textContent = 'Edit Warga';
        document.getElementById('w-id').value = w.id;
        document.getElementById('w-nik').value = w.nik;
        document.getElementById('w-nama').value = w.nama_kk;
        document.getElementById('w-blok').value = w.blok;
        document.getElementById('w-nomor').value = w.nomor_rumah;
        document.getElementById('w-status').value = w.status_hunian;
        document.getElementById('w-anggota').value = w.jumlah_anggota;
        document.getElementById('w-hp').value = w.no_hp || '';
        const { data } = await db.from('anggota_keluarga').select('*').eq('warga_id', id).order('created_at');
        ui.generateKolomAnggota(w.jumlah_anggota, data || []);
        openModal('modal-warga');
      }
    }
    
    if (target.classList.contains('delete-warga-btn')) app.deleteWarga(target.getAttribute('data-id'));
    if (target.classList.contains('view-anggota-btn')) app.showAnggotaKeluarga(target.getAttribute('data-id'), target.getAttribute('data-nama'));

    if (target.classList.contains('filter-chip')) {
      const parent = target.parentElement;
      parent.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      target.classList.add('active');
      const blok = target.getAttribute('data-blok');
      if (parent.id === 'filter-blok') { state.filterBlokAktif = blok; app.applyFilterWarga(); }
      else if (parent.id === 'filter-blok-iuran') { state.filterBlokIuranAktif = blok; app.applyFilterIuran(); }
    }

    if (target.classList.contains('edit-iuran-btn')) {
      const wargaId = target.getAttribute('data-id');
      const nama = target.getAttribute('data-nama');
      document.getElementById('modal-iuran-nama').textContent = nama;
      document.getElementById('i-warga-id').value = wargaId;
      document.getElementById('i-bulan-tagihan').value = document.getElementById('filter-bulan-iuran').value;
      document.getElementById('i-tahun-tagihan').value = document.getElementById('filter-tahun-iuran').value;
      const { data } = await db.from('iuran').select('*').eq('warga_id', wargaId).eq('bulan', document.getElementById('i-bulan-tagihan').value).eq('tahun', document.getElementById('i-tahun-tagihan').value).maybeSingle();
      if (data) {
        document.getElementById('i-id').value = data.id;
        document.getElementById('i-status').value = data.status;
        document.getElementById('i-nominal').value = data.nominal;
        document.getElementById('i-ket').value = [50000, 70000, 20000].includes(data.nominal) ? String(data.nominal) : '50000';
      } else {
        document.getElementById('i-id').value = '';
        document.getElementById('i-status').value = 'belum';
        document.getElementById('i-nominal').value = 50000;
        document.getElementById('i-ket').value = '50000';
      }
      openModal('modal-iuran');
    }

    if (target.classList.contains('view-bukti-btn')) app.showBuktiPembayaran(target.getAttribute('data-warga-id'), target.getAttribute('data-iuran-id'));

    if (target.classList.contains('edit-kas-btn')) {
      const id = target.getAttribute('data-id');
      const k = state.allKasData.find(item => item.id === id);
      if (k) {
        document.getElementById('modal-kas-title').textContent = 'Edit Transaksi';
        document.getElementById('k-id').value = id;
        document.getElementById('k-tanggal').value = k.tanggal;
        document.getElementById('k-jenis').value = k.jenis;
        document.getElementById('k-nominal').value = k.nominal;
        document.getElementById('k-ket').value = k.keterangan;
        document.getElementById('k-kategori').value = k.kategori || 'lainnya';
        openModal('modal-kas');
      }
    }
    if (target.classList.contains('delete-kas-btn')) app.deleteKas(target.getAttribute('data-id'));

    if (target.classList.contains('modal-close') || target.hasAttribute('data-close')) {
      const modalId = target.getAttribute('data-close') || target.closest('.overlay').id;
      closeModal(modalId);
    }
  });

  document.querySelectorAll('.toggle-pass-btn').forEach(btn => {
    btn.onclick = () => togglePass(btn.getAttribute('data-target'), btn);
  });
});

window.openModal = openModal;
window.closeModal = closeModal;
