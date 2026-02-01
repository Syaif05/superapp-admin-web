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

// --- TEMPLATE ITEM (REPEATER) ---
// Ini adalah desain kartu produk yang Anda kirimkan. 
// Backend akan mengisinya berulang-ulang sesuai jumlah item.
const generateItemHtml = (name, mainUrl, driveUrl) => {
    return `
    <div class="item-card">
        <div class="item-header">
            <span class="item-title">🎮 ${name}</span>
            <span class="item-badge">ITEM</span>
        </div>
        <table class="btn-grid">
            <tr>
                <td class="btn-cell">
                    <a href="${mainUrl || '#'}" class="btn-server">
                        ⬇️ Server Utama
                    </a>
                </td>
                <td class="btn-cell">
                    <a href="${driveUrl || '#'}" class="btn-drive">
                        📂 Google Drive
                    </a>
                </td>
            </tr>
        </table>
    </div>`;
};

export async function POST(req) {
  try {
    const { email_pembeli, item_ids } = await req.json()
    const transactionId = `LINK-${Date.now()}`

    // 1. Ambil Item beserta Kategori-nya
    const { data: items } = await supabase
      .from('link_items')
      .select('*, link_categories(id, name, group_email, email_subject, email_body)')
      .in('id', item_ids)

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Item tidak ditemukan' }, { status: 404 })
    }

    const driveService = google.drive({ version: 'v3', auth: jwtClient })
    const adminService = google.admin({ version: 'directory_v1', auth: jwtClient })
    const gmailService = google.gmail({ version: 'v1', auth: jwtClient })
    
    // 2. KELOMPOKKAN ITEM BERDASARKAN KATEGORI
    // Agar jika beli 3 game PS1, cuma dikirim 1 Email Kategori PS1.
    const groupedItems = {};
    
    for (const item of items) {
       const catId = item.category_id;
       if (!groupedItems[catId]) {
           groupedItems[catId] = {
               category: item.link_categories,
               items: []
           };
       }
       groupedItems[catId].items.push(item);
    }

    const responseData = []

    // 3. PROSES PER KATEGORI (Bukan Per Item)
    for (const catId in groupedItems) {
        const group = groupedItems[catId];
        const categoryData = group.category;
        const itemList = group.items;

        // A. Proses Izin Drive & Group (Tetap dilakukan per item/kategori)
        // Invite ke Grup Kategori (Cukup sekali per kategori)
        if (categoryData.group_email) {
            try {
                await adminService.members.insert({
                    groupKey: categoryData.group_email,
                    requestBody: { email: email_pembeli, role: 'MEMBER' }
                })
            } catch (e) {}
        }

        // Share File Drive (Per Item)
        for (const item of itemList) {
            if (item.drive_url && item.drive_url.includes('drive.google.com')) {
                try {
                    const fileIdMatch = item.drive_url.match(/[-\w]{25,}/)
                    if (fileIdMatch) {
                        await driveService.permissions.create({
                            fileId: fileIdMatch[0],
                            requestBody: { role: 'reader', type: 'user', emailAddress: email_pembeli }
                        })
                    }
                } catch (err) {}
            }
            
            // Catat History
            await supabase.from('history').insert({
                buyer_email: email_pembeli,
                product_name: item.name,
                product_code: 'LINK',
                generated_id: transactionId,
                status: 'SUCCESS'
            })
            
            responseData.push({
                id: transactionId,
                status: 'Sent',
                product_name: item.name,
                product_code: 'LINK'
            })
        }

        // B. RAKIT EMAIL HTML
        try {
            // 1. Generate HTML untuk setiap item (Repeater)
            const itemsHtml = itemList.map(item => 
                generateItemHtml(item.name, item.main_url, item.drive_url)
            ).join('');

            // 2. Ambil Template Wrapper Kategori
            // Jika kosong di DB, pakai default yang sangat sederhana (User disarankan isi DB)
            let subjectTpl = categoryData.email_subject || `Akses: {{category_name}}`;
            let bodyTpl = categoryData.email_body || `
                <html><body>
                    <h1>Akses {{category_name}}</h1>
                    <div style="padding: 20px;">
                        {{items_list}}
                    </div>
                </body></html>
            `;

            // 3. Gabungkan Wrapper + Items
            const finalSubject = subjectTpl.replace(/{{category_name}}/g, categoryData.name);
            
            const finalHtml = bodyTpl
                .replace(/{{category_name}}/g, categoryData.name)
                .replace(/{{transaction_id}}/g, transactionId)
                .replace(/{{buyer_email}}/g, email_pembeli)
                .replace(/{{items_list}}/g, itemsHtml); // <-- DISINI KUNCINYA

            // 4. Kirim Email
            const rawMessage = createEmailMessage(email_pembeli, finalSubject, finalHtml);
            await gmailService.users.messages.send({
                userId: 'me',
                requestBody: { raw: rawMessage }
            });

        } catch (emailError) {
            console.error("Gagal kirim email kategori:", emailError);
        }
    }

    return NextResponse.json({ 
        message: 'Link order sukses', 
        data: responseData 
    })

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}