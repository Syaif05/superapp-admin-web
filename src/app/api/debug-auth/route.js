import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// Fungsi dekode kunci (Sama seperti di production)
const getPrivateKey = () => {
  const key = process.env.GOOGLE_PRIVATE_KEY || '';
  if (key.startsWith('LS0t')) {
    return Buffer.from(key, 'base64').toString('utf-8');
  }
  return key.replace(/\\n/g, '\n');
};

export async function GET() {
  const emailRobot = process.env.GOOGLE_CLIENT_EMAIL;
  const adminEmail = process.env.GOOGLE_ADMIN_EMAIL;
  const privateKey = getPrivateKey();

  // 1. Cek Data Mentah
  const diagnosticData = {
    vercel_melihat_email_robot: emailRobot,
    vercel_melihat_admin: adminEmail,
    vercel_melihat_kunci: privateKey ? `ADA (Panjang: ${privateKey.length} karakter)` : 'KOSONG',
    kunci_diawali_text: privateKey ? privateKey.substring(0, 25) + "..." : "NULL",
    apakah_kunci_base64: process.env.GOOGLE_PRIVATE_KEY?.startsWith('LS0t') ? 'YA' : 'TIDAK'
  };

  try {
    // 2. Cek Koneksi Langsung (Tanpa Supabase/Nodemailer)
    const jwtClient = new google.auth.JWT(
      emailRobot,
      null,
      privateKey,
      ['https://www.googleapis.com/auth/admin.directory.group'],
      adminEmail
    );

    await jwtClient.authorize();
    
    return NextResponse.json({
      status: "✅ SUKSES",
      pesan: "Koneksi Google Berhasil! Masalah bukan di Auth.",
      diagnosa: diagnosticData
    });

  } catch (error) {
    return NextResponse.json({
      status: "❌ GAGAL",
      error_code: error.code,
      error_message: error.message,
      analisa_saya: "Vercel menggunakan kombinasi data di bawah ini yang DITOLAK Google:",
      diagnosa: diagnosticData
    }, { status: 500 });
  }
}