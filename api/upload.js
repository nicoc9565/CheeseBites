import { put } from "@vercel/blob";

export const config = { api: { bodyParser: false } };

function checkAuth(req) {
  const password = req.headers["x-admin-password"];
  return password === process.env.ADMIN_PASSWORD;
}

async function readStream(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!checkAuth(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const contentType = req.headers["content-type"] || "application/octet-stream";
    const filename = req.headers["x-filename"] || `photo-${Date.now()}.jpg`;
    const prefix = req.headers["x-prefix"] || "gallery";
    const body = await readStream(req);

    const blob = await put(`${prefix}/${filename}`, body, {
      access: "public",
      contentType,
      allowOverwrite: true,
    });

    return res.status(200).json({ url: blob.url, pathname: blob.pathname });
  } catch (err) {
    return res.status(500).json({ error: "Upload failed" });
  }
}
