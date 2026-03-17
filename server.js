const express = require('express');
const Groq = require('groq-sdk');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Hifadhi mazungumzo kwa kila mtumiaji
const conversations = new Map();

const SYSTEM_PROMPT = `Wewe ni JAMII AI — msaidizi wa AI anayezungumza Kiswahili safi.
Una sehemu tatu:
1. 🏥 AFYA — Ushauri wa afya na magonjwa
2. 📚 ELIMU — Msaada wa masomo na mitihani
3. 💰 BIASHARA — Ushauri wa biashara na fedha

Sheria muhimu:
- Jibu kwa Kiswahili rahisi DAIMA
- Jibu fupi na wazi (mistari 3-5 tu — WhatsApp inafaa majibu mafupi)
- Kwa afya: daima pendekeza hospitali kwa matatizo makubwa
- Kuwa rafiki, mwenye huruma na wa kusaidia
- Ukisalimiwa, jibu kwa upole na uliza unahitaji msaada wa nini

Mara ya kwanza mtumiaji anapoandika, jibu hivi:
"Karibu JAMII AI! 🌍 Mimi ni msaidizi wako wa AI.

Unahitaji msaada wa nini leo?
1️⃣ Afya 🏥
2️⃣ Elimu 📚
3️⃣ Biashara 💰

Andika namba au niulize swali lolote!"`;

// Webhook ya WhatsApp
app.post('/webhook', async (req, res) => {
  const incomingMsg = req.body.Body?.trim() || '';
  const from = req.body.From || '';

  console.log(`Ujumbe kutoka ${from}: ${incomingMsg}`);

  // Pata au anza mazungumzo mapya
  if (!conversations.has(from)) {
    conversations.set(from, []);
  }
  const history = conversations.get(from);

  // Ongeza ujumbe wa mtumiaji
  history.push({ role: 'user', content: incomingMsg });

  // Limit history — hifadhi mazungumzo 20 tu
  if (history.length > 20) history.splice(0, 2);

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || 
                  'Samahani, jaribu tena! 🙏';

    // Hifadhi jibu la AI
    history.push({ role: 'assistant', content: reply });

    console.log(`Jibu: ${reply}`);

    // Jibu WhatsApp kwa TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${reply}</Message>
</Response>`;

    res.set('Content-Type', 'text/xml');
    res.send(twiml);

  } catch (error) {
    console.error('Hitilafu ya Groq:', error.message);

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
  res.json({ 
    status: '✅ JAMII AI WhatsApp Bot inafanya kazi!',
    model: 'Groq llama-3.1-8b-instant',
    powered_by: 'Code Geng Technology - Free & Fast 🚀'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 JAMII AI Server inaendesha kwenye port ${PORT}`);
  console.log(`✅ Groq API iko tayari!`);
});
    
