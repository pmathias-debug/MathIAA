
import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.GEMINI_API_KEY) {
  console.error("Falta GEMINI_API_KEY en el archivo .env");
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

app.get("/api/health", (req, res) => {
  res.json({ status: "online", app: "MathIA" });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Escribe un mensaje válido."
      });
    }

    const contents = [
      ...history.slice(-20),
      { role: "user", parts: [{ text: message }] }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction:
          "Eres MathIA, un asistente inteligente, profesional, amable y claro. Responde en español cuando el usuario escriba en español."
      }
    });

    res.json({
      reply: response.text
    });

  } catch (error) {
    console.error("Error de Gemini:", error);

    res.status(500).json({
      error: "No se pudo obtener una respuesta de MathIA."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`MathIA está ejecutándose en el puerto ${PORT}`);
});
