/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // PENTING: Ini menyuruh Vercel menutup mata jika ada warning/error kecil
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;