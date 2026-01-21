import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import axios from "axios";
import FormData from "form-data";

const app = express();

// IMPORTANT: HubSpot sends JSON
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3000;

// -----------------------------
// Health check (Render likes this)
// -----------------------------
app.get("/healthz", (_req, res) => {
  res.status(200).send("ok");
});

// -----------------------------
// Upload endpoint
// -----------------------------
app.post("/upload", async (req, res) => {
  try {
    const {
      agentId,
      uid,
      fileName,
      content
    } = req.body;

    // -----------------------------
    // Validate inputs
    // -----------------------------
    if (!agentId || !uid || !fileName || !content) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["agentId", "uid", "fileName", "content"]
      });
    }

    if (!process.env.PHONELY_API_KEY) {
      return res.status(500).json({
        error: "Missing PHONELY_API_KEY env variable"
      });
    }

    // -----------------------------
    // Create a REAL physical file
    // -----------------------------
    const tmpDir = os.tmpdir();
    const safeFileName = fileName.endsWith(".txt")
      ? fileName
      : `${fileName}.txt`;

    const filePath = path.join(tmpDir, safeFileName);

    fs.writeFileSync(filePath, content, "utf8");

    // -----------------------------
    // Build multipart form
    // -----------------------------
    const form = new FormData();
    form.append("uid", uid);
    form.append("agentId", agentId);
    form.append("files", fs.createReadStream(filePath));

    // -----------------------------
    // Send to Phonely
    // -----------------------------
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

    // -----------------------------
    // Cleanup temp file
    // -----------------------------
    fs.unlinkSync(filePath);

    return res.status(200).json({
      success: true,
      phonelyResponse: response.data
    });

  } catch (error) {
    console.error("Upload failed:", error?.response?.data || error.message);

    return res.status(500).json({
      error: "Upload to Phonely failed",
      details: error?.response?.data || error.message
    });
  }
});

// -----------------------------
// Start server
// -----------------------------
app.listen(PORT, () => {
  console.log(`Phonely upload proxy running on port ${PORT}`);
});
