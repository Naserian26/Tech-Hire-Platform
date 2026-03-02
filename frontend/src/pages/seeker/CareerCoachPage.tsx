import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';

const CareerCoachPage = () => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm your AI Career Coach. How can I help you today?", sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), text: input, sender: 'user' };
    setMessages([...messages, userMsg]);
    setInput('');

    // Mock Bot Response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: "That's a great question. Based on your profile as a React Developer, I suggest focusing on System Design concepts next.", 
        sender: 'bot' 
      }]);
    }, 1000);
  };

  return (
    <div className="h-[calc(100vh-80px)] bg-ui-bg flex flex-col">
      <div className="p-4 border-b border-slate-800 bg-ui-card">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Bot className="text-accent-teal" /> AI Career Coach
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start gap-3 max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-primary-violet' : 'bg-accent-teal text-slate-900'}`}>
                {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-3 rounded-2xl text-sm ${
                msg.sender === 'user' ? 'bg-primary-violet text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 bg-ui-card border-t border-slate-800">
        <div className="relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-full pl-4 pr-12 py-3 text-white focus:border-accent-teal outline-none"
            placeholder="Ask about career paths, interviews, or skills..."
          />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-accent-teal text-slate-900 rounded-full hover:bg-teal-400 transition">
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default CareerCoachPage;