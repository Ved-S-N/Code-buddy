const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

console.log('API Key Status:', process.env.GEMINI_API_KEY ? 'Present' : 'Missing');

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE');

// Simple In-Memory Cache
const responseCache = new Map();

// Helper: Add Line Numbers
const addLineNumbers = (code) => {
    if (!code) return "No code written yet";
    return code.split('\n').map((line, i) => `${i + 1}: ${line}`).join('\n');
};

// Root endpoint
app.get('/', (req, res) => {
  res.send('DSA Buddy Server is Running');
});

// ... (Rest of hints endpoint) ...

// Helper: Delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Hints endpoint
app.post('/hints', async (req, res) => {
  try {
    const { title, description, code, mode } = req.body; // mode: 'standard' | 'logic' | 'concept'

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and Description are required' });
    }

    // Cache Key Generation
    const cacheKey = JSON.stringify({ title, description, code, mode });
    if (responseCache.has(cacheKey)) {
        console.log('Serving from cache');
        return res.json(responseCache.get(cacheKey));
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is missing');
      return res.status(500).json({ error: 'Server configuration error: API Key missing' });
    }

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash-lite",
        generationConfig: { responseMimeType: "application/json" }
    });

    // Prepare Code with Line Numbers
    const numberedCode = addLineNumbers(code);

    let prompt = "";
    
    // --- MODE SELECTION ---
    if (mode === 'logic') {
        prompt = `
          You are a strict "Logic Doctor" for coding algorithms. 
          Analyze the student's code logic against the problem.
          
          Title: ${title}
          Description: ${description}
          Student's Code (with line numbers): 
          ${numberedCode}

          YOUR TASK:
          1. Analyze the *Student's Code* specifically.
          2. Identify logic flaws using the student's *actual variable names* and specific *line numbers*.
          3. Break the analysis into 3 parts (Progressive Hints).
          4. For EACH hint, provide a VALID CORRECTION SNIPPET based on the student's context.

          Response Format (JSON):
          {
            "hint1": "**Diagnosis** (Line X): [Identify error in THEIR code]. **Fix**: [Hint 1]",
            "snippet1": "[Code block showing the corrected logic for Hint 1]",
            
            "hint2": "**Reasoning**: [Why their approach fails]. **Fix**: [Hint 2]",
            "snippet2": "[Code block for Hint 2]",

            "hint3": "**Optimized Logic**: [Strong hint on the correct path]",
            "snippet3": "[Code block for Hint 3]"
          }
        `;
    } else if (mode === 'concept') {
        prompt = `
          You are a "Concept Mapper" for DSA. 
          Map this problem to a standard algorithm pattern and explain it using the user's code context.
          
          Title: ${title}
          Description: ${description}
          Student's Code (with line numbers): 
          ${numberedCode}

          YOUR TASK:
          1. Identify the hidden pattern (e.g., Sliding Window, DFS, Two Pointers).
          2. Explain WHY this pattern applies here.
          3. Show how to map their current variables to this pattern.

          Response Format (JSON):
          {
            "hint1": "**Pattern Identified**: [Name of Pattern]. \\n\\n**Why**: [Explanation linking problem constraints to pattern]",
            "snippet1": null,

            "hint2": "**Mapping**: Your variable (Line X) acts as the [Rule], but you need a \`Y\` to track [State].",
            "snippet2": null,

            "hint3": "**Template Snippet**: \\n\`\`\`javascript\\n[Generic pattern code structure relevant to this problem]\\n\`\`\`",
            "snippet3": "[Code template]"
          }
        `;
    } else {
        // Standard Hints
        prompt = `
          You are an expert Data Structures and Algorithms tutor. 
          Help the student solve the following problem:
          
          Title: ${title}
          Description: ${description}
          Student's Current Code (with line numbers): 
          ${numberedCode}

          YOUR TASK:
          Provide 3 progressive hints to help them solve it. References specific line numbers where appropriate.
          
          STRICT RULES:
          1. NEVER provide the full solution or complete code.
          2. Hint 1: A subtle nudge about the approach.
          3. Hint 2: More specific advice on the algorithm.
          4. Hint 3: A strong hint about implementation.
          5. Return JSON only.
          
          Response Format (JSON):
          {
            "hint1": "string",
            "snippet1": null,
            "hint2": "string",
            "snippet2": null,
            "hint3": "string",
            "snippet3": null
          }
        `;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean up if Gemini returns markdown code blocks (even with JSON mode, better safe)
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    let jsonResponse;
    try {
      jsonResponse = JSON.parse(text);
      
      // Save to Cache
      responseCache.set(cacheKey, jsonResponse);

    } catch (e) {
      console.error('Failed to parse JSON from Gemini:', text);
      // Fallback: Try to find the JSON object within the text
      try {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            jsonResponse = JSON.parse(text.substring(start, end + 1));
        } else {
            throw e;
        }
      } catch (e2) {
         return res.status(500).json({ error: 'Failed to generate valid hints. The AI returned invalid data.' });
      }
    }

    res.json(jsonResponse);

  } catch (error) {
    if (error.message.includes('429')) {
       return res.status(429).json({ error: 'AI Rate Limit Exceeded. Please wait a moment.' });
    }
    console.error('Error generating hints:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
