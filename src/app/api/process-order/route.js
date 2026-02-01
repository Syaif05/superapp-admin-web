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
    const successList = []

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
      successList.push(product.name)
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
        subject: `Pesanan Berhasil: ${transactionId}`,
        html: `<h2>Terima Kasih!</h2><p>Pesanan berhasil diproses:</p><ul>${successList.map(n => `<li><b>${n}</b></li>`).join('')}</ul>`
    })

    return NextResponse.json({ message: 'Order berhasil', data: [{ id: transactionId, status: 'Sent' }] })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}