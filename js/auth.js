import { db } from './supabase.js';
import { state } from './state.js';
import { showToast, getDeviceId } from './utils.js';

export function saveSession(user) {
  if (user === 'admin') {
    localStorage.setItem('rt_session', JSON.stringify({ role: 'admin' }));
  } else {
    localStorage.setItem('rt_session', JSON.stringify({ role: 'warga', id: user.id }));
  }
}

export function clearSession() {
  localStorage.removeItem('rt_session');
}

export async function restoreSession() {
  const raw = localStorage.getItem('rt_session');
  if (!raw) return false;
  try {
    const session = JSON.parse(raw);
    if (session.role === 'admin') {
      const deviceId = getDeviceId();
      const { data: devData } = await db.from('admin_sessions')
        .select('id').eq('device_id', deviceId).limit(1);
      if (!devData || devData.length === 0) {
        clearSession();
        showToast('Sesi device ini telah dinonaktifkan oleh admin.', 'error');
        return false;
      }
      await db.from('admin_sessions').update({ last_active: new Date().toISOString() })
        .eq('device_id', deviceId);
      state.currentUser = 'admin';
      return true;
    } else if (session.role === 'warga' && session.id) {
      const { data, error } = await db.from('warga').select('*').eq('id', session.id).single();
      if (error || !data) { clearSession(); return false; }
      state.currentUser = data;
      return true;
    }
  } catch(e) { clearSession(); return false; }
  return false;
}

export async function loginAdmin(pass) {
  const passBenar = localStorage.getItem('rt_admin_pass') || '111';
  if (pass !== passBenar) { showToast('Kode admin salah!','error'); return false; }
  state.currentUser = 'admin';
  saveSession(state.currentUser);
  await registerDeviceSession();
  return true;
}

export async function loginWarga(blokInput, pass) {
  const [blok, nomor] = blokInput.includes('-') ? blokInput.split('-') : [blokInput, ''];
  if (!blok) { showToast('Masukkan blok rumah!','error'); return false; }
  const { data, error } = await db.from('warga').select('*')
    .ilike('blok', blok).ilike('nomor_rumah', nomor||'%');
  if (error||!data||!data.length) { showToast('Data warga tidak ditemukan!','error'); return false; }
  const warga = data.find(w => w.password===pass);
  if (!warga) { showToast('Password salah!','error'); return false; }
  state.currentUser = warga;
  saveSession(state.currentUser);
  return true;
}

export function logout() {
  state.currentUser = null;
  clearSession();
}

export async function registerDeviceSession() {
  const deviceId   = getDeviceId();
  const deviceInfo = getDeviceInfo();
  const now        = new Date().toISOString();

  const { data: existing } = await db.from('admin_sessions')
    .select('id').eq('device_id', deviceId).limit(1);

  if (!existing || existing.length === 0) {
    await db.from('admin_sessions').insert({
      device_id   : deviceId,
      device_info : deviceInfo,
      created_at  : now,
      last_active : now
    });
  } else {
    await db.from('admin_sessions').update({ last_active: now })
      .eq('device_id', deviceId);
  }
}

function getDeviceInfo() {
  const ua = navigator.userAgent;
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';

  if (/Android/.test(ua))        os = 'Android';
  else if (/iPhone|iPad/.test(ua)) os = 'iOS';
  else if (/Windows/.test(ua))   os = 'Windows';
  else if (/Mac/.test(ua))       os = 'MacOS';
  else if (/Linux/.test(ua))     os = 'Linux';

  if (/Chrome/.test(ua) && !/Edg/.test(ua)) browser = 'Chrome';
  else if (/Firefox/.test(ua))   browser = 'Firefox';
  else if (/Safari/.test(ua))    browser = 'Safari';
  else if (/Edg/.test(ua))       browser = 'Edge';

  return `${browser} / ${os}`;
}
