const express = require('express');
const { Configuration, OpenAIApi } = require('openai');
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

// Initialize OpenAI - CORRECT SYNTAX
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Predefined product recommendations for the calculator
const productRecommendations = {
  weightLoss: {
    beginner: [
      { 
        name: "AOD-9604 5mg", 
        url: "https://pepeurope.net/en/product/aod-9604-5mg/", 
        price: "€59.99",
        description: "Wspomaga metabolizm i utratę tłuszczu"
      },
      { 
        name: "Metabo MIC Energy", 
        url: "https://pepeurope.net/en/product/metabo-mic-energy/", 
        price: "€65.99",
        description: "Do wsparcia energetycznego i metabolicznego"
      }
    ],
    intermediate: [
      { 
        name: "RetaTirz Complex 10 mg", 
        url: "https://pepeurope.net/product/retatirz-complex-weight-10mg/", 
        price: "€89.99",
        description: "Zaawansowana formuła do zarządzania wagą"
      }
    ],
    advanced: [
      { 
        name: "Survo 12 mg", 
        url: "https://pepeurope.net/product/survo-12mg/", 
        price: "€79.99",
        description: "Do intensywnego zarządzania wagą"
      },
      { 
        name: "Tesamorelin 5mg", 
        url: "https://pepeurope.net/en/product/tesamorelin-5mg/", 
        price: "€72.99",
        description: "Zaawansowany składnik do kompozycji ciała"
      }
    ]
  },
  muscleGain: [
    { 
      name: "GHRP-6", 
      url: "https://pepeurope.net/en/product/ghrp-6-5mg/", 
      price: "€67.99",
      description: "Do wzrostu mięśni i regeneracji"
    }
  ],
  wellness: [
    { 
      name: "BPC-157", 
      url: "https://pepeurope.net/en/product/bpc-157-5mg/", 
      price: "€61.99",
      description: "Do dobrego samopoczucia i regeneracji"
    }
  ]
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

// AI Quiz/Calculator Function - POLISH VERSION
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
  
  // Create personalized message in POLISH
  let response = `🎯 **Spersonalizowana rekomendacja na podstawie Twoich celów** 🎯\n\n`;
  response += `Na podstawie Twoich danych:\n`;
  response += `- Obecna waga: ${currentWeight} kg\n`;
  response += `- Docelowa waga: ${goalWeight} kg\n`;
  response += `- Ram czasowy: ${timeframe} tygodni\n`;
  response += `- Waga do utraty: ${weightToLose} kg (${weeklyGoal.toFixed(1)} kg/tydzień)\n`;
  response += `- Poziom intensywności: ${intensity}\n\n`;
  
  response += `💡 **Rekomendowane produkty premium:**\n\n`;
  
  recommendedProducts.forEach(product => {
    response += `• **${product.name}** (${product.price}) - ${product.description}\n`;
    response += `  🔗 <a href="${product.url}" target="_blank" class="product-link">Zobacz Produkt</a>\n\n`;
  });
  
  response += `🌟 **Dlaczego warto wybrać PepEurope?**\n`;
  response += `- Jakość farmaceutyczna\n`;
  response += `- Testy第三方 na czystość\n`;
  response += `- Szybka wysyłka worldwide\n`;
  response += `- Eksperckie wsparcie klienta\n\n`;
  
  response += `💬 **Masz pytania?** Nasi specjaliści są dostępni pod sales@pepeurope.net`;
  
  return response;
}

