// =============================================
// js/utils.js — Helper & Utility Functions
// =============================================

/** Format angka ke format Rupiah */
function rp(n) {
  if (!n && n !== 0) return '-';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

/** Format tanggal ke format lokal Indonesia */
function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Tampilkan toast notifikasi */
function showToast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = (type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️') + ' ' + msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/** Tutup modal */
function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

/** Buka modal */
function openModal(id) {
  document.getElementById(id).classList.add('show');
}

/** Log aktivitas ke Supabase */
async function logAktivitas(aksi, detail = '') {
  try {
    await db.from('log_aktivitas').insert({
      aksi,
      detail,
      user_type: currentUser === 'admin' ? 'admin' : 'warga'
    });
  } catch (e) {
    // Gagal log tidak perlu dinotifikasi
  }
}

/** Inisialisasi filter bulan & tahun (dipakai di iuran dan kas) */
function initFilterBulanTahun(elBulanId, elTahunId, onChangeFn) {
  const now = new Date();
  const selBulan = document.getElementById(elBulanId);
  const selTahun = document.getElementById(elTahunId);
  const bulanNama = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  selBulan.innerHTML = bulanNama
    .map((n, i) => `<option value="${i + 1}" ${i + 1 === now.getMonth() + 1 ? 'selected' : ''}>${n}</option>`)
    .join('');

  selTahun.innerHTML = '';
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) {
    selTahun.innerHTML += `<option value="${y}" ${y === now.getFullYear() ? 'selected' : ''}>${y}</option>`;
  }

  if (onChangeFn) {
    selBulan.onchange = onChangeFn;
    selTahun.onchange = onChangeFn;
  }
}

/** Navigasi antar halaman */
function navigateTo(page, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  btn.classList.add('active');

  const titles = {
    dashboard: 'Dashboard',
    warga: 'Daftar Warga',
    iuran: 'Iuran Warga',
    kas: 'Kas RT',
    profil: 'Profil'
  };
  document.getElementById('current-page-title').textContent = titles[page] || page;

  if (page === 'warga') loadWarga();
  if (page === 'iuran') loadIuran();
  if (page === 'kas') loadKas();
  if (page === 'profil') loadProfil();
}

// Tutup overlay jika klik background
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('show'); });
  });
});
