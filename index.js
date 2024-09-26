const http = require("http");
const httpProxy = require("http-proxy");
const cheerio = require("cheerio");
const zlib = require("zlib");
const hosts = require("./hosts.json");
const proxyPort = process.env.PORT || 3000;

const proxyProcessor = (proxyRes, req, res) => {
  const buffer = [];
  let body;
  proxyRes.on("data", function (chunk) {
    buffer.push(chunk);
  });
  proxyRes.on("end", function () {
    const encoding = proxyRes.headers["content-encoding"];
    const compressedBuffer = Buffer.concat(buffer);
    delete proxyRes.headers["content-length"]; // Remove Content-Length header
    const canonicalUrl = `https://${req.headers.host}${req.url.replace(
      /\?.*$/,
      ""
    )}`;
    if (encoding === "br") {
      zlib.brotliDecompress(compressedBuffer, (err, decompressedBuffer) => {
        if (err) {
          res.writeHead(500);
          return res.end("Error decompressing Brotli response");
        }
        body = decompressedBuffer.toString("utf-8");
        body = processBody(body, canonicalUrl);
        zlib.brotliCompress(body, (err, compressedBuffer) => {
          if (err) {
            res.writeHead(500);
            return res.end("Error compressing Brotli response");
          }
          res.writeHead(proxyRes.statusCode, proxyRes.headers); // Ensure headers are set correctly
          return res.end(compressedBuffer); // Send the modified response
        });
      });
    } else if (encoding === "gzip") {
      zlib.gunzip(compressedBuffer, (err, decompressedBuffer) => {
        if (err) {
          res.writeHead(500);
          return res.end("Error decompressing Gzip response");
        }
        body = decompressedBuffer.toString("utf-8");
        body = processBody(body, canonicalUrl);
        zlib.gzip(body, (err, compressedBuffer) => {
          if (err) {
            res.writeHead(500);
            return res.end("Error compressing Gzip response");
          }
          res.writeHead(proxyRes.statusCode, proxyRes.headers); // Ensure headers are set correctly
          return res.end(compressedBuffer); // Send the modified response
        });
      });
    } else {
      body = compressedBuffer.toString("utf-8");
      body = processBody(body, canonicalUrl);
      res.writeHead(proxyRes.statusCode, proxyRes.headers); // Ensure headers are set correctly
      return res.end(body); // Send the modified response
    }
  });
};

const proxies = {};
const options = {};
for (hostname of Object.keys(hosts)) {
  options[hostname] = {
    target: hosts[hostname],
    changeOrigin: true,
    selfHandleResponse: true,
    secure: false,
  };
  proxies[hostname] = httpProxy.createProxyServer(options[hostname]);
  proxies[hostname].on("proxyRes", proxyProcessor);
}

http
  .createServer((req, res) => {
    // delete req.headers["accept-encoding"]; // Remove Accept-Encoding header
    delete req.headers["upgrade-insecure-requests"];
    delete req.headers["if-modified-since"];
    delete req.headers["if-none-match"];
    let encoding = "";
    if (req.headers["accept-encoding"].includes("br")) {
      encoding = "br";
    } else if (req.headers["accept-encoding"].includes("gzip")) {
      encoding = "gzip";
    }
    req.headers["accept-encoding"] = encoding;

    const hostname = req.headers.host.replace(/:[0-9]+$/, "");
    console.log(">>>", hostname, req.url, `(${encoding})`);

    if (!hosts[hostname]) {
      res.writeHead(404);
      return res.end(`Host ${hostname} not configured`);
    }
    // console.log(">>> req.headers", req.headers);
    proxies[hostname].web(req, res, options[hostname]);
  })
  .listen(proxyPort, () => {
    console.log(`Proxy server running on port ${proxyPort}`);
  });

function processBody(body, hostToReplace) {
  if (!body) return "";
  const $ = cheerio.load(body);
  $('link[rel="canonical"]').attr("href", hostToReplace);
  $('meta[property="og:url"]').attr("content", hostToReplace);
  // Remove the Framer badge container
  $("#__framer-badge-container").remove();
  body = $.html();
  // console.log(body);
  return body;
}
