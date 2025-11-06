// btc-aml-alert.js
import WebSocket from "ws";
import sdk from "node-appwrite";

// Configuración Appwrite
const client = new sdk.Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT) // URL de tu proyecto Appwrite
  .setProject(process.env.APPWRITE_PROJECT_ID) // ID del proyecto
  .setKey(process.env.APPWRITE_API_KEY); // API Key con permisos de escritura

const db = new sdk.Databases(client);
const DATABASE_ID = "default"; // Appwrite usa "default" por defecto
const TABLE_ID = process.env.APPWRITE_TABLE_ID; // ID de tu tabla "Alerts aml"
const BTC_THRESHOLD = parseFloat(process.env.BTC_THRESHOLD || "0.05"); // umbral de alerta

// Conectar al WebSocket de mempool.space
const ws = new WebSocket("wss://mempool.space/api/v1/ws");

ws.on("open", () => {
  console.log("✅ Conectado a mempool.space WebSocket");
  ws.send(JSON.stringify({ action: "want", data: ["transactions"] }));
});

ws.on("message", async (rawData) => {
  try {
    const msg = JSON.parse(rawData.toString());
    if (!msg.transactions) return;

    for (const tx of msg.transactions) {
      // Calcular el total de BTC en la transacción
      const totalBTC = tx.vout.reduce((sum, o) => sum + o.value, 0);

      if (totalBTC >= BTC_THRESHOLD) {
        const report = `🚨 Alerta AML: Transacción ${tx.txid} detectada con ${totalBTC} BTC. Revisión recomendada.`;

        await db.createDocument(DATABASE_ID, TABLE_ID, sdk.ID.unique(), {
          TotalBTC: totalBTC,       // columna adaptada
          report: report,
          $createdAt: new Date().toISOString(), // opcional, Appwrite lo genera si no lo pones
        });

        console.log("🔔 ALERTA AML:", tx.txid, totalBTC);
      }
    }
  } catch (error) {
    console.error("❌ Error procesando mensaje:", error);
  }
});
