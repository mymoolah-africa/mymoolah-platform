const OpenAI = require("openai");

// Initialize OpenAI client only if API key is available
let openai = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
} catch (error) {
  console.log("OpenAI not initialized - API key missing or invalid");
}

const getAIResponse = async (subject, message, language = "en") => {
  try {
    // Check if OpenAI is available
    if (!openai) {
      return {
        success: false,
        message: "AI support is not available - OpenAI API key not configured",
        ai_response: null
      };
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a helpful customer support assistant for MyMoolah wallet platform. 
          Respond in ${language} language. Be concise, professional, and helpful.`
        },
        {
          role: "user",
          content: `Subject: ${subject}
Message: ${message}`
        }
      ],
      max_tokens: 200
    });

    return {
      success: true,
      message: "AI response generated successfully",
      ai_response: completion.choices[0].message.content
    };
  } catch (error) {
    console.error("AI Support Error:", error.message);
    return {
      success: false,
      message: "AI support temporarily unavailable",
      ai_response: null
    };
  }
};

module.exports = {
  getAIResponse
};
