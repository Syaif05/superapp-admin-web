import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

// SERVICE ACCOUNT AUTH (Keep existing Google Auth)
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
  const LOG_PREFIX = `[PROCESS-ACCOUNT-ORDER-${Date.now()}]`;
  console.log(`${LOG_PREFIX} Started`);

  try {
    // 1. VALIDATE ENVIRONMENT
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error(`${LOG_PREFIX} MISSING ENV VARIABLES`);
        return new Response(JSON.stringify({ error: "Server Misconfiguration: Missing Supabase Keys" }), { status: 500 });
    }

    // 2. INIT ADMIN CLIENT (Bypass RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    // 3. PARSE REQUEST
    const { product: clientProduct, email_pembeli, stock_id } = await request.json();

    if (!clientProduct?.id || !email_pembeli) {
      console.warn(`${LOG_PREFIX} Invalid Payload`, { clientProduct, email_pembeli });
      return new Response(JSON.stringify({ error: "Data tidak lengkap (Product ID / Email)" }), { status: 400 });
    }

    console.log(`${LOG_PREFIX} Processing Order for ${email_pembeli}, ProductID: ${clientProduct.id}`);

    // 4. FETCH PRODUCT SOURCE OF TRUTH (Database)
    const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', clientProduct.id)
        .single();

    if (productError || !product) {
        console.error(`${LOG_PREFIX} Product Lookup Failed`, productError);
        throw new Error("Produk tidak ditemukan di sistem.");
    }

    // 5. STOCK SELECTION LOGIC
    let stock;

    if (stock_id) {
        // A. Specific Stock
        console.log(`${LOG_PREFIX} Selecting Specific Stock: ${stock_id}`);
        const { data: specificStock, error: specificError } = await supabaseAdmin
            .from('account_stocks')
            .select('*')
            .eq('id', stock_id)
            .eq('product_id', product.id)
            .eq('is_sold', false)
            .single();
        
        if (specificError || !specificStock) {
             console.warn(`${LOG_PREFIX} Specific Stock Not Available`, specificError);
             return new Response(JSON.stringify({ 
                error: "STOK_TIDAK_VALID", 
                message: "Stok yang dipilih sudah terjual atau tidak valid." 
            }), { status: 404 });
        }
        stock = specificStock;
    } else {
        // B. FIFO (First In First Out)
        console.log(`${LOG_PREFIX} Auto-Selecting Stock (FIFO)`);
        const { data: stocks, error: stockCheckError } = await supabaseAdmin
            .from('account_stocks')
            .select('*')
            .eq('product_id', product.id)
            .eq('is_sold', false)
            .order('created_at', { ascending: true })
            .limit(1);

        if (stockCheckError) throw new Error("Database Error (Stock Check): " + stockCheckError.message);

        if (!stocks || stocks.length === 0) {
            console.warn(`${LOG_PREFIX} Out of Stock`);
            return new Response(JSON.stringify({ 
                error: "STOK_HABIS", 
                message: "Stok produk ini sedang kosong." 
            }), { status: 404 });
        }
        stock = stocks[0];
    }

    console.log(`${LOG_PREFIX} Stock Selected: ${stock.id}`);

    // 6. GENERATE TRANSACTION & MARK AS SOLD
    const prefix = product.prefix_code || 'TRX';
    const randomStr = Math.random().toString(36).substring(2, 12).toUpperCase();
    const transactionId = `${prefix}-${randomStr}`;

    const { data: updatedStock, error: updateError } = await supabaseAdmin
        .from('account_stocks')
        .update({
            is_sold: true,
            sold_at: new Date().toISOString(),
            sold_to: email_pembeli,
            transaction_id: transactionId
        })
        .eq('id', stock.id)
        .select();

    if (updateError) throw new Error("Gagal update status stok: " + updateError.message);
    if (!updatedStock || updatedStock.length === 0) throw new Error("Gagal verifikasi update stok.");

    console.log(`${LOG_PREFIX} Stock Marked as SOLD. TRX: ${transactionId}`);

    // 7. TEMPLATE GENERATION (Robust)
    let template = product.account_config?.template || 
`Terimakasih sudah membeli {Nama Produk}.
Detail Akun:
Email: {Email}
Password: {Password}
Transaction ID: {Transaction ID}`;

    // Normalize: Replace case-insensitive standard placeholders
    const replaceTag = (text, tag, value) => {
        // Escape special regex chars in tag just in case
        const safeTag = tag.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        // Regex to match {tag} case insensitively
        const regex = new RegExp(safeTag, 'gi');
        return text.replace(regex, value || '-');
    };

    template = replaceTag(template, '{Nama Produk}', product.name);
    template = replaceTag(template, '{Transaction ID}', transactionId);
    template = replaceTag(template, '{Email Pembeli}', email_pembeli);

    // Dynamic Fields from Stock Data
    const accountData = stock.account_data || {};
    Object.keys(accountData).forEach(key => {
        template = replaceTag(template, `{${key}}`, accountData[key]);
    });

    console.log(`${LOG_PREFIX} Template Generated`);

    // 8. INSERT HISTORY
    const { error: historyError } = await supabaseAdmin.from('history').insert({
        buyer_email: email_pembeli,
        product_name: product.name,
        product_code: transactionId,
        generated_id: transactionId,
        status: 'SUCCESS',
        message: template,
        raw_data: accountData // Backup raw data
    });

    if (historyError) console.error(`${LOG_PREFIX} History Save Error`, historyError);

    // 9. RESPONSE
    return new Response(JSON.stringify({
        success: true,
        transactionId: transactionId,
        copyText: template,
        accountData: accountData
    }), { status: 200 });

  } catch (err) {
    console.error(`[PROCESS-ACCOUNT-ORDER-ERROR]`, err);
    return new Response(JSON.stringify({ 
        error: "INTERNAL_ERROR", 
        message: err.message 
    }), { status: 500 });
  }
}
