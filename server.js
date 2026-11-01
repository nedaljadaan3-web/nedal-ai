
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// الصفحة الرئيسية
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// استقبال الرسائل والصور والذاكرة
app.post("/api/chat", async (req, res) => {
  const message = req.body?.message;
  const history = req.body?.history;
  const memory = req.body?.memory;
  const image = req.body?.image;

  const savedMemory =
    typeof memory === "string"
      ? memory.trim().slice(0, 4000)
      : "";

  const userText =
    typeof message === "string" ? message.trim() : "";

  // التحقق من الرسالة أو الصورة
  if (!userText && !image) {
    return res.status(400).json({
      error: "اكتب رسالة أو أرفق صورة أولاً."
    });
  }

  // التحقق من سجل المحادثة
  if (history !== undefined && !Array.isArray(history)) {
    return res.status(400).json({
      error: "سجل المحادثة غير صالح."
    });
  }

  // التحقق من الصورة
  if (image) {
    if (
      typeof image !== "string" ||
      !/^data:image\/(jpeg|png|webp);base64,/i.test(image)
    ) {
      return res.status(400).json({
        error: "صيغة الصورة غير صالحة."
      });
    }

    if (image.length > 9 * 1024 * 1024) {
      return res.status(413).json({
        error: "الصورة كبيرة جداً. اختر صورة أصغر."
      });
    }
  }

  // مفتاح Groq
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "مفتاح Groq غير موجود في الخادم."
    });
  }

  try {
    // الاحتفاظ بآخر 20 رسالة
    const previousMessages = (history || [])
      .filter(item =>
        item &&
        ["user", "assistant"].includes(item.role) &&
        typeof item.content === "string"
      )
      .slice(-20)
      .map(item => ({
        role: item.role,
        content: item.content.slice(0, 10000)
      }));

    // اختيار النموذج المناسب
    const model = image
      ? "qwen/qwen3.8-27b"
      : "openai/gpt-oss-20b";

    // تجهيز محتوى المستخدم
    const userContent = image
      ? [
          {
            type: "text",
            text: userText ||
              "اشرح هذه الصورة واقرأ النص الظاهر فيها إن وجد."
          },
          {
            type: "image_url",
            image_url: {
              url: image
            }
          }
        ]
      : userText;

    // بناء المحادثة
    const messages = [
      {
        role: "system",
        content:
          "أنت NEDAL AI، مساعد ذكي ومتعدد اللغات. " +
          "أجب بلغة المستخدم واستخدم العربية عندما يكتب بالعربية. " +
          "تذكر سياق المحادثة السابقة واستخدمه لفهم الأسئلة الجديدة. " +
          "اسمك NEDAL AI واسم المستخدم نضال إذا ذكر ذلك. " +
          "كن واضحاً ومفيداً وصادقاً. " +
          "عند إرسال صورة، حلل محتواها وأجب عن سؤال المستخدم." +
          (
            savedMemory
              ? "\n\nمعلومات محفوظة عن المستخدم:\n" + savedMemory
              : ""
          )
      },
      ...previousMessages,
      {
        role: "user",
        content: userContent
      }
    ];

    // الاتصال بـ Groq
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          max_completion_tokens: 1000,
          temperature: 0.7
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", data);

      return res.status(502).json({
        error:
          data.error?.message ||
          "تعذر الحصول على إجابة من Groq."
      });
    }

    const reply =
      data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      console.error("Empty Groq response:", data);

      return res.status(502).json({
        error: "لم تصل إجابة من الذكاء الاصطناعي."
      });
    }

    return res.json({ reply });

  } catch (error) {
    console.error("Groq Chat error:", error);

    return res.status(500).json({
      error: "حدث خطأ أثناء الاتصال بالخدمة."
    });
  }
});

// تشغيل الخادم
const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(
    `NEDAL AI server listening on port ${port}`
  );
});
