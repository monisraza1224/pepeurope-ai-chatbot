const express = require('express');
const OpenAI = require('openai');
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// WooCommerce API Setup
const WooCommerce = new WooCommerceRestApi({
  url: process.env.WC_STORE_URL || "https://pepeurope.net",
  consumerKey: process.env.WC_CONSUMER_KEY || "ck_aa49d81a34f421cd81b0caa77edd3c3feefccc1d",
  consumerSecret: process.env.WC_CONSUMER_SECRET || "cs_f24f3c26f9cd6d04f6121dbd975066ae7ca24bbb",
  version: 'wc/v3'
});

// OpenAI Setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to get products from WooCommerce
async function getWebsiteProducts() {
  try {
    const response = await WooCommerce.get("products?per_page=50");
    return response.data;
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    
    // Get real products from your website
    const products = await getWebsiteProducts();
    
    // Create product knowledge string
    const productKnowledge = products.map(product => 
      `- ${product.name}: €${product.price} | ${product.permalink}`
    ).join('\n');

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a friendly health advisor for PepEurope. Speak naturally and helpfully.

IMPORTANT RULES:
1. Keep responses clear and short
2. ONLY recommend products we actually sell
3. Always provide product links: "Check out our [Product Name] here: [product-url]"
4. Be gentle and empathetic - encourage customers to share
5. NEVER make up products or prices
6. If unsure, say "I recommend consulting our specialists at sales@pepeurope.net"

OUR PRODUCTS:
${productKnowledge}

Now help our customer:`
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    });

    const aiResponse = completion.choices[0].message.content;
    res.json({ reply: aiResponse });

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Sorry, I'm having trouble connecting. Please email us at sales@pepeurope.net" });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});