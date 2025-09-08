const express = require('express');
const OpenAI = require('openai');
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Initialize WooCommerce API - Uses Render environment variables
const WooCommerce = new WooCommerceRestApi({
    url: process.env.WC_STORE_URL || "https://pepeurope.net",  // ← CORRECT
  consumerKey: process.env.ck_aa49d81a34f421cd81b0caa77edd3c3feefccc1d,
  consumerSecret: process.env.cs_f24f3c26f9cd6d04f6121dbd975066ae7ca24bbb,
  version: 'wc/v3'
});

// Initialize OpenAI - Uses Render environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Company Data from your information
const companyData = {
  info: {
    website: "https://pepeurope.net/en/",
    email: "sales@pepeurope.net",
    phone: "+420604690134",
    address: "182-184 High Street North, East Ham, London, UK, E6 2JA",
    telegram: "Available 24/7 for support"
  },
  policies: {
    shipping: "Orders before 12:00 PM PST ship same day. International shipping available. Tracking provided.",
    returns: "14-day returns for unopened products. Contact sales@pepeurope.net for returns.",
    disclaimer: "All products are for research/educational purposes only. No medical advice provided."
  },
  productCategories: {
    slimmingPeptides: "https://pepeurope.net/en/product-category/slimming-peptides/",
    longevityPeptides: "https://pepeurope.net/en/product-category/slimming-peptides/?product_cat=peptydy-longlife",
    weightLossPeptides: "https://pepeurope.net/en/product-category/slimming-peptides/?product_cat=weight-loss-peptides",
    allProducts: "https://pepeurope.net/en/product-category/slimming-peptides/?product_cat=wszystkie-produkty",
    inStock: "https://pepeurope.net/en/product-category/slimming-peptides/?product_cat=wszystkie-produkty&stock=instock",
    onSale: "https://pepeurope.net/en/product-category/slimming-peptides/?product_cat=wszystkie-produkty&stock=instock&onsales=salesonly"
  }
};

// Function to get products from WooCommerce
async function getWebsiteProducts() {
  try {
    const response = await WooCommerce.get("products", {
      per_page: 50,
      status: 'publish'
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

// API endpoint for chat
app.post('/api/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    const products = await getWebsiteProducts();

    // Create product knowledge string
    const productKnowledge = products.map(p => 
      `- ${p.name}: €${p.price} | ${p.permalink}`
    ).join('\n');

    // System Prompt with all your data
    const systemPrompt = `
You are PepEurope Research Assistant. You provide information about research peptides for educational purposes.

ABSOLUTE RULES:
1. ONLY recommend products that exist in the PRODUCT LIST below
2. NEVER make up products, prices, or URLs
3. When recommending products, use EXACT URLs from the list
4. All products are for RESEARCH/EDUCATIONAL purposes only - no medical advice
5. If unsure, direct to email: ${companyData.info.email}
6. Keep responses professional and concise

COMPANY INFORMATION:
- Website: ${companyData.info.website}
- Email: ${companyData.info.email}
- Phone: ${companyData.info.phone}
- Address: ${companyData.info.address}
- Telegram: ${companyData.info.telegram}

SHIPPING POLICY:
${companyData.policies.shipping}

RETURN POLICY:
${companyData.policies.returns}

PRODUCT CATEGORIES:
- Slimming Peptides: ${companyData.productCategories.slimmingPeptides}
- Longevity Peptides: ${companyData.productCategories.longevityPeptides}
- Weight Loss Peptides: ${companyData.productCategories.weightLossPeptides}
- All Products: ${companyData.productCategories.allProducts}
- In Stock: ${companyData.productCategories.inStock}
- On Sale: ${companyData.productCategories.onSale}

PRODUCT LIST:
${productKnowledge}

DISCLAIMER:
${companyData.policies.disclaimer}

Respond helpfully and professionally:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      max_tokens: 250,
      temperature: 0.7
    });

    const aiResponse = completion.choices[0].message.content;
    res.json({ reply: aiResponse });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Connection issue. Please email us at sales@pepeurope.net" });
  }
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`PepEurope AI server running on port ${port}`);
});