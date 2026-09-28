import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));

// Server-side persistent storage file for cloud multi-device sync
const DATA_FILE = path.join(process.cwd(), "warung_cloud_data.json");

function getStoredData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading cloud data file:", err);
  }
  return null;
}

function saveStoredData(data: any) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing cloud data file:", err);
    return false;
  }
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Cloud Sync Endpoints
app.get("/api/sync", (req, res) => {
  const data = getStoredData();
  res.json({
    success: true,
    data: data,
    timestamp: Date.now()
  });
});

app.post("/api/sync", (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== "object") {
    return res.status(400).json({ success: false, error: "Invalid payload format" });
  }

  const saved = saveStoredData({
    ...payload,
    lastSyncedAt: new Date().toISOString(),
  });

  if (saved) {
    return res.json({
      success: true,
      message: "Data warung berhasil disinkronkan ke Cloud",
      lastSyncedAt: new Date().toISOString()
    });
  } else {
    return res.status(500).json({ success: false, error: "Gagal menyimpan data ke cloud server" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`WarungKu Pintar Server running on port ${PORT}`);
  });
}

startServer();
