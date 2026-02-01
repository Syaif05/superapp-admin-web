import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import nodemailer from 'nodemailer'
import { NextResponse } from 'next/server'

// --- HELPER DECODE BASE64 ---
const getPrivateKey = () => {
  const encodedKey = process.env.GOOGLE_PRIVATE_KEY || '';
  // Jika kunci diawali "LS0t", berarti itu Base64. Kita decode.
  if (encodedKey.startsWith('LS0t')) {
    return Buffer.from(encodedKey, 'base64').toString('utf-8');
  }
  // Jika tidak, berarti masih format lama (Raw Text). Pakai langsung.
  return encodedKey.replace(/\\n/g, '\n');
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

const jwtClient = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  null,
  getPrivateKey(), // <--- PANGGIL FUNGSI INI
  [
    'https://www.googleapis.com/auth/admin.directory.group',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/drive'
  ],
  process.env.GOOGLE_ADMIN_EMAIL
)

export async function POST(req) {
  try {
    const { email_pembeli, product_ids } = await req.json()
    const transactionId = `TRX-${Date.now()}`
    
    // 1. Ambil Data Produk
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .in('id', product_ids)

    if (!products || products.length === 0) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
    }

    const adminService = google.admin({ version: 'directory_v1', auth: jwtClient })
    const successList = []

    // 2. Proses Item
    for (const product of products) {
      // Masuk Grup
      if (product.group_email) {
        try {
          await adminService.members.insert({
            groupKey: product.group_email,
            requestBody: { email: email_pembeli, role: product.role || 'MEMBER' }
          })
        } catch (err) {} 
      }
      // Simpan History
      await supabase.from('history').insert({
        buyer_email: email_pembeli,
        product_name: product.name,
        product_code: product.product_code,
        generated_id: transactionId,
        status: 'SUCCESS'
      })
      successList.push(product.name)
    }

    // 3. Kirim Email
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: process.env.GOOGLE_ADMIN_EMAIL,
            serviceClient: process.env.GOOGLE_CLIENT_EMAIL,
            privateKey: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        }
    })

    await transporter.sendMail({
        from: `"SuperApp Admin" <${process.env.GOOGLE_ADMIN_EMAIL}>`,
        to: email_pembeli,
        subject: `Pesanan Berhasil: ${transactionId}`,
        html: `<h2>Terima Kasih!</h2><p>Pesanan berhasil diproses:</p><ul>${successList.map(n => `<li><b>${n}</b></li>`).join('')}</ul>`
    })

    return NextResponse.json({ message: 'Order berhasil', data: [{ id: transactionId, status: 'Sent' }] })
  } catch (error) {
    console.error('SERVER ERROR:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}