import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import axios from "axios";
import FormData from "form-data";

const app = express();
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3000;

app.get("/healthz", (_req, res) => {
  res.status(200).send("ok");
});

app.post("/upload", async (req, res) => {
  try {
    const { agentId, uid, fileName, content } = req.body || {};

    if (!agentId || !uid || !fileName || !content) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["agentId", "uid", "fileName", "content"]
      });
    }

    if (!process.env.PHONELY_API_KEY) {
      return res.status(500).json({
        error: "Missing PHONELY_API_KEY"
      });
    }

    // ---- create REAL file on disk ----
    const safeName = fileName.endsWith(".txt")
      ? fileName
      : `${fileName}.txt`;

    const filePath = path.join(os.tmpdir(), safeName);
    fs.writeFileSync(filePath, content, "utf8");

    // ---- build multipart EXACTLY as Phonely expects ----
    const form = new FormData();
    form.append("uid", uid);
    form.append("agentId", agentId);
    form.append(
      "files",
      fs.createReadStream(filePath),
      {
        filename: safeName,
        contentType: "text/plain"
      }
    );

    const response = await axios.post(
      "https://app.phonely.ai/api/agent-documents",
      form,
      {
        headers: {
          ...form.getHeaders(),
          "X-Authorization": process.env.PHONELY_API_KEY
        },
        maxBodyLength: Infinity
      }
    );

    fs.unlinkSync(filePath);

    return res.status(200).json({
      success: true,
      phonelyResponse: response.data
    });

  } catch (err) {
    console.error("Upload failed:", err?.response?.data || err.message);
    return res.status(500).json({
      error: "Upload to Phonely failed",
      details: err?.response?.data || err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Phonely KB upload proxy running on port ${PORT}`);
});
