import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import nodemailer from 'nodemailer'
import { NextResponse } from 'next/server'

const getPrivateKey = () => {
  const key = process.env.GOOGLE_PRIVATE_KEY || '';
  if (key.startsWith('LS0t')) {
    return Buffer.from(key, 'base64').toString('utf-8');
  }
  return key.replace(/\\n/g, '\n');
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

const jwtClient = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  null,
  getPrivateKey(),
  [
    'https://www.googleapis.com/auth/admin.directory.group',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/drive'
  ],
  process.env.GOOGLE_ADMIN_EMAIL
)

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
    const processedItems = []

    for (const item of items) {
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

      const groupEmail = item.link_categories?.group_email
      if (groupEmail) {
        try {
            await adminService.members.insert({
                groupKey: groupEmail,
                requestBody: { email: email_pembeli, role: 'MEMBER' }
            })
        } catch (e) {}
      }

      await supabase.from('history').insert({
        buyer_email: email_pembeli,
        product_name: item.name,
        product_code: 'LINK',
        generated_id: transactionId,
        status: 'SUCCESS'
      })
      processedItems.push(item.name)
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: process.env.GOOGLE_ADMIN_EMAIL,
            serviceClient: process.env.GOOGLE_CLIENT_EMAIL,
            privateKey: getPrivateKey(),
        }
    })

    await transporter.sendMail({
        from: `"SuperApp Admin" <${process.env.GOOGLE_ADMIN_EMAIL}>`,
        to: email_pembeli,
        subject: `Link Akses Anda: ${transactionId}`,
        html: `<h2>Akses Diberikan!</h2><p>Item Anda:</p><ul>${processedItems.map(n => `<li><b>${n}</b></li>`).join('')}</ul><p>Cek Google Drive (Dibagikan kepada saya).</p>`
    })

    return NextResponse.json({ message: 'Link order sukses', data: [transactionId] })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}