import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Runs the same way in Docker on a laptop and on a Nebius Serverless Endpoint.
  output: "standalone",
  // PGlite and onnxruntime ship native/WASM files that must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite", "onnxruntime-node"],
  images: { unoptimized: true },
};

export default nextConfig;
