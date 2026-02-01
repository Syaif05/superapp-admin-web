import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { NextResponse } from 'next/server'

// Helper: Decode Kunci
const getPrivateKey = () => {
  const key = process.env.GOOGLE_PRIVATE_KEY || '';
  if (key.startsWith('LS0t')) {
    return Buffer.from(key, 'base64').toString('utf-8');
  }
  return key.replace(/\\n/g, '\n');
};

// Helper: Format Email Raw
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

// Helper Baru: Ambil HTML dari URL jika body kosong
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

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

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
    
    // Ambil produk dan data template yang ada
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .in('id', product_ids)

    if (!products || products.length === 0) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
    }

    const adminService = google.admin({ version: 'directory_v1', auth: jwtClient })
    const gmailService = google.gmail({ version: 'v1', auth: jwtClient })
    
    const responseData = []

    // --- LOOPING PRODUK ---
    for (const product of products) {
      // 1. Masukkan ke Group (Jika ada)
      if (product.group_email) {
        try {
          await adminService.members.insert({
            groupKey: product.group_email,
            requestBody: { email: email_pembeli, role: product.role || 'MEMBER' }
          })
        } catch (err) {} 
      }
      
      // 2. Simpan History
      await supabase.from('history').insert({
        buyer_email: email_pembeli,
        product_name: product.name,
        product_code: product.product_code,
        generated_id: transactionId,
        status: 'SUCCESS'
      })
      
      // Data untuk Balikan ke HP
      responseData.push({
          id: transactionId,
          status: 'Sent',
          product_name: product.name,
          product_code: product.product_code
      })

      // 3. LOGIKA TEMPLATE CERDAS (DB -> URL -> Default)
      try {
        let subjectTpl = product.email_subject
        let bodyTpl = product.email_body

        // JIKA DI DB KOSONG, AMBIL DARI URL (Sesuai database lama Anda)
        if (!bodyTpl && product.template_url) {
            console.log(`Mengambil template dari URL untuk: ${product.name}`);
            bodyTpl = await fetchTemplateHtml(product.template_url);
        }

        // Fallback Default jika semua kosong
        if (!subjectTpl) subjectTpl = `Pesanan: {{product_name}}`;
        if (!bodyTpl) bodyTpl = `<div style="font-family: Arial; padding: 20px;"><h2>Terima Kasih</h2><p>Anda telah membeli <b>{{product_name}}</b></p><p>Kode Akses: <b>{{product_code}}</b></p></div>`;

        // Ganti Variabel
        const finalSubject = subjectTpl
            .replace(/{{product_name}}/g, product.name)
            .replace(/{{transaction_id}}/g, transactionId)

        const finalHtml = bodyTpl
            .replace(/{{product_name}}/g, product.name)
            .replace(/{{product_code}}/g, product.product_code || 'Akses Otomatis')
            .replace(/{{buyer_email}}/g, email_pembeli)
            .replace(/{{transaction_id}}/g, transactionId)

        // Kirim
        const rawMessage = createEmailMessage(email_pembeli, finalSubject, finalHtml);
        await gmailService.users.messages.send({
            userId: 'me',
            requestBody: { raw: rawMessage }
        });

      } catch (e) {
          console.error(`Gagal kirim email ${product.name}:`, e.message)
      }
    }

    return NextResponse.json({ 
        message: 'Order berhasil', 
        data: responseData 
    })

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}