// API endpoint for chat
app.post('/api/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    const language = req.body.language || 'polish'; // Default to Polish
    
    // Check if user wants to start quiz/calculator - POLISH TRIGGERS
    const quizTriggersPolish = ['kalkulator', 'quiz', 'polec', 'utrata wagi', 'spersonaliz', 'schudn', 'cel', 'dieta', 'fitness'];
    const quizTriggersEnglish = ['calculator', 'recommend', 'weight loss', 'personalized', 'lose weight', 'goal', 'diet', 'fitness'];
    
    const wantsQuiz = quizTriggersPolish.some(trigger => userMessage.toLowerCase().includes(trigger)) || 
                     quizTriggersEnglish.some(trigger => userMessage.toLowerCase().includes(trigger));
    
    if (wantsQuiz) {
      const quizResponse = `🎯 **Spersonalizowany Kalkulator Produktów** 🎯

Pomogę Ci znaleźć idealne produkty! Proszę podaj swoje informacje w tym formacie:

**"obecna_waga, docelowa_waga, czas_trwania, typ_celu, doświadczenie"**

📋 **Przykład:** "85, 70, 12, weight_loss, beginner"

• **Obecna waga** (kg) - Twoja obecna waga
• **Docelowa waga** (kg) - Twoja docelowa waga  
• **Czas trwania** (tygodnie) - Ile tygodni do osiągnięcia celu
• **Typ celu** - weight_loss / muscle_gain / wellness
• **Doświadczenie** - beginner / intermediate / advanced

Wpisz swoje odpowiedzi w formacie pokazanym powyżej 👆`;

      return res.json({ reply: quizResponse });
    }

    // Check if user is providing quiz answers (format: "85, 70, 12, weight_loss, beginner")
    if (userMessage.match(/^\d+,\s*\d+,\s*\d+,\s*\w+,\s*\w+$/)) {
      const [currentWeight, goalWeight, timeframe, goalType, experience] = 
        userMessage.split(',').map(item => item.trim());
      
      // Validate inputs
      if (currentWeight <= goalWeight && goalType === 'weight_loss') {
        return res.json({ reply: "Proszę upewnij się, że obecna waga jest wyższa niż docelowa waga dla celów utraty wagi." });
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

    // POLISH SYSTEM PROMPT
    const systemPrompt = `Jesteś Asystentem Obsługi Klienta PepEurope. Podajesz informacje o naszych premium produktach peptydowych.

ABSOLUTNE ZASADY:
1. TYLKO rekomenduj produkty, które istnieją w LIŚCIE PRODUKTÓW poniżej
2. NIGDY nie wymyślaj produktów, cen ani URL-i
3. Kiedy rekomendujesz produkty, używaj DOKŁADNYCH URL-i z listy
4. Bądź pomocny, profesjonalny i zorientowany na sprzedaż
5. Jeśli nie jesteś pewien, przekieruj na email: sales@pepeurope.net
6. Zachowuj odpowiedzi profesjonalne i zwięzłe
7. Mów naturalnie po polsku

WAŻNE: Pomagasz PRAWDZIWYM KLIENTOM z PRAWDZIWYMI PRODUKTAMI, które faktycznie sprzedajemy.

LISTA PRODUKTÓW:
${productKnowledge}

Odpowiadaj jako pomocny przedstawiciel obsługi klienta po polsku:`;

    // CORRECT OpenAI API call
    const completion = await openai.createChatCompletion({
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

    const aiResponse = completion.data.choices[0].message.content;
    res.json({ reply: aiResponse });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Problem z połączeniem. Proszę napisz do nas na sales@pepeurope.net" });
  }
});

// Welcome message endpoint - POLISH
app.get('/api/welcome', (req, res) => {
  const welcomeMessage = `👋 **Witaj w PepEurope Premium Peptides!** 

Jestem tutaj, aby pomóc Ci z naszymi premium produktami peptydowymi i spersonalizowanymi rekomendacjami.

🎯 **Dostępny Spersonalizowany Kalkulator Produktów!**
Otrzymaj dostosowane rekomendacje based on your specific goals.

💡 **Możesz mnie zapytać o:**
- Informacje o produktach i ceny
- Opcje wysyłki i dostawy
- Wskazówki dotyczące użycia produktów
- Spersonalizowane rekomendacje

Wpisz "kalkulator" aby rozpocząć lub zadaj mi pytanie!`;

  res.json({ reply: welcomeMessage });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ PepEurope AI server działa na porcie ${port}`);
  console.log(`✅ Tryb językowy: POLSKI`);
  console.log(`✅ Kalkulator: AKTYWNY`);
});