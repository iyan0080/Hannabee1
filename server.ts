import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

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

// AI Warung Assistant using Gemini
let aiClient: GoogleGenAI | null = null;
function getAI() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

app.post("/api/ai/advisor", async (req, res) => {
  try {
    const { action, summary, prompt } = req.body;
    const ai = getAI();
    
    if (!ai) {
      // Fallback smart rule-based response if no key configured
      if (action === "promo") {
        return res.json({
          success: true,
          content: `🌟 *PROMO SPESIAL WARUNG* 🌟\n\nHalo Pelanggan Setia! Ada kabar gembira nih di warung kami:\n🔥 Diskon spesial & menu favorit baru siap memanjakan lidah Anda!\n\nYuk mampir atau pesan langsung via WhatsApp ini ya. Kami siap melayani dengan sepenuh hati! 🙏✨`
        });
      }
      return res.json({
        success: true,
        content: `💡 *Saran Manajemen Warung*:\n1. Pastikan mencatat HPP dengan akurat di setiap varian menu.\n2. Tingkatkan stok menu terlaris untuk menghindari kehabisan saat jam ramai.\n3. Pantau kasbon pelanggan secara berkala dengan fitur pengingat WhatsApp.`
      });
    }

    let systemInstruction = "Anda adalah asisten konsultan bisnis ahli untuk UMKM dan Warung Indonesia bernama 'Asisten Warung Pintar'. Berikan analisis atau teks promosi yang praktis, bersahabat, terstruktur rapi, dan mudah dipahami oleh pemilik warung.";
    let userPrompt = "";

    if (action === "promo") {
      userPrompt = `Buatkan draf pesan WhatsApp promosi yang menarik, ramah, dan profesional untuk pelanggan warung. 
Konteks Warung: ${JSON.stringify(summary || {})}
Instruksi Tambahan Pemilik: ${prompt || "Promo menu terlaris & diskon spesial"}
Gunakan format WhatsApp yang rapi (gunakan emoji, bold *teks*, dan ajakan bertindak yang ramah).`;
    } else if (action === "analysis") {
      userPrompt = `Analisis performa bisnis warung berikut dan berikan 3-4 rekomendasi taktis untuk meningkatkan keuntungan & efisiensi stok:
Data Ringkasan: ${JSON.stringify(summary || {})}
Pertanyaan Pemilik: ${prompt || "Bagaimana cara meningkatkan laba bersih dan efisiensi pengeluaran?"}`;
    } else {
      userPrompt = prompt || "Berikan tips praktis pembukuan warung.";
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }
      ]
    });

    const text = response.text || "Tidak ada respons dari AI.";
    res.json({ success: true, content: text });
  } catch (error: any) {
    console.error("AI Advisor error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Gagal memproses rekomendasi AI" 
    });
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
