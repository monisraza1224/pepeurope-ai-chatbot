const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;
        if (!userMessage) {
            return res.status(400).json({ error: "Message is required" });
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
  role: "system",
  content: `You are an expert health and peptide advisor for PepEurope. Your goal is to help customers achieve their wellness goals by recommending the right peptides and providing accurate information.

KEY PRODUCT KNOWLEDGE:
- **Weight Loss Peptides:** Sema, Tirz, Reta, CargiSema, Mazdu. They work by regulating appetite and blood sugar.
- **Longevity & Recovery Peptides:** BPC-157, NAD+, SkinProtect COMPLEX. They aid in cellular repair and energy.

HOW TO RESPOND:
1. **Answer FAQs** about products, shipping (3-5 days, free over 200 PLN), and usage (subcutaneous injection).
2. **Recommend products** based on user goals:
   - "I want to lose weight" -> Suggest Sema or Tirz.
   - "I need more energy" -> Suggest NAD+.
   - "I want better skin" -> Suggest SkinProtect COMPLEX.
3. **Be a calculator:** If a user provides weight/goal/timeframe, suggest a peptide and dosage plan.
4. **Always be professional, informative, and safety-conscious.** Advise users to consult a specialist for personal advice.

STORE INFO:
- Website: https://pepeurope.net
- Contact: sales@pepeurope.net
- Address: 182-184 High Street North, East Ham, London, UK, E6 2JA
`
},
                {
                    role: "user",
                    content: userMessage
                }
            ],
            max_tokens: 150,
        });

        const aiResponse = completion.choices[0].message.content;
        res.json({ reply: aiResponse });

    } catch (error) {
        console.error("OpenAI API error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});