// =============================================
// js/auth.js — Login, Logout, Start App
// =============================================

/** Switch tab login Admin/Warga */
function switchLoginTab(tab) {
  document.querySelectorAll('.login-tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0 && tab === 'admin') || (i === 1 && tab === 'warga'));
  });
  document.getElementById('login-form-admin').style.display = tab === 'admin' ? 'block' : 'none';
  document.getElementById('login-form-warga').style.display = tab === 'warga' ? 'block' : 'none';
}

/** Login sebagai Admin */
function loginAdmin() {
  const pass = document.getElementById('admin-pass').value.trim();
  if (pass !== '111') { showToast('Kode admin salah!', 'error'); return; }
  currentUser = 'admin';
  startApp();
}

/** Login sebagai Warga */
async function loginWarga() {
  const blokInput = document.getElementById('warga-blok').value.trim().toUpperCase();
  const pass = document.getElementById('warga-pass').value.trim();
  const [blok, nomor] = blokInput.includes('-') ? blokInput.split('-') : [blokInput, ''];
  if (!blok) { showToast('Masukkan blok rumah!', 'error'); return; }

  const { data, error } = await db.from('warga').select('*')
    .ilike('blok', blok)
    .ilike('nomor_rumah', nomor || '%');

  if (error || !data || data.length === 0) {
    showToast('Data warga tidak ditemukan!', 'error'); return;
  }
  const warga = data.find(w => w.password === pass);
  if (!warga) { showToast('Password salah!', 'error'); return; }

  currentUser = warga;
  startApp();
}

/** Logout */
function logout() {
  currentUser = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('admin-pass').value = '';
  document.getElementById('warga-blok').value = '';
  document.getElementById('warga-pass').value = '';
}

/** Mulai aplikasi setelah login berhasil */
function startApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  const isAdmin = currentUser === 'admin';
  document.getElementById('user-badge').textContent = isAdmin
    ? '👮 Admin'
    : ('🏠 ' + currentUser.blok + '-' + currentUser.nomor_rumah);

  // Tampilkan elemen khusus admin
  const adminEls = ['btn-tambah-warga', 'btn-generate-iuran', 'btn-tambah-kas', 'btn-add-pengumuman', 'btn-add-kegiatan'];
  adminEls.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isAdmin ? 'block' : 'none';
  });

  const logCard = document.getElementById('log-card');
  if (logCard) logCard.style.display = isAdmin ? 'block' : 'none';

  const thNik = document.getElementById('th-nik');
  if (thNik) thNik.style.display = isAdmin ? '' : 'none';

  const thKasAksi = document.getElementById('th-kas-aksi');
  if (thKasAksi) thKasAksi.style.display = isAdmin ? '' : 'none';

  // Inisialisasi filter bulan/tahun
  initFilterBulanTahun('filter-bulan-iuran', 'filter-tahun-iuran', loadIuran);
  initFilterBulanTahun('filter-bulan-kas', 'filter-tahun-kas', loadKas);

  // Load semua data awal
  loadDashboard();
  loadWarga();
  loadIuran();
  loadKas();
  loadProfil();
}
