import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * 홍보 영상은 public/promo 안의 정적 HTML이다. 상대 경로로 에셋을 불러오므로
   * 폴더 주소(/promo)가 아니라 실제 파일 주소로 보내 준다.
   */
  async redirects() {
    return [
      { source: "/promo", destination: "/promo/index.html", permanent: false },
      { source: "/promo/shorts", destination: "/promo/shorts.html", permanent: false },
    ];
  },
};

export default nextConfig;
