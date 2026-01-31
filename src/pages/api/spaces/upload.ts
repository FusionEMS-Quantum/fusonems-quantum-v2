import type { NextApiRequest, NextApiResponse } from "next"
import formidable from "formidable"
import fs from "fs"

// Dummy Spaces upload endpoint for demo
export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }
  const orgId = req.query.orgId || "demo-org"
  const bucket = req.query.bucket || "business"
  const form = new formidable.IncomingForm()
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: "Upload error" })
    const raw = files.file
    const file = Array.isArray(raw) ? raw[0] : raw
    if (!file || typeof file === "undefined") return res.status(400).json({ error: "No file uploaded" })
    const f = file as { originalFilename?: string; filepath: string }
    const name = f.originalFilename ?? "upload"
    const dest = `/tmp/${bucket}_${orgId}_${name}`
    fs.copyFileSync(f.filepath, dest)
    return res.status(200).json({
      message: "File uploaded (simulated)",
      key: `${bucket}/${orgId}/${name}`
    })
  })
}
