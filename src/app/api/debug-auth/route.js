import { google } from 'googleapis';
import { NextResponse } from 'next/server';

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

  try {
    // --- PERBAIKAN UTAMA DI SINI ---
    // Kita pakai format OBJECT agar tidak salah baca posisi
    const jwtClient = new google.auth.JWT({
      email: emailRobot,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/admin.directory.group'],
      subject: adminEmail
    });

    // Tes buat token (authorize)
    await jwtClient.authorize();
    
    return NextResponse.json({
      status: "✅ SUKSES BESAR",
      pesan: "Koneksi Google BERHASIL! Identitas & Kunci Valid.",
      detail: {
        robot: emailRobot,
        admin: adminEmail,
        kunci_ok: "Ya, Google menerima kunci ini."
      }
    });

  } catch (error) {
    return NextResponse.json({
      status: "❌ GAGAL",
      error_message: error.message,
      analisa: "Masih ada error lain. Cek pesan di atas."
    }, { status: 500 });
  }
}