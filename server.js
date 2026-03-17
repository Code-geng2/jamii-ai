const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Hifadhi mazungumzo kwa kila mtumiaji
const conversations = new Map();

// Maelezo ya bot
const SYSTEM_PROMPT = `Wewe ni JAMII AI — msaidizi wa AI anayezungumza Kiswahili.
Una sehemu tatu:
1. 🏥 AFYA — Ushauri wa afya na magonjwa
2. 📚 ELIMU — Msaada wa masomo na mitihani  
3. 💰 BIASHARA — Ushauri wa biashara na fedha

Sheria:
- Jibu kwa Kiswahili rahisi daima
- Jibu fupi na wazi (WhatsApp inafaa majibu mafupi)
- Kwa afya: daima pendekeza hospitali kwa matatizo makubwa
- Kuwa rafiki na wa kusaidia

Mwanzoni kabisa uliza mtumiaji: "Karibu JAMII AI! 🌍 Unahitaji msaada wa nini leo?
1️⃣ Afya
2️⃣ Elimu  
3️⃣ Biashara"`;

// Webhook ya WhatsApp
app.post('/webhook', async (req, res) => {
  const incomingMsg = req.body.Body?.trim() || '';
  const from = req.body.From || '';
  console.log('ujumbe umepokelewa'),
  console.log(`Ujumbe kutoka ${from}: ${incomingMsg}`);

  // Pata au anza mazungumzo mapya
  if (!conversations.has(from)) {
    conversations.set(from, []);
  }
  const history = conversations.get(from);

  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(incomingMsg);
    const reply = result.response.text();

    // Hifadhi mazungumzo
    history.push(
      { role: 'user', parts: [{ text: incomingMsg }] },
      { role: 'model', parts: [{ text: reply }] }
    );

    // Limit history (maswali 20 tu kuhifadhi memory)
    if (history.length > 40) history.splice(0, 2);

    // Jibu WhatsApp kwa TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${reply}</Message>
</Response>`;

    res.set('Content-Type', 'text/xml');
    res.send(twiml);

  } catch (error) {
    console.error('Hitilafu:', error);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Samahani, kuna tatizo la muda mfupi. Tafadhali jaribu tena! 🙏</Message>
</Response>`;
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'JAMII AI WhatsApp Bot inafanya kazi! 🚀' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server inaendesha kwenye port ${PORT}`));
