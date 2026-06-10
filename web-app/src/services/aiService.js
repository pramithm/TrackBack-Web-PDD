import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

export const aiService = {
  getModel: () => {
    return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  },

  // Convert browser File to base64 generative part
  fileToGenerativePart: async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result.split(',')[1];
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // Moderate image (check for inappropriate content and human faces)
  moderateImage: async (file) => {
    try {
      console.log('AI: Moderating image...', file.name);
      const model = aiService.getModel();
      const imagePart = await aiService.fileToGenerativePart(file);
      
      const prompt = `
        Analyze this image for a lost and found application. 
        You MUST verify two things:
        1. Does the image contain any inappropriate, explicit, or sexually suggestive content?
        2. Does the image contain any identifiable human faces? (Pets are perfectly fine).

        Return your analysis STRICTLY in the following JSON format:
        {
          "safe": boolean, 
          "hasHumanFaces": boolean,
          "reason": "short explanation if not safe or has faces, otherwise empty string"
        }
        Do not return any markdown wrappers, just the raw JSON string.
      `;

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      let text = response.text();
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(text);

      const isVerified = parsed.safe && !parsed.hasHumanFaces;
      
      return { 
        verified: isVerified, 
        safe: parsed.safe,
        hasHumanFaces: parsed.hasHumanFaces,
        reason: parsed.reason,
      };
    } catch (error) {
      console.error('AI Moderation Error:', error);
      return { verified: false, reason: `Failed to analyze image: ${error.message || error}` };
    }
  },

  // Generate verification questions based on item image
  generateQuestions: async (file) => {
    try {
      console.log('AI: Generating verification questions...', file.name);
      const model = aiService.getModel();
      const imagePart = await aiService.fileToGenerativePart(file);
      
      const prompt = `
        Analyze this found item image. Generate exactly 3 verification questions that the owner should be able to answer to prove it's theirs. 
        The questions should focus on specific details visible or inferable from the item (e.g., brand, specific markings, color, contents).
        Return EXACTLY this JSON format and nothing else:
        [
          { "q": "Question 1?", "a": "Brief expected answer" },
          { "q": "Question 2?", "a": "Brief expected answer" },
          { "q": "Question 3?", "a": "Brief expected answer" }
        ]
        Do not return any markdown wrappers, just the raw JSON array.
      `;

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      let text = response.text();
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      return JSON.parse(text);
    } catch (error) {
      console.error('AI Question Generation Error:', error);
      return [
        { q: "What is the brand of the item?", a: "" },
        { q: "Are there any specific scratches or markings?", a: "" },
        { q: "What is the primary color of the item?", a: "" }
      ];
    }
  },

  // Verify ownership answers against expected answers
  verifyAnswers: async (expectedQA, userAnswers) => {
    try {
      console.log('AI: Verifying answers...');
      const model = aiService.getModel();
      
      const prompt = `
        You are an AI assistant for a lost and found application. Your task is to verify if a user claiming an item is the true owner by comparing their answers to the expected answers.
        
        Expected Q&A pairs:
        ${expectedQA.map((q, i) => `Q${i+1}: ${q.q}\nExpected A${i+1}: ${q.a}`).join('\n\n')}

        User's provided answers:
        ${userAnswers.map((a, i) => `User A${i+1}: ${a}`).join('\n')}

        Compare the User's answers with the Expected answers conceptually. Minor typos, synonyms, or slightly different phrasing should be accepted if the core meaning matches.
        Assign an overall score from 0 to 100 based on how accurate the user's answers are collectively.
        If an answer is completely wrong or missing, deduct points accordingly.

        Return EXACTLY this JSON format and nothing else:
        {
          "score": 85,
          "reason": "Brief explanation of the score, pointing out any specific incorrect answers if applicable."
        }
        Do not include markdown wrappers like \`\`\`json.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      return JSON.parse(text);
    } catch (error) {
      console.error('AI Verification Error:', error);
      return { score: 0, reason: "Failed to verify answers with AI. Please try again." };
    }
  },

  // Analyze chat message for abuse or off-topic content
  analyzeChatMessage: async (messageText, itemTitle) => {
    try {
      console.log('AI: Analyzing chat message...');
      const model = aiService.getModel();
      
      const prompt = `
        You are an AI moderator for a lost and found app chat.
        Users are supposed to ONLY discuss returning, identifying, or claiming the item: "${itemTitle}".
        
        Analyze this message: "${messageText}"
        
        Check for:
        1. Abusive, offensive, or inappropriate language.
        2. Completely off-topic conversation (e.g., dating, spam, unrelated chit-chat).
        
        Greetings, polite conversation, and arranging meetings to return the item are perfectly fine.
        
        Return EXACTLY this JSON format and nothing else:
        {
          "isAppropriate": boolean,
          "reason": "Brief explanation if inappropriate, otherwise empty string"
        }
        Do not include markdown wrappers like \`\`\`json.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      return JSON.parse(text);
    } catch (error) {
      console.error('AI Chat Analysis Error:', error);
      return { isAppropriate: true, reason: "" };
    }
  }
};
