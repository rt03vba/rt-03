import { db } from './supabase.js';
import { state } from './state.js';

export async function logAktivitas(aksi, detail = '') {
  try { 
    await db.from('log_aktivitas').insert({ 
      aksi, 
      detail, 
      user_type: state.currentUser === 'admin' ? 'admin' : 'warga' 
    }); 
  } catch(e) {}
}

export async function fetchDashboardData(bln, thn) {
  return await Promise.all([
    db.from('warga').select('id', { count: 'exact' }),
    db.from('iuran').select('status').eq('bulan', bln).eq('tahun', thn),
    db.from('kas').select('nominal,jenis')
  ]);
}

export async function fetchStruktur() {
  return await db.from('pengaturan').select('nilai').eq('kunci', 'rt_struktur').maybeSingle();
}

export async function fetchPengumuman() {
  return await db.from('pengumuman').select('id,judul,isi,prioritas,created_at')
    .eq('aktif', true).order('created_at', { ascending: false }).limit(5);
}

export async function fetchKegiatan(today) {
  return await db.from('kegiatan').select('*').gte('tanggal', today).order('tanggal').limit(5);
}

export async function fetchWarga() {
  return await db.from('warga').select('*').order('blok').order('nomor_rumah');
}

export async function fetchIuran(bulan, tahun) {
  return await db.from('iuran').select('*').eq('bulan', bulan).eq('tahun', tahun);
}

export async function fetchKas() {
  return await db.from('kas').select('*').order('tanggal', { ascending: false });
}

export async function fetchAnggotaKeluarga(wargaId) {
  return await db.from('anggota_keluarga').select('*').eq('warga_id', wargaId).order('created_at');
}

export async function fetchLogAktivitas() {
  return await db.from('log_aktivitas').select('*').order('created_at', { ascending: false }).limit(30);
}

export async function fetchAdminSessions() {
  return await db.from('admin_sessions').select('*').order('last_active', { ascending: false });
}

export async function savePengumuman(data) {
  if (data.id) {
    return await db.from('pengumuman').update({ judul: data.judul, isi: data.isi, prioritas: data.prioritas }).eq('id', data.id);
  } else {
    return await db.from('pengumuman').insert({ judul: data.judul, isi: data.isi, prioritas: data.prioritas, aktif: true });
  }
}

export async function deletePengumuman(id) {
  return await db.from('pengumuman').delete().eq('id', id);
}

export async function saveKegiatan(data) {
  if (data.id) {
    return await db.from('kegiatan').update({ nama: data.nama, tanggal: data.tanggal, waktu: data.waktu, lokasi: data.lokasi, deskripsi: data.deskripsi }).eq('id', data.id);
  } else {
    return await db.from('kegiatan').insert({ nama: data.nama, tanggal: data.tanggal, waktu: data.waktu, lokasi: data.lokasi, deskripsi: data.deskripsi });
  }
}

export async function deleteKegiatan(id) {
  return await db.from('kegiatan').delete().eq('id', id);
}

export async function saveStruktur(data) {
  return await db.from('pengaturan').upsert({ kunci: 'rt_struktur', nilai: data }, { onConflict: 'kunci' });
}

export async function fetchPaketIuran() {
  return await db.from('pengaturan').select('nilai').eq('kunci', 'paket_iuran').maybeSingle();
}

export async function savePaketIuran(data) {
  return await db.from('pengaturan').upsert({ kunci: 'paket_iuran', nilai: data }, { onConflict: 'kunci' });
}
