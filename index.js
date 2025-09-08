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

// Predefined product recommendations for the calculator
const productRecommendations = {
  weightLoss: {
    beginner: [
      { 
        name: "AOD-9604 5mg", 
        url: "https://pepeurope.net/en/product/aod-9604-5mg/", 
        price: "€59.99",
        description: "Supports metabolism and fat loss research"
      },
      { 
        name: "Metabo MIC Energy", 
        url: "https://pepeurope.net/en/product/metabo-mic-energy/", 
        price: "€65.99",
        description: "For energy and metabolic support research"
      }
    ],
    intermediate: [
      { 
        name: "RetaTirz Complex 10 mg", 
        url: "https://pepeurope.net/product/retatirz-complex-weight-10mg/", 
        price: "€89.99",
        description: "Advanced formula for weight management research"
      }
    ],
    advanced: [
      { 
        name: "Survo 12 mg", 
        url: "https://pepeurope.net/product/survo-12mg/", 
        price: "€79.99",
        description: "For intensive weight management research"
      },
      { 
        name: "Tesamorelin 5mg", 
        url: "https://pepeurope.net/en/product/tesamorelin-5mg/", 
        price: "€72.99",
        description: "Advanced research compound for body composition"
      }
    ]
  },
  muscleGain: [
    { 
      name: "GHRP-6", 
      url: "https://pepeurope.net/en/product/ghrp-6-5mg/", 
      price: "€67.99",
      description: "For muscle growth and recovery research"
    }
  ],
  wellness: [
    { 
      name: "BPC-157", 
      url: "https://pepeurope.net/en/product/bpc-157-5mg/", 
      price: "€61.99",
      description: "For wellness and recovery research"
    }
  ]
};

// AI Quiz/Calculator Function
function calculateProductRecommendation(userData) {
  const { currentWeight, goalWeight, timeframe, goalType, experience } = userData;
  
  const weightToLose = currentWeight - goalWeight;
  const weeklyGoal = weightToLose / timeframe;
  
  // Determine intensity level
  let intensity = 'beginner';
  if (weeklyGoal > 1.0) intensity = 'intermediate';
  if (weeklyGoal > 1.5) intensity = 'advanced';
  
  // Get recommended products
  let recommendedProducts = [];
  if (goalType === 'weight_loss') {
    recommendedProducts = productRecommendations.weightLoss[intensity] || productRecommendations.weightLoss.beginner;
  } else if (goalType === 'muscle_gain') {
    recommendedProducts = productRecommendations.muscleGain;
  } else {
    recommendedProducts = productRecommendations.wellness;
  }
  
  // Create personalized message
  let response = `🎯 **Personalized Recommendation Based on Your Goals** 🎯\n\n`;
  response += `Based on your input:\n`;
  response += `- Current Weight: ${currentWeight} kg\n`;
  response += `- Goal Weight: ${goalWeight} kg\n`;
  response += `- Timeframe: ${timeframe} weeks\n`;
  response += `- Weight to lose: ${weightToLose} kg (${weeklyGoal.toFixed(1)} kg/week)\n`;
  response += `- Intensity: ${intensity} level\n\n`;
  
  response += `💡 **Recommended Research Products:**\n\n`;
  
  recommendedProducts.forEach(product => {
    response += `• **${product.name}** (${product.price}) - ${product.description}\n`;
    response += `  🔗 ${product.url}\n\n`;
  });
  
  response += `📝 **Note:** These products are for research purposes only. Always consult with healthcare professionals before starting any research program.\n\n`;
  response += `Need more specific advice? Email us at sales@pepeurope.net`;
  
  return response;
}

// API endpoint for chat
app.post('/api/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    
    // Check if user wants to start quiz/calculator
    const quizTriggers = ['calculator', 'quiz', 'recommend', 'weight loss', 'personalized', 'lose weight', 'goal'];
    const wantsQuiz = quizTriggers.some(trigger => userMessage.toLowerCase().includes(trigger));
    
    if (wantsQuiz) {
      const quizResponse = `🎯 **Personalized Product Calculator** 🎯

I'll help you find the perfect research products! Please provide your information in this format:

**"current_weight, goal_weight, timeframe, goal_type, experience"**

📋 **Example:** "85, 70, 12, weight_loss, beginner"

• **Current Weight** (kg) - Your current weight
• **Goal Weight** (kg) - Your target weight  
• **Timeframe** (weeks) - How many weeks to reach your goal
• **Goal Type** - weight_loss / muscle_gain / wellness
• **Experience** - beginner / intermediate / advanced

Just type your answers in the format above 👆`;

      return res.json({ reply: quizResponse });
    }

    // Check if user is providing quiz answers (format: "85, 70, 12, weight_loss, beginner")
    if (userMessage.match(/^\d+,\s*\d+,\s*\d+,\s*\w+,\s*\w+$/)) {
      const [currentWeight, goalWeight, timeframe, goalType, experience] = 
        userMessage.split(',').map(item => item.trim());
      
      // Validate inputs
      if (currentWeight <= goalWeight) {
        return res.json({ reply: "Please ensure your current weight is higher than your goal weight for weight loss goals." });
      }
      
      const userData = {
        currentWeight: parseInt(currentWeight),
        goalWeight: parseInt(goalWeight),
        timeframe: parseInt(timeframe),
        goalType: goalType.toLowerCase(),
        experience: experience.toLowerCase()
      };
      
      const aiResponse = calculateProductRecommendation(userData);
      return res.json({ reply: aiResponse });
    }

    // Regular chat processing
    const products = await getWebsiteProducts();
    const productKnowledge = products.map(p => 
      `- ${p.name}: €${p.price} | ${p.permalink}`
    ).join('\n');

    const systemPrompt = `You are PepEurope Research Assistant...`; // Your existing prompt

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`PepEurope AI server with calculator running on port ${port}`);
});