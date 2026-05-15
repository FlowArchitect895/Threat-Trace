require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
const path = require('path');
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.post('/api/generate', async (req, res) => {
  const { scenario } = req.body;

  const prompt = `You are a forensic cybersecurity scenario generator specializing in IoT incidents in Caribbean/Jamaican institutional contexts.

Generate a complete forensic investigation case based on this incident: ${scenario}

Requirements:
- Map the attack to a real MITRE ATT&CK technique
- Structure across 6 forensic stages: Identification, Preservation, Collection, Examination, Analysis, Presentation
- Each stage has 3 choices — only one is correct forensic methodology
- Wrong choices have realistic consequences (evidence contamination, chain of custody breaks)
- Include resource constraints realistic to Jamaica/Caribbean institutions
- Return ONLY valid JSON, no extra text

Return JSON with this exact structure:
{
  "caseTitle": "",
  "incidentSummary": "",
  "deviceType": "",
  "attackTechnique": "",
  "stages": [
    {
      "stageName": "",
      "stageNarrative": "",
      "evidenceFound": "",
      "choices": ["", "", ""],
      "correctChoice": "",
      "correctFeedback": "",
      "incorrectFeedback": "",
      "integrityImpact": ""
    }
  ],
  "reportNarrative": "",
  "caribbeanContext": ""
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8000
          }
        })
      }
    );

    const data = await response.json();
    console.log('Raw API response:', JSON.stringify(data, null, 2));

    if (!data.candidates || !data.candidates[0]) {
      console.error('No candidates in response:', data);
      return res.status(500).json({ error: 'No response from model', details: data });
    }

    const parts = data.candidates[0].content.parts;
    const raw = parts.find(p => !p.thought)?.text || parts[parts.length - 1].text;
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    res.json(parsed);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Generation failed', message: err.message });
  }
});

app.listen(8080, () => {
  console.log('Threat Trace running on port 8080');
}).on('error', (err) => {
  console.error('Server error:', err);
});