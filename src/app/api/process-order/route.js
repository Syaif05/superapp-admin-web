import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { NextResponse } from 'next/server'

// --- HELPER 1: DECODE PRIVATE KEY ---
const getPrivateKey = () => {
  const key = process.env.GOOGLE_PRIVATE_KEY || '';
  if (key.startsWith('LS0t')) {
    return Buffer.from(key, 'base64').toString('utf-8');
  }
  return key.replace(/\\n/g, '\n');
};

// --- HELPER 2: FORMAT EMAIL RAW ---
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

// --- HELPER 3: AMBIL HTML DARI URL (YANG SEMPAT HILANG) ---
const fetchTemplateHtml = async (url) => {
    if (!url) return null;
    try {
        const res = await fetch(url);
        if (res.ok) return await res.text();
    } catch (e) {
        console.error("Gagal ambil template URL:", e);
    }
    return null;
}

// --- SETUP SUPABASE ---
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

// --- SETUP GOOGLE AUTH ---
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
    
    // 1. AMBIL DATA PRODUK DARI DATABASE
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .in('id', product_ids)

    if (!products || products.length === 0) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
    }

    // 2. GENERATE ID TRANSAKSI (CUSTOM FORMAT 7 DIGIT)
    // Logika: Pembeli_[KODE][7_ANGKA_ACAK] -> Contoh: Pembeli_DF6374390
    const firstProductCode = products[0].product_code || 'TRX'; 
    const randomNum = Math.floor(1000000 + Math.random() * 9000000); // 7 Angka Acak
    const transactionId = `Pembeli_${firstProductCode}${randomNum}`;

    // Inisialisasi Service Google
    const adminService = google.admin({ version: 'directory_v1', auth: jwtClient })
    const gmailService = google.gmail({ version: 'v1', auth: jwtClient })
    
    const responseData = []

    // 3. PROSES SETIAP PRODUK
    for (const product of products) {
      
      // A. Masukkan ke Google Group (Jika ada)
      if (product.group_email) {
        try {
          await adminService.members.insert({
            groupKey: product.group_email,
            requestBody: { email: email_pembeli, role: product.role || 'MEMBER' }
          })
        } catch (err) {
            // Abaikan error jika member sudah ada
            console.log(`Info Group: ${err.message}`);
        } 
      }
      

      
      // C. Siapkan Data Balikan ke HP
      responseData.push({
          id: transactionId, // <-- HP menerima 'Pembeli_DF231'
          status: 'Sent',
          product_name: product.name,
          product_code: product.product_code
      })

      // D. Kirim Email (Logika Template Lengkap)
      try {
        let subjectTpl = product.email_subject
        let bodyTpl = product.email_body

        // JIKA BODY KOSONG, AMBIL DARI URL STORAGE (Fitur Lama Dikembalikan)
        if (!bodyTpl && product.template_url) {
            console.log(`Mengambil template dari URL untuk: ${product.name}`);
            bodyTpl = await fetchTemplateHtml(product.template_url);
        }

        // Fallback Default jika semua kosong
        if (!subjectTpl) subjectTpl = `Pesanan: {{product_name}}`;
        if (!bodyTpl) bodyTpl = `<div style="font-family: Arial;"><h2>Terima Kasih</h2><p>Kode: <b>{{transaction_id}}</b></p></div>`;

        // Replace Variabel
        const finalSubject = subjectTpl
            .replace(/{{product_name}}/g, product.name)
            .replace(/{{transaction_id}}/g, transactionId)

        const finalHtml = bodyTpl
            .replace(/{{product_name}}/g, product.name)
            .replace(/{{product_code}}/g, product.product_code || 'Akses Otomatis')
            .replace(/{{buyer_email}}/g, email_pembeli)
            .replace(/{{transaction_id}}/g, transactionId)

        // Kirim via Gmail API
        const rawMessage = createEmailMessage(email_pembeli, finalSubject, finalHtml);
        await gmailService.users.messages.send({
            userId: 'me',
            requestBody: { raw: rawMessage }
        });

      } catch (e) {
          console.error(`Gagal kirim email ${product.name}:`, e.message)
      }
      await gmailService.users.messages.send({
        userId: 'me',
        requestBody: { raw: rawMessage }
      })
    }

    // 4. SIMPAN HISTORY (SATU KALI SAJA UNTUK SEMUA PRODUK)
    // Gabungkan nama produk jika membeli banyak
    const productNames = products.map(p => p.name).join(', ');
    const productCountInfo = products.length > 1 ? ` (${products.length} items)` : '';

    const { error: historyError } = await supabase.from('history').insert({
      buyer_email: email_pembeli,
      product_name: productNames + productCountInfo,
      product_code: firstProductCode, 
      generated_id: transactionId,
      status: 'SUCCESS'
    })

    if (historyError) {
      console.error("History Error:", historyError)
    }

    // 4. RESPONSE SUKSES
    return NextResponse.json({ 
        message: 'Order berhasil', 
        data: responseData 
    })

  } catch (error) {
    console.error("SERVER ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}