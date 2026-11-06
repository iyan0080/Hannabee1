import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

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

// Gemini AI Client Configuration
const getAiClient = () => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error("Error initializing GoogleGenAI client:", err);
    return null;
  }
};

const WARUNG_AI_SYSTEM_INSTRUCTION = `Anda adalah Asisten Bisnis & Keuangan Warung AI untuk "HannaBee (Jajanan Wareg Seger)", sebuah aplikasi kasir POS dan pembukuan warung kuliner modern.
Tugas Anda:
1. Memberikan saran bisnis praktis, ramah, dan berorientasi hasil untuk pemilik warung dan kasir dalam Bahasa Indonesia yang santun dan profesional.
2. Membantu membuat salinan teks promosi WhatsApp yang menarik, persuasif, siap kirim ke pelanggan (dilengkapi emoji yang pas dan format tebal/italic WhatsApp).
3. Memberikan analisis performa penjualan, margin laba, efisiensi belanja bahan baku, penagihan kasbon sopan, dan tips operasional warung harian.
4. Jawaban selalu ringkas, terstruktur rapi dengan poin-poin jelas, realistis untuk usaha kuliner/warung makan-minum, dan langsung dapat dieksekusi.`;

// Gemini AI Advisor Endpoint
app.post("/api/ai/advisor", async (req, res) => {
  const { action, prompt, summary, messageHistory } = req.body || {};

  try {
    const ai = getAiClient();
    const storeName = summary?.storeName || "HannaBee";

    if (!ai) {
      // Graceful fallback when API key is not yet set
      let fallbackContent = "";
      if (action === "promo") {
        fallbackContent = `🌟 *PROMO SPESIAL DARI ${storeName.toUpperCase()}!*\n\nHalo Sahabat ${storeName}! Yuk segarkan hari Anda dengan aneka jajanan lezat & minuman segar favorit kami. 🍹🍟\n\n✨ Menu Terlaris Hari Ini Siap Dinikmati!\n📦 Bisa pesan langsung atau antar ke lokasi Anda.\n\n📲 *Yuk pesan sekarang via WhatsApp:* ${summary?.phone || "Chat kami di sini"}\n_Jajanan Wareg Seger - Nikmat & Hemat!_`;
      } else if (action === "business_summary") {
        fallbackContent = `📊 *Ringkasan Kinerja Usaha Warung ${storeName}*\n\n1. *Penjualan & Omzet*: Terus pantau transaksi harian dan pertahankan jam operasional di jam makan siang & sore hari.\n2. *Manajemen Kasbon*: Lakukan rekonsiliasi kasbon berkala agar arus kas laci kasir tetap lancar.\n3. *Stok Bahan Baku*: Catat bahan yang menipis di menu Belanja Bahan agar tidak kehabisan saat jam ramai.`;
      } else {
        fallbackContent = `Halo! Saya Asisten AI ${storeName}. Ada yang bisa saya bantu terkait strategi penjualan, pembuatan promo menu WhatsApp, atau efisiensi belanja bahan baku warung Anda hari ini?`;
      }
      return res.json({
        success: true,
        content: fallbackContent,
        isFallback: true,
      });
    }

    let userPrompt = "";

    if (action === "promo") {
      const topic = prompt || "Promo menu favorit & diskon akhir pekan";
      userPrompt = `Buatkan 1 draf pesan promosi WhatsApp yang sangat menarik dan siap kirim untuk pelanggan warung '${storeName}'.
Topik/fokus promosi: "${topic}".
Konteks warung:
- Nama Usaha: ${storeName}
- Tagline: ${summary?.tagline || "Jajanan Wareg Seger"}
- Nomor Kontak: ${summary?.phone || ""}
- Menu terlaris/unggulan: ${summary?.topMenus || "Camilan gurih & minuman segar"}
Instruksi:
- Gunakan format teks WhatsApp (*tebal*, _miring_).
- Pasang emoji kuliner yang menggiurkan.
- Sertakan salam ramah, highlight menu, dan ajakan bertindak (Call to Action) pesan via WA yang jelas.
- Jangan terlalu panjang (maksimal 3-4 paragraf pendek).`;
    } else if (action === "business_summary") {
      userPrompt = `Berikan analisis bisnis singkat & padat untuk pemilik warung '${storeName}' berdasarkan data operasional berikut:
- Periode: ${summary?.periodLabel || "Saat Ini"}
- Total Omzet Penjualan: Rp ${(summary?.revenue || 0).toLocaleString("id-ID")}
- Total Transaksi: ${summary?.transactionCount || 0} nota
- Laba Kotor: Rp ${(summary?.grossProfit || 0).toLocaleString("id-ID")}
- Beban Pengeluaran: Rp ${(summary?.expensesTotal || 0).toLocaleString("id-ID")}
- Kasbon Pelanggan Belum Lunas: Rp ${(summary?.unpaidDebtTotal || 0).toLocaleString("id-ID")}
- Menu Terlaris: ${summary?.topProducts || "-"}

Format respon dalam 4 poin praktis:
1. 📈 **Sorotan Kinerja**: Evaluasi singkat omzet & margin laba.
2. ⭐ **Menu Unggulan**: Analisis menu yang paling mendorong profit.
3. ⚠️ **Perhatian Operasional**: Catatan mengenai kasbon atau pengeluaran jika perlu dikendalikan.
4. 🎯 **Rekomendasi Aksi Cepat**: 2 saran konkret yang bisa diterapkan hari ini untuk meningkatkan omzet.`;
    } else if (action === "shopping_optimizer") {
      userPrompt = `Bantu optimalkan rencana belanja bahan baku warung '${storeName}'.
Kondisi saat ini:
- Stok Menipis/Habis: ${summary?.lowStockItems || "Tidak ada yang mendesak"}
- Rencana Belanja Saat Ini: ${summary?.pendingItems || "Belum ada item"}
- Estimasi Anggaran: Rp ${(summary?.estimatedBudget || 0).toLocaleString("id-ID")}

Berikan saran ringkas:
1. Bahan yang wajib diprioritaskan agar dapur/kasir tidak kehabisan stok.
2. Tips belanja hemat (pembelian grosir/eceran di pasar).
3. Tips penyimpanan bahan agar tidak cepat layu atau rusak.`;
    } else {
      // General Warung Consultation
      const historyContext = Array.isArray(messageHistory) && messageHistory.length > 0
        ? `Riwayat percakapan sebelumnya:\n${messageHistory.map((m: any) => `${m.role === 'user' ? 'Kasir' : 'AI'}: ${m.text}`).join('\n')}\n\n`
        : "";

      userPrompt = `${historyContext}Pertanyaan Pemilik/Kasir Warung '${storeName}':\n"${prompt || 'Berikan tips meningkatkan omzet warung hari ini'}"`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: userPrompt,
      config: {
        systemInstruction: WARUNG_AI_SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    const reply = response.text || "Tidak ada balasan dari model.";
    return res.json({
      success: true,
      content: reply,
    });
  } catch (error: any) {
    console.error("Gemini AI Advisor Error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Terjadi kendala saat memproses permintaan AI.",
    });
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
