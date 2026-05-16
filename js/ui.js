import { state, STRUKTUR_KEY } from './state.js';
import { rp, fmtDate, openModal, closeModal } from './utils.js';
import { db } from './supabase.js';

export function showLoading(elId) {
  const el = document.getElementById(elId);
  if (el) el.innerHTML = '<div class="loading">Memuat...</div>';
}

export function renderDashboardSummary(totalWarga, lunas, saldo) {
  const dW = document.getElementById('dash-warga');
  const dL = document.getElementById('dash-lunas');
  const dS = document.getElementById('dash-saldo');
  if (dW) { dW.textContent = totalWarga; dW.classList.add('fade-in'); }
  if (dL) { dL.textContent = lunas; dL.classList.add('fade-in'); }
  if (dS) { dS.textContent = rp(saldo); dS.classList.add('fade-in'); }
  
  document.getElementById('stat-warga').textContent = totalWarga;
  document.getElementById('stat-lunas').textContent = lunas;
  document.getElementById('stat-belum').textContent = Math.max(0, totalWarga - lunas);
  document.getElementById('stat-saldo').textContent = rp(saldo);
}

export function renderStruktur(s) {
  const el = document.getElementById('struktur-content');
  if (!el) return;
  const kosong = '<span style="color:#94A3B8;font-style:italic;font-size:12px;">Belum diisi</span>';

  const card = (bgIcon, iconSvg, jabatanColor, jabatan, nama) => `
    <div style="display:flex;align-items:center;gap:0;background:#fff;border-radius:14px;box-shadow:0 2px 10px rgba(0,0,0,0.10);overflow:hidden;min-height:70px;">
      <div style="width:64px;min-height:70px;background:${bgIcon};display:flex;align-items:center;justify-content:center;border-radius:12px;margin:6px;flex-shrink:0;">
        ${iconSvg}
      </div>
      <div style="padding:10px 10px 10px 4px;">
        <div style="font-size:10px;font-weight:800;color:${jabatanColor};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">${jabatan}</div>
        <div style="width:22px;height:2px;background:${jabatanColor};border-radius:2px;margin-bottom:5px;"></div>
        <div style="font-size:14px;font-weight:700;color:#1E293B;line-height:1.3;">${nama || kosong}</div>
      </div>
    </div>`;

  const svgKetua = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3" fill="white"/><path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="white" stroke-width="2" stroke-linecap="round"/><polygon points="12,2 13,5 16,5 13.5,6.8 14.5,10 12,8.2 9.5,10 10.5,6.8 8,5 11,5" fill="#FFD700"/></svg>`;
  const svgSekretaris = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="13" height="16" rx="2" stroke="white" stroke-width="2"/><path d="M8 7h6M8 10h6M8 13h4" stroke="white" stroke-width="1.5" stroke-linecap="round"/><circle cx="18" cy="18" r="4" fill="white" fill-opacity="0.3" stroke="white" stroke-width="1.5"/><path d="M16.5 18l1 1 2-2" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const svgBendahara = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="14" rx="3" stroke="white" stroke-width="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="white" stroke-width="2"/><circle cx="12" cy="14" r="2" fill="white"/></svg>`;

  const lineV = (h='40px') => `<div style="width:2px;height:${h};background:#CBD5E1;margin:0 auto;"></div>`;
  const lineH = `
    <div style="display:flex;align-items:flex-start;justify-content:center;position:relative;margin-bottom:0;">
      <div style="position:absolute;top:0;left:25%;right:25%;height:2px;background:#CBD5E1;"></div>
      <div style="width:2px;height:20px;background:#CBD5E1;position:absolute;top:0;left:25%;transform:translateX(-50%);"></div>
      <div style="width:2px;height:20px;background:#CBD5E1;position:absolute;top:0;right:25%;transform:translateX(50%);"></div>
    </div>`;

  el.innerHTML = `
    <div style="background:linear-gradient(135deg,#EFF6FF 0%,#F0F9FF 100%);border-radius:14px;padding:16px 12px 20px;position:relative;overflow:hidden;">
      <div style="position:absolute;top:-20px;right:-20px;width:80px;height:80px;border-radius:50%;border:2px solid #BFDBFE;opacity:0.5;"></div>
      <div style="position:absolute;bottom:-30px;left:-20px;width:100px;height:100px;border-radius:50%;background:#DBEAFE;opacity:0.3;"></div>
      <div style="text-align:center;margin-bottom:4px;position:relative;">
        <div style="font-size:22px;font-weight:900;color:#1E3A5F;letter-spacing:1px;text-transform:uppercase;">STRUKTUR</div>
        <div style="display:inline-block;background:#1E3A5F;color:white;font-size:11px;font-weight:700;padding:3px 14px;border-radius:20px;letter-spacing:1px;margin-bottom:4px;">• RT03 RW12 •</div>
      </div>
      ${lineV('16px')}
      <div style="padding:0 20px;">${card('#1E3A5F', svgKetua, '#1565C0', 'Ketua RT', s.ketua)}</div>
      ${lineV('20px')}${lineH}<div style="height:20px;"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${card('#00897B', svgSekretaris, '#00695C', 'Sekretaris 1', s.sekretaris1)}
        ${card('#1976D2', svgSekretaris, '#1565C0', 'Sekretaris 2', s.sekretaris2)}
      </div>
      ${lineV('20px')}${lineH}<div style="height:20px;"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${card('#43A047', svgBendahara, '#2E7D32', 'Bendahara 1', s.bendahara1)}
        ${card('#FB8C00', svgBendahara, '#E65100', 'Bendahara 2', s.bendahara2)}
      </div>
    </div>`;
}

