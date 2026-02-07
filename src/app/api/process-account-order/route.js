import { google } from "googleapis";
import { supabase } from "@/lib/supabase";

// SERVICE ACCOUNT AUTH
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/drive.readonly"
]

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: SCOPES,
})

const gmailService = google.gmail({ version: 'v1', auth });

export async function POST(request) {
  try {
    const { product, email_pembeli } = await request.json()

    if (!product || !product.id || !email_pembeli) {
      return new Response(JSON.stringify({ error: "Data tidak lengkap" }), { status: 400 })
    }

    console.log(`[PROCESS-ACCOUNT-ORDER] Processing for ${email_pembeli}, Product: ${product.name}`)

    // 1. GET AVAILABLE STOCK (FIFO - First In First Out)
    // We order by created_at ascending to get the oldest stock first
    const { data: stocks, error: stockCheckError } = await supabase
        .from('account_stocks')
        .select('*')
        .eq('product_id', product.id)
        .eq('is_sold', false)
        .order('created_at', { ascending: true })
        .limit(1)

    if (stockCheckError) {
        throw new Error("Gagal cek stok: " + stockCheckError.message)
    }

    if (!stocks || stocks.length === 0) {
        // STOCK HABIS
        return new Response(JSON.stringify({ 
            error: "STOK_HABIS", 
            message: "Maaf, stok produk ini sedang habis." 
        }), { status: 404 })
    }

    const stock = stocks[0]
    const accountData = stock.account_data

    // 2. GENERATE TRANSACTION ID (PREFIX-RANDOM)
    const prefix = product.prefix_code || 'TRX'
    const randomStr = Math.random().toString(36).substring(2, 12).toUpperCase() // 10 chars
    const transactionId = `${prefix}-${randomStr}`

    // 3. MARK STOCK AS SOLD
    const { error: updateError } = await supabase
        .from('account_stocks')
        .update({
            is_sold: true,
            sold_at: new Date().toISOString(),
            sold_to: email_pembeli,
            transaction_id: transactionId
        })
        .eq('id', stock.id)

    if (updateError) {
        throw new Error("Gagal update stok: " + updateError.message)
    }

    // 4. GENERATE COPY TEXT FROM TEMPLATE
    // Default Template if not configured
    let template = product.account_config?.template || 
`Terimakasih sudah membeli {Nama Produk}.
Berikut detail akun anda:
Email: {Email}
Password: {Password}
Transaction ID: {Transaction ID}
`
    // Replace Placeholders
    // {Nama Produk}
    template = template.replace(/{Nama Produk}/g, product.name)
    template = template.replace(/{Transaction ID}/g, transactionId)
    template = template.replace(/{Email Pembeli}/g, email_pembeli)
    
    // Replace Dynamic Fields from Account Data
    // e.g. {Email}, {Password}, {Pin}
    Object.keys(accountData).forEach(key => {
        const regex = new RegExp(`{${key}}`, 'g') // Replace all occurrences
        template = template.replace(regex, accountData[key])
    })

    // 5. INSERT HISTORY
    const { error: historyError } = await supabase.from('history').insert({
        buyer_email: email_pembeli,
        product_name: product.name,
        product_code: transactionId, // Use TRX ID as Product Code in History
        generated_id: transactionId,
        status: 'SUCCESS',
        message: template // Save the generated copy text so user can copy it later
    })

    if (historyError) console.error("History Error:", historyError)

    // 6. RESPONSE
    return new Response(JSON.stringify({
        success: true,
        transactionId: transactionId,
        copyText: template, // This text will be shown to user to copy
        accountData: accountData // Return raw data too just in case
    }), { status: 200 })

  } catch (err) {
    console.error("Critical Error Process Account:", err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
