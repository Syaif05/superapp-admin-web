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
    const gmailService = google.gmail({ version: 'v1', auth: jwtClient }) // <-- KITA PAKAI INI
    
    const processedItems = []

    for (const item of items) {
      // 1. GOOGLE DRIVE
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

      // 2. GOOGLE GROUP
      const groupEmail = item.link_categories?.group_email
      if (groupEmail) {
        try {
            await adminService.members.insert({
                groupKey: groupEmail,
                requestBody: { email: email_pembeli, role: 'MEMBER' }
            })
        } catch (e) {}
      }

      // 3. DATABASE
      await supabase.from('history').insert({
        buyer_email: email_pembeli,
        product_name: item.name,
        product_code: 'LINK',
        generated_id: transactionId,
        status: 'SUCCESS'
      })
      processedItems.push(item.name)
    }

    // 4. KIRIM EMAIL (Via Gmail API)
    try {
        const emailContent = `
          <h2>Akses Diberikan!</h2>
          <p>ID Transaksi: <b>${transactionId}</b></p>
          <p>Item Anda:</p>
          <ul>${processedItems.map(n => `<li><b>${n}</b></li>`).join('')}</ul>
          <p>Silakan cek <b>Google Drive</b> Anda (Menu 'Dibagikan kepada saya' / 'Shared with me').</p>
        `;

        const rawMessage = createEmailMessage(
            email_pembeli, 
            `Link Akses Anda: ${transactionId}`, 
            emailContent
        );

        await gmailService.users.messages.send({
            userId: 'me',
            requestBody: { raw: rawMessage }
        });

    } catch (emailError) {
        console.error("Gagal kirim email link:", emailError.message);
    }

    return NextResponse.json({ message: 'Link order sukses', data: [transactionId] })
  } catch (error) {
    console.error("FINAL LINK ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}