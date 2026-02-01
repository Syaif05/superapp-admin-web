import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import nodemailer from 'nodemailer'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

const jwtClient = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  null,
  (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  [
    'https://www.googleapis.com/auth/admin.directory.group',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/drive' // Wajib ada untuk akses Drive
  ],
  process.env.GOOGLE_ADMIN_EMAIL
)

export async function POST(req) {
  try {
    const { email_pembeli, item_ids } = await req.json()
    const transactionId = `LINK-${Date.now()}`

    // 1. Ambil Data Item Link
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

    // 2. Proses Setiap Item
    for (const item of items) {
      // A. Beri Akses Google Drive (Jika ada link drive)
      if (item.drive_url && item.drive_url.includes('drive.google.com')) {
        try {
            // Ekstrak ID File/Folder dari URL
            // Contoh URL: https://drive.google.com/drive/folders/1abcde12345...
            const fileIdMatch = item.drive_url.match(/[-\w]{25,}/)
            if (fileIdMatch) {
                const fileId = fileIdMatch[0]
                await driveService.permissions.create({
                    fileId: fileId,
                    requestBody: {
                        role: 'reader', // Hanya bisa baca/download
                        type: 'user',
                        emailAddress: email_pembeli
                    }
                })
                console.log(`Akses Drive diberikan ke ${fileId}`)
            }
        } catch (err) {
            console.error(`Gagal akses drive ${item.name}:`, err.message)
        }
      }

      // B. Masukkan ke Grup Kategori (Jika ada)
      // Contoh: Beli "God of War", otomatis masuk grup "Pecinta PS2"
      const groupEmail = item.link_categories?.group_email
      if (groupEmail) {
        try {
            await adminService.members.insert({
                groupKey: groupEmail,
                requestBody: { email: email_pembeli, role: 'MEMBER' }
            })
        } catch (e) {} // Abaikan jika sudah masuk
      }

      // C. Simpan History
      await supabase.from('history').insert({
        buyer_email: email_pembeli,
        product_name: item.name, // Simpan nama itemnya
        product_code: 'LINK',
        generated_id: transactionId,
        status: 'SUCCESS'
      })
      
      processedItems.push(item.name)
    }

    // 3. Kirim Email Rekap
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: process.env.GOOGLE_ADMIN_EMAIL,
            serviceClient: process.env.GOOGLE_CLIENT_EMAIL,
            privateKey: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        }
    })

    const mailOptions = {
        from: `"SuperApp Admin" <${process.env.GOOGLE_ADMIN_EMAIL}>`,
        to: email_pembeli,
        subject: `Link Akses Anda: ${transactionId}`,
        html: `
            <h2>Akses Diberikan!</h2>
            <p>Berikut item yang Anda pesan:</p>
            <ul>
                ${processedItems.map(name => `<li><b>${name}</b></li>`).join('')}
            </ul>
            <p>Silakan cek Google Drive Anda (tab "Dibagikan kepada saya") atau akses link yang tersedia.</p>
        `
    }
    await transporter.sendMail(mailOptions)

    return NextResponse.json({ 
        message: 'Link order sukses', 
        data: [transactionId] 
    })

  } catch (error) {
    console.error('SERVER LINK ERROR:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}