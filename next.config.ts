import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  // Redireciona links antigos /login?token=... para a tela correta de definição de senha
  async redirects() {
    return [
      {
        source: '/login',
        has: [{ type: 'query', key: 'token' }],
        destination: '/definir-senha?token=:token',
        permanent: false,
      },
    ]
  },
};

export default nextConfig;
