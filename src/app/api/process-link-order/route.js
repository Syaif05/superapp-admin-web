import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { NextResponse } from 'next/server'

const getPrivateKey = () => {
  const key = process.env.GOOGLE_PRIVATE_KEY || '';
  if (key.startsWith('LS0t')) {
    return Buffer.from(key, 'base64').toString('utf-8');
  }
  return key.replace(/\\n/g, '\n');
};

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
    const { email_pembeli, item_ids } = await req.json()
    const transactionId = `LINK-${Date.now()}`

    const { data: items } = await supabase
      .from('link_items')
      .select('*, link_categories(name, group_email)')
      .in('id', item_ids)

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Item tidak ditemukan' }, { status: 404 })
    }

    const driveService = google.drive({ version: 'v3', auth: jwtClient })
    const adminService = google.admin({ version: 'directory_v1', auth: jwtClient })
    const gmailService = google.gmail({ version: 'v1', auth: jwtClient })
    
    const processedItems = []
    const responseData = []

    for (const item of items) {
      // 1. Google Drive
      if (item.drive_url && item.drive_url.includes('drive.google.com')) {
        try {
            const fileIdMatch = item.drive_url.match(/[-\w]{25,}/)
            if (fileIdMatch) {
                await driveService.permissions.create({
                    fileId: fileIdMatch[0],
                    requestBody: { role: 'reader', type: 'user', emailAddress: email_pembeli }
                })
            }
        } catch (err) { console.error("Drive Error:", err.message) }
      }

      // 2. Google Group
      const groupEmail = item.link_categories?.group_email
      if (groupEmail) {
        try {
            await adminService.members.insert({
                groupKey: groupEmail,
                requestBody: { email: email_pembeli, role: 'MEMBER' }
            })
        } catch (e) {}
      }

      // 3. Database
      await supabase.from('history').insert({
        buyer_email: email_pembeli,
        product_name: item.name,
        product_code: 'LINK',
        generated_id: transactionId,
        status: 'SUCCESS'
      })
      processedItems.push(item)
      
      // 4. Data Balikan ke HP (Fix Null)
      responseData.push({
          id: transactionId,
          status: 'Sent',
          product_name: item.name,     // <-- Fix nama produk null
          product_code: 'LINK AKSES'    // <-- Fix kode akses
      })
    }

    // --- KIRIM EMAIL ---
    try {
        const itemNames = processedItems.map(p => p.name).join(', ');
        const emailSubject = `Akses Terkirim: ${itemNames}`;

        const emailContent = `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
            <div style="background-color: #007bff; padding: 20px; color: white; text-align: center; border-radius: 8px 8px 0 0;">
              <h2>Akses Diberikan!</h2>
            </div>
            <div style="border: 1px solid #ddd; padding: 20px; border-radius: 0 0 8px 8px;">
              <p>Akses untuk item berikut telah dibuka:</p>
              <ul>
                ${processedItems.map(n => `<li><b>${n.name}</b></li>`).join('')}
              </ul>
              <p style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #007bff;">
                Silakan cek menu <b>"Dibagikan kepada saya" (Shared with me)</b> di Google Drive Anda.
              </p>
              <p>ID Transaksi: <code>${transactionId}</code></p>
            </div>
          </div>
        `;

        const rawMessage = createEmailMessage(email_pembeli, emailSubject, emailContent);

        await gmailService.users.messages.send({
            userId: 'me',
            requestBody: { raw: rawMessage }
        });

    } catch (emailError) {
        console.error("Gagal kirim email link:", emailError.message);
    }

    return NextResponse.json({ 
        message: 'Link order sukses', 
        data: responseData // <-- Kirim data lengkap ke HP
    })

  } catch (error) {
    console.error("FINAL LINK ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}