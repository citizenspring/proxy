/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "https://fun-closet-618154.framer.app" },
        { source: "/:path*", destination: "https://fun-closet-618154.framer.app/:path*"}
      ],
    };
  }
}
export default nextConfig;
