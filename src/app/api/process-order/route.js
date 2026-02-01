import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import nodemailer from 'nodemailer'
import { NextResponse } from 'next/server'

// 1. Setup Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

// 2. Setup Google Auth (Service Account)
// Kunci diambil dari Environment Variables Vercel
const jwtClient = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  null,
  (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'), // Fix format baris baru
  [
    'https://www.googleapis.com/auth/admin.directory.group',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/drive'
  ],
  process.env.GOOGLE_ADMIN_EMAIL // Email admin sekolah (subjek)
)

export async function POST(req) {
  try {
    const { email_pembeli, product_ids } = await req.json()
    
    // --- STEP A: Ambil Data Produk ---
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .in('id', product_ids)

    if (!products || products.length === 0) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
    }

    const transactionId = `TRX-${Date.now()}`
    const successList = []
    const adminService = google.admin({ version: 'directory_v1', auth: jwtClient })

    // --- STEP B: Proses Setiap Produk ---
    for (const product of products) {
      // 1. Masukkan ke Google Group (Jika ada)
      if (product.group_email) {
        try {
          await adminService.members.insert({
            groupKey: product.group_email,
            requestBody: { email: email_pembeli, role: product.role || 'MEMBER' }
          })
          console.log(`Berhasil masuk grup: ${product.group_email}`)
        } catch (err) {
            // Abaikan error jika member sudah ada (409)
            if(err.code !== 409) console.error('Gagal masuk grup:', err.message)
        }
      }

      // 2. Simpan Riwayat
      await supabase.from('history').insert({
        buyer_email: email_pembeli,
        product_name: product.name,
        product_code: product.product_code,
        generated_id: transactionId,
        status: 'SUCCESS'
      })
      
      successList.push(product.name)
    }

    // --- STEP C: Kirim Email Notifikasi ---
    // Setup Transporter Email
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: process.env.GOOGLE_ADMIN_EMAIL, // Pengirim
            serviceClient: process.env.GOOGLE_CLIENT_EMAIL,
            privateKey: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        }
    })

    // Isi Email (HTML)
    const mailOptions = {
        from: `"SuperApp Admin" <${process.env.GOOGLE_ADMIN_EMAIL}>`,
        to: email_pembeli,
        subject: `Pesanan Berhasil: ${transactionId}`,
        html: `
            <h2>Terima Kasih!</h2>
            <p>Pesanan Anda telah berhasil diproses.</p>
            <ul>
                ${successList.map(name => `<li><b>${name}</b></li>`).join('')}
            </ul>
            <p>Akses telah diberikan ke email Google Anda.</p>
            <br>
            <small>ID Transaksi: ${transactionId}</small>
        `
    }

    await transporter.sendMail(mailOptions)

    return NextResponse.json({ 
        message: 'Order berhasil', 
        data: [{ id: transactionId, status: 'Sent' }] 
    })

  } catch (error) {
    console.error('SERVER ERROR:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}