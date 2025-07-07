// app.js - AI Credit Card Recommender (Single File Implementation)
require('dotenv').config();
const express = require('express');
const path = require('path');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mock Credit Card Data (in a real app, this would come from an API)
const creditCards = [
  {
    id: 1,
    name: "Travel Rewards Elite",
    issuer: "Global Bank",
    annualFee: 95,
    rewardsRate: 3,
    rewardsType: "points",
    bonus: "50,000 points after $3,000 spend in 3 months",
    perks: ["Free checked bags", "Priority boarding", "No foreign transaction fees"],
    bestFor: ["Travel", "Dining"],
    apr: "16.99%-24.99%"
  },
  {
    id: 2,
    name: "Cash Back Plus",
    issuer: "National Credit",
    annualFee: 0,
    rewardsRate: 2,
    rewardsType: "cashback",
    bonus: "$200 after $1,000 spend in 3 months",
    perks: ["Cell phone protection", "Extended warranty"],
    bestFor: ["Groceries", "Gas", "Everyday purchases"],
    apr: "14.99%-22.99%"
  },
  {
    id: 3,
    name: "Premium Dining Card",
    issuer: "Metro Financial",
    annualFee: 250,
    rewardsRate: 4,
    rewardsType: "points",
    bonus: "60,000 points after $4,000 spend in 3 months",
    perks: ["$300 dining credit", "Airport lounge access", "Global entry credit"],
    bestFor: ["Dining", "Entertainment"],
    apr: "17.99%-25.99%"
  },
  {
    id: 4,
    name: "Student Cash Back",
    issuer: "First Student Bank",
    annualFee: 0,
    rewardsRate: 1.5,
    rewardsType: "cashback",
    bonus: "$50 after first purchase",
    perks: ["No credit history required", "Credit limit increases"],
    bestFor: ["Students", "First credit cards"],
    apr: "18.99%-26.99%"
  }
];

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to get all cards (for comparison)
app.get('/api/cards', (req, res) => {
  res.json(creditCards);
});

// API endpoint to get card by ID
app.get('/api/cards/:id', (req, res) => {
  const card = creditCards.find(c => c.id === parseInt(req.params.id));
  if (!card) return res.status(404).send('Card not found');
  res.json(card);
});

// AI Recommendation Endpoint
app.post('/api/recommend', async (req, res) => {
  try {
    const { spendingHabits, preferences } = req.body;
    
    // Construct prompt for OpenAI
    const prompt = `Based on the following spending habits and preferences, recommend the best credit cards from our database and explain why:
    
    Spending Habits:
    ${JSON.stringify(spendingHabits, null, 2)}
    
    Preferences:
    ${JSON.stringify(preferences, null, 2)}
    
    Available Credit Cards:
    ${JSON.stringify(creditCards.map(card => ({
      name: card.name,
      issuer: card.issuer,
      annualFee: card.annualFee,
      rewardsRate: card.rewardsRate,
      rewardsType: card.rewardsType,
      bestFor: card.bestFor
    })), null, 2)}
    
    Provide your recommendations in this format:
    1. [Card Name] - [Brief reason why it's a good match]
    2. [Card Name] - [Brief reason why it's a good match]
    
    Then provide a more detailed comparison of the top 2-3 cards, including:
    - Rewards potential based on the user's spending
    - Fees and how they compare to the benefits
    - Any special perks that align with the user's preferences
    
    Finally, answer any specific questions the user included in their preferences.`;
    
    // Call OpenAI API
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const recommendation = response.data.choices[0].message.content;
    res.json({ recommendation });
    
  } catch (error) {
    console.error('Error getting AI recommendation:', error);
    res.status(500).send('Error generating recommendation');
  }
});

// What-if Calculator Endpoint
app.post('/api/calculate', (req, res) => {
  const { cardId, monthlySpending } = req.body;
  const card = creditCards.find(c => c.id === parseInt(cardId));
  
  if (!card) return res.status(404).send('Card not found');
  
  // Simple calculation - in a real app this would be more sophisticated
  let annualRewards;
  if (card.rewardsType === 'cashback') {
    annualRewards = monthlySpending * (card.rewardsRate / 100) * 12;
  } else {
    // Assume 1 point = $0.01 value for simplicity
    annualRewards = monthlySpending * (card.rewardsRate / 100) * 12 * 0.01;
  }
  
  const netValue = annualRewards - card.annualFee;
  
  res.json({
    cardName: card.name,
    annualRewards: annualRewards.toFixed(2),
    annualFee: card.annualFee,
    netValue: netValue.toFixed(2),
    rewardsType: card.rewardsType
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});