export function renderPengumuman(data) {
  const el = document.getElementById('list-pengumuman');
  if (!data || !data.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div>Belum ada pengumuman</div>'; return; }
  const priColor = { normal: 'badge-info', penting: 'badge-warning', urgent: 'badge-danger' };
  el.innerHTML = data.map(p => `
    <div style="padding:12px 0;border-bottom:1px solid #F0F0F0;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span class="badge ${priColor[p.prioritas] || 'badge-info'}">${p.prioritas.toUpperCase()}</span>
        <span style="font-weight:700;font-size:14px;">${p.judul}</span>
        ${state.currentUser === 'admin' ? `<button class="delete-pengumuman-btn" data-id="${p.id}" style="margin-left:auto;background:none;border:none;color:#E53935;cursor:pointer;font-size:12px;">🗑️</button>` : ''}
      </div>
      <div style="font-size:13px;color:#555;line-height:1.5;">${p.isi}</div>
      <div style="font-size:11px;color:#aaa;margin-top:4px;">${fmtDate(p.created_at)}</div>
    </div>`).join('');
}

export function renderKegiatan(data) {
  const el = document.getElementById('list-kegiatan');
  if (!data || !data.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div>Belum ada kegiatan</div>'; return; }
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
      ${state.currentUser === 'admin' ? `<button class="delete-kegiatan-btn" data-id="${k.id}" style="background:none;border:none;color:#E53935;cursor:pointer;">🗑️</button>` : ''}
    </div>`).join('');
}

export function renderWarga(data) {
  const isAdmin = state.currentUser === 'admin';
  const tbody = document.getElementById('tabel-warga');
  if (!data || !data.length) { tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">👥</div>Tidak ada warga</div></td></tr>'; return; }
  tbody.innerHTML = data.map(w => {
    const noHp = w.no_hp || '';
    const waLink = noHp
      ? (isAdmin
        ? `<a href="https://wa.me/${noHp.replace(/[^0-9]/g, '').replace(/^0/, '62')}" target="_blank" style="color:#25D366;font-size:12px;font-weight:600;text-decoration:none;">📲 ${noHp}</a>`
        : `<span style="font-size:12px;">${noHp}</span>`)
      : '<span style="font-size:11px;color:#aaa;">-</span>';
    return `<tr>
      <td><b>Blok ${w.blok}-${w.nomor_rumah}</b></td>
      <td><span class="click-name view-anggota-btn" data-id="${w.id}" data-nama="${w.nama_kk.replace(/'/g, "\\'")}">${w.nama_kk}</span></td>
      ${isAdmin ? `<td style="font-size:11px;color:#999;">${w.nik}</td>` : ''}
      <td><span class="badge ${w.status_hunian === 'pribadi' ? 'badge-success' : 'badge-warning'}">${w.status_hunian}</span></td>
      <td style="text-align:center;">${w.jumlah_anggota}</td>
      <td style="white-space:nowrap;">${waLink}</td>
      <td>${isAdmin ? `<div class="flex-row"><button class="btn btn-warning btn-sm edit-warga-btn" data-id="${w.id}">✏️</button><button class="btn btn-danger btn-sm delete-warga-btn" data-id="${w.id}">🗑️</button></div>` : ''}</td>
    </tr>`;
  }).join('');
}

export function renderIuran(data) {
  const isAdmin = state.currentUser === 'admin';
  const tbody = document.getElementById('tabel-iuran');
  const jL = (data || []).filter(w => w.iuran && w.iuran.status === 'lunas').length;
  const jB = (data || []).filter(w => !w.iuran || w.iuran.status !== 'lunas').length;
  const elL = document.getElementById('sum-lunas'), elB = document.getElementById('sum-belum'), elT = document.getElementById('sum-total');
  if (elL) elL.textContent = jL; if (elB) elB.textContent = jB; if (elT) elT.textContent = (data || []).length;
  if (!data || !data.length) { tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">Tidak ada data</div></td></tr>'; return; }
  tbody.innerHTML = data.map(item => {
    const paket = item.iuran?.keterangan;
    const paketLabel = paket === '50000' ? '<br><span style="font-size:10px;background:#EFF6FF;color:#1565C0;padding:1px 6px;border-radius:8px;font-weight:700;">💰 50rb</span>'
      : paket === '70000' ? '<br><span style="font-size:10px;background:#F0FDF4;color:#2E7D32;padding:1px 6px;border-radius:8px;font-weight:700;">💰 70rb</span>'
      : paket === '20000' ? '<br><span style="font-size:10px;background:#FEF3C7;color:#D97706;padding:1px 6px;border-radius:8px;font-weight:700;">💰 20rb</span>'
      : '';
    return `<tr>
      <td><b>Blok ${item.blok}-${item.nomor_rumah}</b></td>
      <td>${item.nama_kk}</td>
      <td>${item.iuran ? `<span class="badge ${item.iuran.status === 'lunas' ? 'badge-success' : 'badge-danger'}">${item.iuran.status}</span>` : '<span class="badge badge-warning">Belum input</span>'}${paketLabel}</td>
      <td style="font-size:12px;">${item.iuran ? fmtDate(item.iuran.tgl_bayar) : '-'}</td>
      ${isAdmin ? `<td><button class="btn btn-primary btn-sm edit-iuran-btn" data-id="${item.id}" data-nama="${item.nama_kk.replace(/'/g, "\\'")}" data-iuran-id="${item.iuran ? item.iuran.id : ''}">✏️</button></td>` : ''}
      <td style="white-space:nowrap;">${item.iuran && item.iuran.status === 'lunas' ? `
        <button class="btn btn-success btn-sm view-bukti-btn" data-warga-id="${item.id}" data-iuran-id="${item.iuran.id}" title="Lihat Bukti">🧾</button>
        ${isAdmin ? `<button class="btn btn-success btn-sm send-wa-btn" style="background:#25D366;margin-left:4px;" data-warga-id="${item.id}" data-iuran-id="${item.iuran.id}" title="Kirim WA">📲</button>` : ''}
      ` : ''}</td>
    </tr>`;
  }).join('');
}

export function renderKas(data) {
  const isAdmin = state.currentUser === 'admin';
  const tbody = document.getElementById('tabel-kas');
  if (!data || !data.length) { tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">💸</div>Belum ada transaksi</div></td></tr>'; return; }
  tbody.innerHTML = data.map(k => `<tr>
    <td style="font-size:12px;white-space:nowrap;">${fmtDate(k.tanggal)}</td>
    <td>${k.keterangan}<br><span style="font-size:11px;color:#aaa;">${k.kategori}</span></td>
    <td style="font-size:12px;color:#1565C0;font-weight:600;white-space:nowrap;">${k.blok_warga || '-'}</td>
    <td><span class="badge ${k.jenis === 'masuk' ? 'badge-success' : 'badge-danger'}">${k.jenis}</span></td>
    <td style="white-space:nowrap;font-weight:600;color:${k.jenis === 'masuk' ? '#2E7D32' : '#C62828'}">${rp(k.nominal)}</td>
    ${isAdmin ? `<td><div class="flex-row"><button class="btn btn-warning btn-sm edit-kas-btn" data-id="${k.id}">✏️</button><button class="btn btn-danger btn-sm delete-kas-btn" data-id="${k.id}">🗑️</button></div></td>` : ''}
  </tr>`).join('');
}

export function renderAnggotaKeluarga(data, isAdmin) {
  const el = document.getElementById('modal-anggota-content');
  if (!data || !data.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div>Belum ada data anggota keluarga</div>'; return; }
  const hubunganIcon = { 'Kepala Keluarga': '👨', 'Istri': '👩', 'Anak': '👧', 'Orang Tua': '👴', 'Saudara': '👫', 'Lainnya': '👤' };
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${data.map(a => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#F8FAFC;border-radius:10px;border-left:3px solid #1976D2;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:20px;">${hubunganIcon[a.hubungan] || '👤'}</span>
            <div><div style="font-weight:700;font-size:14px;">${a.nama}</div><div style="font-size:11px;color:#64748B;">${a.hubungan}</div></div>
          </div>
          ${isAdmin ? `<div class="flex-row"><button class="btn btn-warning btn-sm edit-a-btn" data-id="${a.id}" data-warga-id="${a.warga_id}">✏️</button><button class="btn btn-danger btn-sm delete-a-btn" data-id="${a.id}" data-warga-id="${a.warga_id}">🗑️</button></div>` : ''}
        </div>`).join('')}
    </div>`;
}

export function generateKolomAnggota(jumlah, existingData = []) {
  const n = parseInt(jumlah) || 1;
  const el = document.getElementById('w-anggota-list');
  if (!el) return;
  const hubOptions = ['Kepala Keluarga', 'Istri', 'Anak', 'Orang Tua', 'Saudara', 'Lainnya'];
  el.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const existing = existingData[i] || {};
    const nama = existing.nama || '';
    const hub = existing.hubungan || (i === 0 ? 'Kepala Keluarga' : 'Anak');
    const optHtml = hubOptions.map(o => `<option value="${o}" ${hub === o ? 'selected' : ''}>${o}</option>`).join('');
    const row = document.createElement('div');
    row.className = 'anggota-row';
    row.style.cssText = 'display:flex;gap:8px;align-items:center;background:#F8FAFC;padding:8px 10px;border-radius:8px;border-left:3px solid #1976D2;';
    row.innerHTML = `<span style="font-size:12px;color:#64748B;min-width:20px;font-weight:600;">${i + 1}.</span>
      <input type="text" class="a-nama-input" placeholder="Nama anggota ke-${i + 1}" value="${nama}" style="flex:1;padding:8px 10px;border:1.5px solid #E0E0E0;border-radius:6px;font-size:13px;">
      <select class="a-hub-input" style="width:130px;padding:8px 6px;border:1.5px solid #E0E0E0;border-radius:6px;font-size:12px;">${optHtml}</select>`;
    el.appendChild(row);
  }
}
