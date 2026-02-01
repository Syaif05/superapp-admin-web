const serviceAccount = require('./service-account-baru.json'); // Pastikan nama file benar

console.log("==========================================");
console.log("🕵️  DETEKTIF IDENTITAS SERVICE ACCOUNT");
console.log("==========================================");
console.log("\n1. EMAIL ROBOT (client_email):");
console.log("   👉 " + serviceAccount.client_email);

console.log("\n2. CLIENT ID (unique_id) - WAJIB SAMA DENGAN ADMIN CONSOLE:");
console.log("   👉 " + serviceAccount.client_id);
console.log("   (Cek di admin.google.com > Domain Wide Delegation. Harus ANGKA INI!)");

console.log("\n3. PRIVATE KEY (Cek Format):");
if (serviceAccount.private_key && serviceAccount.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
    console.log("   ✅ Format Kunci Valid (Raw Text)");
} else {
    console.log("   ❌ Kunci Rusak/Kosong");
}

console.log("\n==========================================");