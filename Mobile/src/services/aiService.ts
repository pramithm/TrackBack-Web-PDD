const GEMINI_API_KEY = "AIzaSyBz_ZDrUdal2-xX5yqlgYreI6BEhAJYEiQ";

export interface ExpectedQA {
  q: string;
  a: string;
}

const fileToBase64 = async (fileUri: string): Promise<{ base64: string; mimeType: string }> => {
  const response = await fetch(fileUri);
  const blob = await response.blob();
  
  const uriParts = fileUri.split('/');
  const fileName = uriParts[uriParts.length - 1];
  const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const resultStr = reader.result as string;
      const base64String = resultStr.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return { base64, mimeType };
};

export const aiService = {
  moderateImage: async (fileUri: string): Promise<{ verified: boolean; safe: boolean; hasHumanFaces: boolean; reason: string }> => {
    try {
      console.log('[aiService] Moderating image:', fileUri);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const { base64, mimeType } = await fileToBase64(fileUri);

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

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64
                  }
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API returned status ${response.status}`);
      }

      const resultData = await response.json();
      const textResponse = resultData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) {
        throw new Error('Empty response from Gemini');
      }

      const cleanJsonStr = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);
      const isVerified = parsed.safe && !parsed.hasHumanFaces;

      return {
        verified: isVerified,
        safe: !!parsed.safe,
        hasHumanFaces: !!parsed.hasHumanFaces,
        reason: parsed.reason || ''
      };
    } catch (error: any) {
      console.error('[aiService] Image moderation error:', error);
      return { verified: false, safe: false, hasHumanFaces: false, reason: `Failed to analyze image: ${error.message || error}` };
    }
  },

  generateQuestions: async (fileUri: string): Promise<ExpectedQA[]> => {
    try {
      console.log('[aiService] Generating verification questions for:', fileUri);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const { base64, mimeType } = await fileToBase64(fileUri);

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

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64
                  }
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API returned status ${response.status}`);
      }

      const resultData = await response.json();
      const textResponse = resultData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) {
        throw new Error('Empty response from Gemini');
      }

      const cleanJsonStr = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);

      if (Array.isArray(parsed) && parsed.length === 3) {
        return parsed as ExpectedQA[];
      }
      throw new Error('Response is not a valid 3-item array');
    } catch (error) {
      console.error('[aiService] Question generation error:', error);
      return [
        { q: "What is the brand of the item?", a: "" },
        { q: "Are there any specific scratches or markings?", a: "" },
        { q: "What is the primary color of the item?", a: "" }
      ];
    }
  },

  verifyAnswers: async (expectedQA: ExpectedQA[], userAnswers: string[]): Promise<{ score: number; reason: string }> => {
    try {
      console.log('[aiService] Verifying ownership answers...');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const expectedQAStr = expectedQA.map((q, i) => `Q${i + 1}: ${q.q}\nExpected A${i + 1}: ${q.a}`).join('\n\n');
      const userAnswersStr = userAnswers.map((a, i) => `User A${i + 1}: ${a}`).join('\n');

      const prompt = `
        You are an AI assistant for a lost and found application. Your task is to verify if a user claiming an item is the true owner by comparing their answers to the expected answers.
        
        Expected Q&A pairs:
        ${expectedQAStr}

        User's provided answers:
        ${userAnswersStr}

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

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API returned status ${response.status}`);
      }

      const resultData = await response.json();
      const textResponse = resultData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) {
        throw new Error('Empty response from Gemini');
      }

      // Clean the response text from any markdown tags if needed
      const cleanJsonStr = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);

      return {
        score: typeof parsed.score === 'number' ? parsed.score : 0,
        reason: parsed.reason || 'AI evaluation complete.',
      };
    } catch (error: any) {
      console.error('[aiService] Error during verification:', error);
      return {
        score: 0,
        reason: `Failed to verify answers with AI: ${error.message || error}`,
      };
    }
  },

  analyzeChatMessage: async (messageText: string, itemTitle: string): Promise<{ isAppropriate: boolean; reason: string }> => {
    try {
      console.log('[aiService] Moderating chat message...');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

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

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API returned status ${response.status}`);
      }

      const resultData = await response.json();
      const textResponse = resultData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) {
        throw new Error('Empty response from Gemini');
      }

      const cleanJsonStr = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);

      return {
        isAppropriate: typeof parsed.isAppropriate === 'boolean' ? parsed.isAppropriate : true,
        reason: parsed.reason || '',
      };
    } catch (error) {
      console.error('[aiService] Chat moderation error:', error);
      return { isAppropriate: true, reason: '' };
    }
  }
};
