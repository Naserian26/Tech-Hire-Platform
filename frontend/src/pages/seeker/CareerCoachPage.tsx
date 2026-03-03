import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';

interface Message {
  id: number;
  text: string;
  sender: 'bot' | 'user';
}

const SYSTEM_PROMPT = `You are an expert AI Career Coach for TechHire, a tech hiring platform. 
You help job seekers with career advice, interview preparation, resume tips, skill development, 
salary negotiation, and job search strategies. Be concise, practical, and encouraging.`;

const CareerCoachPage = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Hello! I'm your AI Career Coach 👋 I can help you with interview prep, career paths, resume tips, salary negotiation, and more. What do you need help with today?", sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const callClaude = async (userMessage: string, history: Message[]) => {
    // Build conversation history for Claude
    const claudeMessages = history
      .filter(m => m.id !== 1) // skip initial greeting
      .map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

    // Add the new user message
    claudeMessages.push({ role: 'user', content: userMessage });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: claudeMessages,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err?.error?.message || 'API call failed');
    }

    const data = await response.json();
    return data.content[0].text;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now(), text: input, sender: 'user' };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const reply = await callClaude(input, updatedMessages);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: reply,
        sender: 'bot'
      }]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: `⚠️ Error: ${error.message}. Check your API key in .env`,
        sender: 'bot'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
  };

  const suggestions = [
    "How do I prepare for a React interview?",
    "What salary should I ask for as a mid-level dev?",
    "Help me improve my LinkedIn profile",
    "How do I negotiate a job offer?",
  ];

  return (
    <div className="h-[calc(100vh-80px)] bg-ui-bg flex flex-col">
      <div className="p-4 border-b border-slate-800 bg-ui-card">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Bot className="text-accent-teal" /> AI Career Coach
        </h2>
        <p className="text-xs text-slate-400 mt-1">Powered by Claude · Online</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start gap-3 max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-primary-violet' : 'bg-accent-teal text-slate-900'}`}>
                {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-3 rounded-2xl text-sm whitespace-pre-wrap ${
                msg.sender === 'user' ? 'bg-primary-violet text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start gap-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-accent-teal text-slate-900">
                <Bot size={16} />
              </div>
              <div className="p-3 rounded-2xl bg-slate-800 text-slate-400 rounded-tl-none flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Thinking...
              </div>
            </div>
          </div>
        )}

        {/* Show suggestions only on first message */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="text-xs border border-slate-700 text-slate-300 px-3 py-2 rounded-full hover:border-accent-teal hover:text-accent-teal transition"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 bg-ui-card border-t border-slate-800">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="w-full bg-slate-900 border border-slate-700 rounded-full pl-4 pr-12 py-3 text-white focus:border-accent-teal outline-none disabled:opacity-50"
            placeholder="Ask about career paths, interviews, or skills..."
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-accent-teal text-slate-900 rounded-full hover:bg-teal-400 transition disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default CareerCoachPage;