import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { NextResponse } from 'next/server'

// 1. Helper: Decode Kunci
const getPrivateKey = () => {
  const key = process.env.GOOGLE_PRIVATE_KEY || '';
  if (key.startsWith('LS0t')) {
    return Buffer.from(key, 'base64').toString('utf-8');
  }
  return key.replace(/\\n/g, '\n');
};

// 2. Helper: Buat Email Raw (Pengganti Nodemailer)
const createEmailMessage = (to, subject, htmlBody) => {
  const adminEmail = process.env.GOOGLE_ADMIN_EMAIL;
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

// 3. AUTH TUNGGAL (Satu Kunci untuk Semua)
const jwtClient = new google.auth.JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: getPrivateKey(),
  scopes: [
    'https://www.googleapis.com/auth/admin.directory.group',
    'https://www.googleapis.com/auth/gmail.send', // Pastikan scope ini ada
    'https://www.googleapis.com/auth/drive'
  ],
  subject: process.env.GOOGLE_ADMIN_EMAIL
});

export async function POST(req) {
  try {
    const { email_pembeli, product_ids } = await req.json()
    const transactionId = `TRX-${Date.now()}`
    
    // Cek Produk
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .in('id', product_ids)

    if (!products || products.length === 0) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
    }

    // Inisialisasi Service Google
    const adminService = google.admin({ version: 'directory_v1', auth: jwtClient })
    const gmailService = google.gmail({ version: 'v1', auth: jwtClient }) // <-- KITA PAKAI INI
    
    const successList = []

    // Proses Produk (Group & DB)
    for (const product of products) {
      if (product.group_email) {
        try {
          await adminService.members.insert({
            groupKey: product.group_email,
            requestBody: { email: email_pembeli, role: product.role || 'MEMBER' }
          })
        } catch (err) {
            console.log(`Info: Member mungkin sudah ada di grup (${err.message})`);
        } 
      }
      
      await supabase.from('history').insert({
        buyer_email: email_pembeli,
        product_name: product.name,
        product_code: product.product_code,
        generated_id: transactionId,
        status: 'SUCCESS'
      })
      successList.push(product.name)
    }

    // KIRIM EMAIL LEWAT GMAIL API (Jalur yang sama dengan Drive)
    try {
        const emailContent = `
          <h2>Terima Kasih!</h2>
          <p>Pesanan berhasil diproses. ID Transaksi: <b>${transactionId}</b></p>
          <p>Item yang Anda beli:</p>
          <ul>${successList.map(n => `<li>${n}</li>`).join('')}</ul>
          <p>Salam,<br>SuperApp Admin</p>
        `;

        const rawMessage = createEmailMessage(
            email_pembeli, 
            `Pesanan Berhasil: ${transactionId}`, 
            emailContent
        );

        await gmailService.users.messages.send({
            userId: 'me', // 'me' merujuk pada Subject (Admin Email)
            requestBody: { raw: rawMessage }
        });

    } catch (emailError) {
        console.error("Gagal kirim email:", emailError.message);
        // Jangan throw error agar status order tetap sukses di mata user
    }

    return NextResponse.json({ message: 'Order berhasil', data: [{ id: transactionId, status: 'Sent' }] })

  } catch (error) {
    console.error("SERVER ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}