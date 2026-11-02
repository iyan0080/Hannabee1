import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();

// Parse port and host from CLI args or environment variables
let port = Number(process.env.PORT) || 3000;
let host = process.env.HOST || "0.0.0.0";

const portArgIdx = process.argv.indexOf("--port");
if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
  const parsedPort = Number(process.argv[portArgIdx + 1]);
  if (!isNaN(parsedPort) && parsedPort > 0) {
    port = parsedPort;
  }
}

const hostArgIdx = process.argv.indexOf("--host");
if (hostArgIdx !== -1 && process.argv[hostArgIdx + 1]) {
  host = process.argv[hostArgIdx + 1];
}

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
  try {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        base: "/",
        server: {
          middlewareMode: true,
          hmr: false,
        },
        appType: "spa",
      });
      app.use(vite.middlewares);

      // SPA fallback in development
      app.use("*", async (req, res, next) => {
        const url = req.originalUrl;
        if (url.startsWith("/api")) {
          return next();
        }
        try {
          let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } catch (e: any) {
          vite.ssrFixStacktrace(e);
          next(e);
        }
      });
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    const server = app.listen(port, host, () => {
      console.log(`WarungKu Pintar Server running on http://${host}:${port}`);
    });

    server.on("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use.`);
      } else {
        console.error("Server error:", err);
      }
    });

    const shutdown = () => {
      server.close(() => {
        process.exit(0);
      });
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
