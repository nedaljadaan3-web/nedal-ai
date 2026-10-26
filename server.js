
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json({ limit: "20kb" }));

// عرض واجهة NEDAL AI الرئيسية
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// استقبال الرسائل والرد عليها
app.post("/api/chat", async (req, res) => {
  const message = req.body?.message;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      error: "اكتب رسالتك أولًا."
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "مفتاح الذكاء الاصطناعي غير موجود في الخادم."
    });
  }

  try {
    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          instructions:
            "أنت NEDAL AI، مساعد ذكي. أجب بلغة المستخدم، واستخدم العربية عندما يكتب بالعربية.",
          input: message.trim(),
          max_output_tokens: 700
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);

      return res.status(502).json({
        error: "تعذر الحصول على الإجابة. تحقق من إعدادات API والرصيد."
      });
    }

    const reply = (data.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text || "")
      .join("\n")
      .trim();

    if (!reply) {
      return res.status(502).json({
        error: "لم تصل إجابة من الذكاء الاصطناعي."
      });
    }

    return res.json({ reply });

  } catch (error) {
    console.error("Chat error:", error);

    return res.status(500).json({
      error: "حدث خطأ أثناء الاتصال بالخدمة."
    });
  }
});

// تشغيل الخادم
const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`NEDAL AI server listening on port ${port}`);
});

