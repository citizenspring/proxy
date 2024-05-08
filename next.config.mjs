/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { has: [{ type: "host", value: "solarpunk.brussels"}], source: "/", destination: "https://fun-closet-618154.framer.app" },
        { has: [{ type: "host", value: "solarpunk.brussels"}], source: "/:path*", destination: "https://fun-closet-618154.framer.app/:path*"},
        { has: [{ type: "host", value: "regenvillage.brussels"}], source: "/", destination: "https://www.regensunite.earth/event/regenvillage" },
        { has: [{ type: "host", value: "regenvillage.brussels"}], source: "/:path*", destination: "https://www.regensunite.earth/event/regenillage/:path*"},
      ],
    };
  }
}
export default nextConfig;
