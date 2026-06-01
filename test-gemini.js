require('dotenv').config({path: '.env.local'});

async function run() {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent`;
  const prompt = "Hello";
  const geminiResponse = await fetch(`${apiUrl}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
      })
  });
  
  console.log("Status:", geminiResponse.status);
  const text = await geminiResponse.text();
  console.log("Response:", text);
}
run();
