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

// AI Warung Assistant using Gemini (gemini-3.7-flash)
let aiClient: GoogleGenAI | null = null;
function getAI() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Full-featured Gemini Chat Board Endpoint
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { messages, context, action, customPrompt } = req.body;
    const ai = getAI();

    const storeName = context?.storeName || "HannaBee Jajanan Wareg Seger";
    const baseSystemInstruction = `Anda adalah "Gemini Business AI" - asisten konsultan bisnis, akuntansi warung, dan strategi pemasaran pintar khusus untuk usaha kuliner & warung "${storeName}".
Karakter Anda: Sangat ramah, praktis, solutif, berbasis data nyata, dan menggunakan Bahasa Indonesia yang hangat, sopan, serta profesional.

Tugas & Keahlian Utama:
1. Menganalisis data penjualan, omzet harian, laba rugi, HPP, margin keuntungan, dan arus kas.
2. Memberikan rekomendasi stok barang menipis dan perencanaan belanja bahan baku.
3. Membuatkan materi promosi & broadcast WhatsApp yang menarik untuk pelanggan.
4. Membuat draf pengingat penagihan kasbon pelanggan dengan bahasa yang santun, sopan, dan tidak menyinggung.
5. Memberikan strategi bundling menu (paket hemat / combo) untuk menaikkan nilai transaksi (AOV).
6. Memberikan edukasi pembukuan sederhana SAK EMKM dan pengelolaan kas warung.

Gunakan format Markdown yang rapi dengan poin-poin, bold teks (*teks* atau **teks**), dan emoji yang sesuai agar mudah dibaca di layar HP/komputer kasir.`;

    if (!ai) {
      // Fallback rule-based smart response when API key is not yet set
      let fallbackText = "";
      if (action === "promo") {
        fallbackText = `🌟 *PROMO SPESIAL DARI ${storeName.toUpperCase()}* 🌟\n\nHalo Pelanggan Setia! Ada kabar gembira hari ini 🎉\nNikmati menu favorit dan jajanan seger pilihan dengan penawaran spesial!\n\n✨ *Keuntungan Pesan Hari Ini:*\n- Menu selalu fresh & higienis\n- Porsi pas, wareg, dan seger\n- Pesan mudah via WhatsApp, langsung disiapkan!\n\n📲 Yuk langsung hubungi kami untuk pesan sekarang ya! Terima kasih 🙏✨`;
      } else if (action === "kasbon") {
        fallbackText = `Halo Kak 🙏 Selamat siang/sore.\nSemoga sehat dan berkah selalu sekeluarga.\n\nSekadar info ramah dari admin *${storeName}*, kami sedang melakukan rekonsiliasi pembukuan berkala. Tercatat ada sisa transaksi/kasbon sebesar yang belum terselesaikan.\n\nApabila Kakak berkenan melunasi via Transfer/QRIS atau Tunai di kasir kami, berikut infonya ya. Terima kasih banyak atas kerja sama dan kepercayaannya selama ini! 🙏😊`;
      } else if (action === "stock") {
        fallbackText = `📦 *Rekomendasi Manajemen Stok & Belanja:*\n1. Utamakan belanja bahan baku untuk menu dengan penjualan tertinggi (Fast-Moving).\n2. Cek fisik stok sisa setiap sore/malam sebelum mencatat daftar belanja esok hari.\n3. Catat setiap pengeluaran belanja langsung ke Buku Kas agar HPP dan laba bersih tetap akurat.`;
      } else if (action === "bundling") {
        fallbackText = `💡 *Ide Paket Bundling Menu:* \n1. **Paket Kenyang Seger**: Gabungkan 1 Makanan Berat + 1 Minuman Segar dengan diskon Rp 2.000 dari total harga normal.\n2. **Paket Mabar / Ramean**: Paket 3 porsi camilan/gorengan + 3 minuman dengan bonus saus/topping ekstra.\n3. **Promo Jam Sepi (Happy Hour)**: Berikan ekstra porsi atau diskon 10% untuk transaksi di jam 14.00 - 16.00 WIB.`;
      } else {
        fallbackText = `Halo! Saya Asisten Gemini AI untuk *${storeName}*.\n\nAda yang bisa saya bantu hari ini? Anda dapat menanyakan:\n- Analisis performa omzet dan laba warung hari ini / bulan ini\n- Pembuatan pesan promosi WhatsApp otomatis\n- Draf pengingat kasbon pelanggan\n- Rekomendasi menu terlaris dan penataan stok bahan baku\n\nSilakan ketik pertanyaan atau klik salah satu kartu cepat di atas! 🚀`;
      }

      return res.json({
        success: true,
        content: fallbackText,
        modelUsed: "Offline Smart Fallback (Siapkan GEMINI_API_KEY untuk AI Interaktif Penuh)"
      });
    }

    // Build context grounding
    let contextPrompt = `[DATA OPERASIONAL REAL-TIME WARUNG SAAT INI]:\n`;
    if (context) {
      contextPrompt += `- Nama Usaha: ${context.storeName || storeName}\n`;
      contextPrompt += `- Waktu Saat Ini: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB\n`;
      if (context.todaySalesSummary) {
        contextPrompt += `- Ringkasan Penjualan Hari Ini: Omzet: Rp ${(context.todaySalesSummary.totalRevenue || 0).toLocaleString("id-ID")}, Laba Kotor: Rp ${(context.todaySalesSummary.grossProfit || 0).toLocaleString("id-ID")}, Total Transaksi: ${context.todaySalesSummary.transactionCount || 0} nota\n`;
      }
      if (context.monthSummary) {
        contextPrompt += `- Performa Bulan Ini: Total Penjualan: Rp ${(context.monthSummary.totalSales || 0).toLocaleString("id-ID")}, Beban Operasional: Rp ${(context.monthSummary.totalExpenses || 0).toLocaleString("id-ID")}, Laba Bersih: Rp ${(context.monthSummary.netProfit || 0).toLocaleString("id-ID")}\n`;
      }
      if (context.topProducts && context.topProducts.length > 0) {
        contextPrompt += `- Produk Terlaris: ${context.topProducts.slice(0, 5).map((p: any) => `${p.name} (${p.qtySold} terjual)`).join(", ")}\n`;
      }
      if (context.lowStockProducts && context.lowStockProducts.length > 0) {
        contextPrompt += `- Produk Stok Menipis/Habis: ${context.lowStockProducts.slice(0, 5).map((p: any) => `${p.name} (sisa ${p.stock} ${p.unit || 'pcs'})`).join(", ")}\n`;
      }
      if (context.unpaidKasbonSummary) {
        contextPrompt += `- Total Piutang/Kasbon Belum Lunas: Rp ${(context.unpaidKasbonSummary.totalUnpaid || 0).toLocaleString("id-ID")} (${context.unpaidKasbonSummary.count || 0} transaksi)\n`;
      }
      if (context.activeCustomersCount) {
        contextPrompt += `- Jumlah Pelanggan Terdaftar: ${context.activeCustomersCount} orang (Total Saldo Deposit: Rp ${(context.totalCustomerDeposits || 0).toLocaleString("id-ID")})\n`;
      }
      if (context.shoppingListSummary) {
        contextPrompt += `- Catatan Belanja Bahan: ${context.shoppingListSummary.pendingCount || 0} item belum dibeli (Estimasi Budget: Rp ${(context.shoppingListSummary.totalBudget || 0).toLocaleString("id-ID")})\n`;
      }
    }

    // Build chat contents array
    const contents: any[] = [];

    // If multi-turn message history is provided
    if (Array.isArray(messages) && messages.length > 0) {
      for (const msg of messages) {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }]
        });
      }
    } else if (customPrompt) {
      contents.push({
        role: "user",
        parts: [{ text: customPrompt }]
      });
    } else {
      contents.push({
        role: "user",
        parts: [{ text: "Halo Gemini, berikan analisis singkat kondisi warung hari ini dan 3 rekomendasi taktis." }]
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: contents,
      config: {
        systemInstruction: `${baseSystemInstruction}\n\n${contextPrompt}`,
        temperature: 0.7,
      },
    });

    const replyText = response.text || "Mohon maaf, tidak ada respons yang dihasilkan.";
    res.json({
      success: true,
      content: replyText,
      modelUsed: "gemini-3.7-flash",
    });
  } catch (error: any) {
    console.error("Gemini Chat API error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Gagal memproses permintaan Gemini AI",
    });
  }
});

// Legacy AI Advisor Endpoint for backwards compatibility
app.post("/api/ai/advisor", async (req, res) => {
  try {
    const { action, summary, prompt } = req.body;
    const ai = getAI();
    
    if (!ai) {
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
      model: "gemini-3.7-flash",
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
