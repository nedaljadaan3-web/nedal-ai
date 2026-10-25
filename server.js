const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json({ limit: "20kb" }));

app.get("/", (req, res) => {
  res.json({
    name: "NEDAL AI",
    status: "running",
    message: "NEDAL AI server is ready"
  });
});

app.post("/api/chat", async (req, res) => {
  const message = req.body && req.body.message;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      error: "Please enter a message."
    });
  }

  if (message.length > 10000) {
    return res.status(413).json({
      error: "Message is too long."
    });
  }

  // AI integration will be added after deployment.
  return res.json({
    reply:
      "وصلت رسالتك إلى خادم NEDAL AI بنجاح! " +
      "بقي ربط خدمة الذكاء الاصطناعي للحصول على إجابات حقيقية."
  });
});

const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`NEDAL AI server listening on port ${port}`);
});
