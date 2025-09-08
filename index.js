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

// Product Database with categories
const products = {
  weightLoss: {
    beginner: [
      { name: "AOD-9604 5mg", url: "https://pepeurope.net/en/product/aod-9604-5mg/", price: "€59.99" },
      { name: "Metabo MIC Energy", url: "https://pepeurope.net/en/product/metabo-mic-energy/", price: "€65.99" }
    ],
    advanced: [
      { name: "RetaTirz Complex 10 mg", url: "https://pepeurope.net/product/retatirz-complex-weight-10mg/", price: "€89.99" },
      { name: "Survo 12 mg", url: "https://pepeurope.net/product/survo-12mg/", price: "€79.99" }
    ],
    extreme: [
      { name: "Tesamorelin 5mg", url: "https://pepeurope.net/en/product/tesamorelin-5mg/", price: "€72.99" },
      { name: "CJC-1295 + IPA", url: "https://pepeurope.net/en/product/cjc-1295-ipamorelin-5mg/", price: "€84.99" }
    ]
  },
  muscleGain: [
    { name: "GHRP-6", url: "https://pepeurope.net/en/product/ghrp-6-5mg/", price: "€67.99" },
    { name: "MK-677", url: "https://pepeurope.net/en/product/mk-677-25mg/", price: "€74.99" }
  ],
  wellness: [
    { name: "BPC-157", url: "https://pepeurope.net/en/product/bpc-157-5mg/", price: "€61.99" },
    { name: "Thymosin Beta 4", url: "https://pepeurope.net/en/product/thymosin-beta-4-tb-500-5mg/", price: "€69.99" }
  ]
};

// AI Quiz System
async function runAICalculator(userData) {
  const { currentWeight, goalWeight, timeframe, goalType, experience } = userData;
  
  const weightToLose = currentWeight - goalWeight;
  const weeklyGoal = weightToLose / timeframe;
  
  let intensity = 'beginner';
  if (weeklyGoal > 1.5) intensity = 'advanced';
  if (weeklyGoal > 2.5) intensity = 'extreme';
  
  let recommendedProducts = [];
  
  if (goalType === 'weight_loss') {
    recommendedProducts = products.weightLoss[intensity] || products.weightLoss.beginner;
  } else if (goalType === 'muscle_gain') {
    recommendedProducts = products.muscleGain;
  } else {
    recommendedProducts = products.wellness;
  }
  
  // Create product list for AI
  const productList = recommendedProducts.map(p => 
    `- ${p.name}: ${p.price} | ${p.url}`
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

RECOMMENDED PRODUCTS:
${productList}

Create a personalized response that:
1. Acknowledges their goal of losing ${weightToLose} kg in ${timeframe} weeks
2. Explains this is ${intensity} intensity (${weeklyGoal.toFixed(1)} kg/week)
3. Recommends 2-3 specific products from the list above with URLs
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

// API Endpoints
app.post('/api/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    
    // Check if user wants to start quiz
    if (userMessage.toLowerCase().includes('calculator') || 
        userMessage.toLowerCase().includes('quiz') ||
        userMessage.toLowerCase().includes('recommend') ||
        userMessage.toLowerCase().includes('weight loss plan')) {
      
      const quizResponse = `🎯 **Personalized Product Calculator** 🎯

I'd love to help you find the perfect research products! Let's run a quick assessment:

1. **Current Weight** (kg): 
2. **Goal Weight** (kg):
3. **Timeframe** (weeks): 
4. **Main Goal**: weight_loss / muscle_gain / wellness
5. **Experience Level**: beginner / intermediate / advanced

Just reply with your answers like: "85, 70, 12, weight_loss, beginner"`;

      return res.json({ reply: quizResponse, isQuiz: true });
    }

    // Check if user is providing quiz answers
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

    // Regular chat
    const products = await getWebsiteProducts();
    const productKnowledge = products.map(p => 
      `- ${p.name}: €${p.price} | ${p.permalink}`
    ).join('\n');

    const systemPrompt = `You are PepEurope Research Assistant...`; // Keep your existing prompt

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

    res.json({ reply: completion.choices[0].message.content });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Connection issue. Please email us at sales@pepeurope.net" });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`PepEurope AI Calculator running on port ${port}`);
});