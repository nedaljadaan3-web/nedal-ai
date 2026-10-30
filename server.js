
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json({ limit: "20kb" }));

// الصفحة الرئيسية
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// استقبال الرسائل والرد عليها باستخدام Groq
app.post("/api/chat", async (req, res) => {
  const message = req.body?.message;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      error: "اكتب رسالتك أولاً."
    });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "مفتاح Groq غير موجود في الخادم."
    });
  }

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: [
            {
              role: "system",
              content:
                "أنت NEDAL AI، مساعد ذكي ومتعدد اللغات. أجب بلغة المستخدم، واستخدم العربية عندما يكتب بالعربية. كن واضحاً ومفيداً."
            },
            {
              role: "user",
              content: message.trim()
            }
          ],
          max_completion_tokens: 1000,
          temperature: 0.7
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", data);

      return res.status(502).json({
        error: "تعذر الحصول على الإجابة من Groq. حاول مرة أخرى."
      });
    }

    const reply =
      data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(502).json({
        error: "لم تصل إجابة من الذكاء الاصطناعي."
      });
    }

    return res.json({ reply });

  } catch (error) {
    console.error("Groq Chat error:", error);

    return res.status(500).json({
      error: "حدث خطأ أثناء الاتصال بخدمة الذكاء الاصطناعي."
    });
  }
});

// تشغيل الخادم
const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`NEDAL AI server listening on port ${port}`);
});

