import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import FormData from "form-data";

const app = express();
const upload = multer(); // in-memory file handling

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { uid, agentId } = req.body;
    const file = req.file;

    if (!uid || !agentId || !file) {
      return res.status(400).json({ error: "Missing uid, agentId, or file" });
    }

    const form = new FormData();
    form.append("uid", uid);
    form.append("agentId", agentId);
    form.append("files", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype
    });

    const response = await fetch("https://app.phonely.ai/api/agent-documents", {
      method: "POST",
      headers: {
        "X-Authorization": process.env.PHONELY_API_KEY
      },
      body: form
    });

    const text = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({ error: text });
    }

    res.json(JSON.parse(text));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy listening on port ${PORT}`);
});
