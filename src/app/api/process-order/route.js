import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { NextResponse } from 'next/server'

// 1. Helper Decode Kunci
const getPrivateKey = () => {
  const key = process.env.GOOGLE_PRIVATE_KEY || '';
  if (key.startsWith('LS0t')) {
    return Buffer.from(key, 'base64').toString('utf-8');
  }
  return key.replace(/\\n/g, '\n');
};

// 2. Helper Buat Email (Format Raw)
const createEmailMessage = (to, subject, htmlBody) => {
  const adminEmail = process.env.GOOGLE_ADMIN_EMAIL;
  // Encode Subject biar support Emoji/Karakter khusus
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const messageParts = [
    `From: SuperApp Admin <${adminEmail}>`,
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    htmlBody
  ];
  return Buffer.from(messageParts.join('\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

// 3. Auth Tunggal (Gmail + Drive + Admin)
const jwtClient = new google.auth.JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: getPrivateKey(),
  scopes: [
    'https://www.googleapis.com/auth/admin.directory.group',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/drive'
  ],
  subject: process.env.GOOGLE_ADMIN_EMAIL
});

export async function POST(req) {
  try {
    const { email_pembeli, product_ids } = await req.json()
    const transactionId = `TRX-${Date.now()}`
    
    // Ambil Data Produk
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .in('id', product_ids)

    if (!products || products.length === 0) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
    }

    const adminService = google.admin({ version: 'directory_v1', auth: jwtClient })
    const gmailService = google.gmail({ version: 'v1', auth: jwtClient })
    
    const successList = []
    const responseData = [] // Data untuk dikirim balik ke HP

    // --- PROSES SETIAP PRODUK ---
    for (const product of products) {
      // 1. Masukkan ke Google Group (Jika ada)
      if (product.group_email) {
        try {
          await adminService.members.insert({
            groupKey: product.group_email,
            requestBody: { email: email_pembeli, role: product.role || 'MEMBER' }
          })
        } catch (err) {
            console.log(`Info: User mungkin sudah ada di grup.`);
        } 
      }
      
      // 2. Simpan History
      await supabase.from('history').insert({
        buyer_email: email_pembeli,
        product_name: product.name,
        product_code: product.product_code,
        generated_id: transactionId,
        status: 'SUCCESS'
      })
      
      successList.push(product) // Simpan object produk lengkap
      
      // 3. Siapkan Data untuk HP (Agar tidak NULL)
      responseData.push({
          id: transactionId,
          status: 'Sent',
          product_name: product.name,      // <-- PENTING: Supaya di HP muncul nama produk
          product_code: product.product_code // <-- PENTING: Supaya kode akses sesuai DB
      })
    }

    // --- KIRIM EMAIL (TEMPLATE HTML BARU) ---
    try {
        // Gabungkan nama produk jadi koma (Contoh: Produk A, Produk B)
        const productNames = successList.map(p => p.name).join(', ');
        
        // Subject Email yang Lebih Bagus
        const emailSubject = `Pesanan Anda: ${productNames} (#${transactionId})`;

        // Template HTML (Silakan edit bagian ini jika ingin ubah tampilan)
        const emailContent = `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
            <div style="background-color: #1a1a2e; padding: 20px; color: white; text-align: center; border-radius: 8px 8px 0 0;">
              <h2>Terima Kasih!</h2>
              <p>Pesanan Anda telah berhasil diproses.</p>
            </div>
            <div style="border: 1px solid #ddd; padding: 20px; border-radius: 0 0 8px 8px;">
              <p>Halo, <b>${email_pembeli}</b></p>
              <p>Berikut adalah detail pesanan Anda:</p>
              
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <tr style="background-color: #f2f2f2;">
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Nama Produk</th>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Kode / Akses</th>
                </tr>
                ${successList.map(p => `
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">${p.name}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;"><b>${p.product_code || 'Akses Grup Aktif'}</b></td>
                  </tr>
                `).join('')}
              </table>

              <p style="margin-top: 20px;">ID Transaksi: <code>${transactionId}</code></p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 12px; color: #888;">Email ini dikirim otomatis oleh SuperApp Admin.</p>
            </div>
          </div>
        `;

        const rawMessage = createEmailMessage(email_pembeli, emailSubject, emailContent);

        await gmailService.users.messages.send({
            userId: 'me',
            requestBody: { raw: rawMessage }
        });

    } catch (emailError) {
        console.error("Gagal kirim email:", emailError.message);
    }

    // KIRIM RESPONSE JSON LENGKAP KE HP
    return NextResponse.json({ 
        message: 'Order berhasil', 
        data: responseData // <-- HP akan membaca data ini
    })

  } catch (error) {
    console.error("SERVER ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}