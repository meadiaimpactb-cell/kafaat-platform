import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['mysql2', 'bcryptjs', 'exceljs', 'mammoth', 'nodemailer'],
  experimental: { serverActions: { bodySizeLimit: '30mb' } },
  poweredByHeader: false,
};
export default nextConfig;
