const nodemailer = require('nodemailer');
const serviceAccount = require('./service-account.json');

// GANTI DENGAN EMAIL ADMIN SEKOLAH ANDA (SAMA SEPERTI DI VERCEL)
const ADMIN_EMAIL = 'sentralgames@tkharapanmekar.my.id'; 

console.log("📧 Mencoba login sebagai:", ADMIN_EMAIL);
console.log("🤖 Menggunakan Service Account:", serviceAccount.client_email);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: ADMIN_EMAIL,
        serviceClient: serviceAccount.client_email,
        privateKey: serviceAccount.private_key, 
    }
});

async function cekEmail() {
    try {
        console.log("⏳ Sedang memverifikasi izin Gmail...");
        await transporter.verify();
        console.log("✅ SUKSES! Izin Gmail Valid.");
    } catch (error) {
        console.error("\n❌ GAGAL! Google menolak akses Email.");
        console.error("Error Code:", error.code);
        console.error("Message:", error.message);
        
        if (error.code === 'EAUTH') {
            console.log("\n👇 PENYEBABNYA:");
            console.log("Di Google Admin Console, SCOPES (Lingkup) untuk Gmail belum dimasukkan.");
            console.log("Anda harus menambahkan: https://www.googleapis.com/auth/gmail.send");
        }
    }
}

cekEmail();