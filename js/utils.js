export function rp(n) {
  if (!n && n !== 0) return '-';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

export function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
}

export function showToast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = (type==='success'?'✅':type==='error'?'❌':'ℹ️') + ' ' + msg;
  const container = document.getElementById('toast-container');
  if (container) {
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
}

export function closeModal(id) { 
  const el = document.getElementById(id);
  if (el) el.classList.remove('show'); 
}

export function openModal(id)  { 
  const el = document.getElementById(id);
  if (el) el.classList.add('show'); 
}

export function initFilterBulanTahun(elBulanId, elTahunId, onChangeFn) {
  const now = new Date();
  const bulanNama = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const selBulan = document.getElementById(elBulanId);
  const selTahun = document.getElementById(elTahunId);
  if (selBulan && selTahun) {
    selBulan.innerHTML = bulanNama.map((n,i) =>
      `<option value="${i+1}" ${i+1===now.getMonth()+1?'selected':''}>${n}</option>`).join('');
    selTahun.innerHTML = '';
    for (let y = now.getFullYear(); y >= now.getFullYear()-3; y--)
      selTahun.innerHTML += `<option value="${y}" ${y===now.getFullYear()?'selected':''}>${y}</option>`;
    if (onChangeFn) { 
      selBulan.onchange = onChangeFn; 
      selTahun.onchange = onChangeFn; 
    }
  }
}

export function togglePass(targetId, btn) {
  const input = document.getElementById(targetId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

export function getDeviceId() {
  let id = localStorage.getItem('rt_device_id');
  if (!id) {
    id = 'dev-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
    localStorage.setItem('rt_device_id', id);
  }
  return id;
}
