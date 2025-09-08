const express = require('express');
const OpenAI = require('openai');
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Initialize WooCommerce API
const WooCommerce = new WooCommerceRestApi({
  url: process.env.WC_STORE_URL || "https://pepeurope.net",
  consumerKey: process.env.WC_CONSUMER_KEY || "ck_aa49d81a34f421cd81b0caa77edd3c3feefccc1d",
  consumerSecret: process.env.WC_CONSUMER_SECRET || "cs_f24f3c26f9cd6d04f6121dbd975066ae7ca24bbb",
  version: 'wc/v3'
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Company Data
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

// AI Quiz/Calculator System
async function runAICalculator(userData) {
  const { currentWeight, goalWeight, timeframe, goalType, experience } = userData;
  
  const weightToLose = currentWeight - goalWeight;
  const weeklyGoal = weightToLose / timeframe;
  
  let intensity = 'beginner';
  if (weeklyGoal > 1.0) intensity = 'intermediate';
  if (weeklyGoal > 1.5) intensity = 'advanced';
  
  const products = await getWebsiteProducts();
  const productKnowledge = products.map(p => 
    `- ${p.name}: €${p.price} | ${p.permalink}`
  ).join('\n');

  const systemPrompt = `
You are PepEurope's AI Fitness Calculator. Based on user data, recommend products and create a personalized plan.

USER DATA:
- Current Weight: ${currentWeight} kg
- Goal Weight: ${goalWeight} kg  
- Timeframe: ${timeframe} weeks
- Weight to lose: ${weightToLose} kg
- Weekly goal: ${weeklyGoal.toFixed(1)} kg/week
- Goal Type: ${goalType}
- Experience: ${experience}
- Intensity Level: ${intensity}

PRODUCTS AVAILABLE:
${productKnowledge}

Create a personalized response that:
1. Acknowledges their goal of losing ${weightToLose} kg in ${timeframe} weeks
2. Explains this is ${intensity} intensity (${weeklyGoal.toFixed(1)} kg/week)
3. Recommends 2-3 specific products from the list above with exact URLs
4. Provides brief educational information about each product
5. Mentions this is for research purposes only
6. Encourages consulting healthcare professionals
7. Keep it warm, professional, and encouraging

Response format: Use bullet points and product links.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: "Create my personalized plan based on the data above."
      }
    ],
    max_tokens: 300,
    temperature: 0.7
  });

  return completion.choices[0].message.content;
}

// API endpoint for chat
app.post('/api/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    
    // Check if user wants to start quiz/calculator
    if (userMessage.toLowerCase().includes('calculator') || 
        userMessage.toLowerCase().includes('quiz') ||
        userMessage.toLowerCase().includes('recommend') ||
        userMessage.toLowerCase().includes('weight loss') ||
        userMessage.toLowerCase().includes('personalized')) {
      
      const quizResponse = `🎯 **Personalized Product Calculator** 🎯

I'd love to help you find the perfect research products! Let's run a quick assessment:

Please provide your information in this format:
**"current_weight, goal_weight, timeframe, goal_type, experience"**

Example: "85, 70, 12, weight_loss, beginner"

- **Current Weight** (kg)
- **Goal Weight** (kg)  
- **Timeframe** (weeks)
- **Goal Type**: weight_loss / muscle_gain / wellness
- **Experience**: beginner / intermediate / advanced`;

      return res.json({ reply: quizResponse });
    }

    // Check if user is providing quiz answers (format: "85, 70, 12, weight_loss, beginner")
    if (userMessage.match(/^\d+,\s*\d+,\s*\d+,\s*\w+,\s*\w+$/)) {
      const [currentWeight, goalWeight, timeframe, goalType, experience] = 
        userMessage.split(',').map(item => item.trim());
      
      const userData = {
        currentWeight: parseInt(currentWeight),
        goalWeight: parseInt(goalWeight),
        timeframe: parseInt(timeframe),
        goalType: goalType.toLowerCase(),
        experience: experience.toLowerCase()
      };
      
      const aiResponse = await runAICalculator(userData);
      return res.json({ reply: aiResponse });
    }

    // Regular chat processing
    const products = await getWebsiteProducts();
    const productKnowledge = products.map(p => 
      `- ${p.name}: €${p.price} | ${p.permalink}`
    ).join('\n');

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

PRODUCT LIST:
${productKnowledge}

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`PepEurope AI server with calculator running on port ${port}`);
});