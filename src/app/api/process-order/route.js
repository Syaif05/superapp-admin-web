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

const getTemplate = async (type) => {
    const { data } = await supabase
        .from('email_templates')
        .select('*')
        .eq('type', type)
        .single()
    return data
}

export async function POST(req) {
  try {
    const { email_pembeli, product_ids } = await req.json()
    const transactionId = `TRX-${Date.now()}`
    
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
    const responseData = []

    for (const product of products) {
      if (product.group_email) {
        try {
          await adminService.members.insert({
            groupKey: product.group_email,
            requestBody: { email: email_pembeli, role: product.role || 'MEMBER' }
          })
        } catch (err) {} 
      }
      
      await supabase.from('history').insert({
        buyer_email: email_pembeli,
        product_name: product.name,
        product_code: product.product_code,
        generated_id: transactionId,
        status: 'SUCCESS'
      })
      
      successList.push(product)
      
      responseData.push({
          id: transactionId,
          status: 'Sent',
          product_name: product.name,
          product_code: product.product_code
      })
    }

    try {
        const templateData = await getTemplate('order_success') 
        
        let emailSubject = templateData?.subject_template || `Pesanan Berhasil: {{product_names}} (#{{transaction_id}})`
        let emailHtml = templateData?.html_content || `<h1>Terima Kasih</h1><p>Pesanan {{product_names}} berhasil.</p>`

        const productNames = successList.map(p => p.name).join(', ')
        const productRows = successList.map(p => `
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">${p.name}</td>
                <td style="padding: 10px; border: 1px solid #ddd;"><b>${p.product_code || 'Akses Grup Aktif'}</b></td>
            </tr>
        `).join('')

        emailSubject = emailSubject
            .replace(/{{transaction_id}}/g, transactionId)
            .replace(/{{product_names}}/g, productNames)

        emailHtml = emailHtml
            .replace(/{{transaction_id}}/g, transactionId)
            .replace(/{{buyer_email}}/g, email_pembeli)
            .replace(/{{product_names}}/g, productNames)
            .replace(/{{product_table}}/g, productRows)

        const rawMessage = createEmailMessage(email_pembeli, emailSubject, emailHtml);

        await gmailService.users.messages.send({
            userId: 'me',
            requestBody: { raw: rawMessage }
        });

    } catch (emailError) {}

    return NextResponse.json({ 
        message: 'Order berhasil', 
        data: responseData 
    })

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}