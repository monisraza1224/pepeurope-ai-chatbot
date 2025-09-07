const express = require('express');
const OpenAI = require('openai');
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;
const cors = require('cors');

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

// ==== REPLACE THESE VALUES WITH YOURS ====
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // <- CORRECT. No quotes, just the variable.
});
const WC_STORE_URL = "https://pepeurope.net"; // Your store URL
const WC_CONSUMER_KEY = "ck_aa49d81a34f421cd81b0caa77edd3c3feefccc1d"; // From WooCommerce REST API
const WC_CONSUMER_SECRET = "cs_f24f3c26f9cd6d04f6121dbd975066ae7ca24bbb"; // From WooCommerce REST API
// ==========================================

const WooCommerce = new WooCommerceRestApi({
  url: WC_STORE_URL,
  consumerKey: WC_CONSUMER_KEY,
  consumerSecret: WC_CONSUMER_SECRET,
  version: 'wc/v3'
});

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY, // Now using hardcoded value
});

app.post('/api/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant for PepEurope."
        },
        { role: "user", content: userMessage }
      ],
      max_tokens: 200,
    });
    const aiResponse = completion.choices[0].message.content;
    res.json({ reply: aiResponse });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});