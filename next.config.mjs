/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: Ini membolehkan build sukses meski ada error linting
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Jika pakai TS, ini akan ignore error tipe data saat build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;