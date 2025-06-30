const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.getAIResponse = async (subject, message, language = 'en') => {
  const prompt = `You are a helpful support assistant for MyMoolah. Answer the following user support request in ${language} if possible. If you cannot answer, reply with "HUMAN ESCALATION REQUIRED".\n\nSubject: ${subject}\nMessage: ${message}\n\nAnswer:`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo', // or 'gpt-4o' if your key has access
    messages: [
      { role: 'system', content: 'You are a helpful support assistant for MyMoolah.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 200,
    temperature: 0.2,
  });

  // The answer is in completion.choices[0].message.content
  return completion.choices[0].message.content.trim();
};