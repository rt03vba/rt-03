// =============================================
// js/dashboard.js — Dashboard & Chart
// =============================================

/** Load data dashboard: stat warga, kas, iuran bulan ini */
async function loadDashboard() {
  const now = new Date();
  const bln = now.getMonth() + 1;
  const thn = now.getFullYear();

  const [resW, resI, resK] = await Promise.all([
    db.from('warga').select('id', { count: 'exact' }),
    db.from('iuran').select('*').eq('bulan', bln).eq('tahun', thn),
    db.from('kas').select('*')
  ]);

  const totalWarga = resW.count || 0;
  document.getElementById('stat-warga').textContent = totalWarga;

  const iuranBulan = resI.data || [];
  const lunas = iuranBulan.filter(i => i.status === 'lunas').length;
  const belum = Math.max(0, totalWarga - lunas);
  document.getElementById('stat-lunas').textContent = lunas;
  document.getElementById('stat-belum').textContent = belum;

  const kasData = resK.data || [];
  const totalMasuk = kasData.filter(k => k.jenis === 'masuk').reduce((s, k) => s + k.nominal, 0);
  const totalKeluar = kasData.filter(k => k.jenis === 'keluar').reduce((s, k) => s + k.nominal, 0);
  document.getElementById('stat-saldo').textContent = rp(totalMasuk - totalKeluar);

  buildKasChart(kasData);
  loadPengumuman();
  loadKegiatan();
}

/** Build/rebuild chart kas 6 bulan terakhir */
function buildKasChart(data) {
  const now = new Date();
  const labels = [], masukArr = [], keluarArr = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const lbl = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
    labels.push(lbl);

    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const masuk = data
      .filter(k => k.jenis === 'masuk' && new Date(k.tanggal).getMonth() + 1 === m && new Date(k.tanggal).getFullYear() === y)
      .reduce((s, k) => s + k.nominal, 0);
    const keluar = data
      .filter(k => k.jenis === 'keluar' && new Date(k.tanggal).getMonth() + 1 === m && new Date(k.tanggal).getFullYear() === y)
      .reduce((s, k) => s + k.nominal, 0);

    masukArr.push(masuk);
    keluarArr.push(keluar);
  }

  if (kasChartInstance) kasChartInstance.destroy();
  kasChartInstance = new Chart(document.getElementById('kasChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Kas Masuk', data: masukArr, backgroundColor: 'rgba(67,160,71,0.7)', borderRadius: 6 },
        { label: 'Kas Keluar', data: keluarArr, backgroundColor: 'rgba(229,57,53,0.7)', borderRadius: 6 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { ticks: { callback: v => 'Rp ' + (v / 1000).toFixed(0) + 'k' } } }
    }
  });
}
