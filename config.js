// =============================================
// js/config.js — Konfigurasi Supabase & State Global
// =============================================

const SUPABASE_URL = 'https://oimhuaiylljjwzkzftdz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbWh1YWl5bGxqand6a3pmdGR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTg3NzEsImV4cCI6MjA4ODk3NDc3MX0.8qYLtTt9LKO5Gem606rf2fyag8USQgo4u_vTzegmf-g';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// =============================================
// STATE GLOBAL
// =============================================
let currentUser = null; // 'admin' atau object warga
let allWarga = [];
let allIuranData = [];
let allKasData = [];
let filterBlokAktif = '';
let editWargaId = null;
let editKasId = null;
let kasChartInstance = null;
