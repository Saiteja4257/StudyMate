import React, { useState, useRef, useEffect } from 'react';
import { studySpaceAPI } from '../../services/api';
import { 
  X, 
  Send, 
  Sparkles,
  Bot,
  User,
  Loader2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface StudySpaceTutorProps {
  spaceId: string;
  moduleId: string | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const StudySpaceTutor: React.FC<StudySpaceTutorProps> = ({ spaceId, moduleId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    // Reset chat when module changes
    setMessages([
      { role: 'assistant', content: 'Hi! I am your AI Tutor for this module. What questions do you have about the material?' }
    ]);
  }, [moduleId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !moduleId) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const history = messages.filter(m => m.role === 'user' || m.role === 'assistant');
      const res = await studySpaceAPI.askTutor(spaceId, moduleId, userMessage, history);
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.answer }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try asking again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-auto w-full flex flex-col bg-[#151515] border border-white/[0.1] rounded-3xl overflow-hidden animate-fade-in">
      <div className="h-16 border-b border-white/[0.06] flex items-center justify-between px-6 bg-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <h2 className="font-semibold text-white">AI Module Tutor</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-indigo-500' : 'bg-white/[0.08]'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-indigo-400" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl p-4 text-sm ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white/[0.03] text-gray-300 rounded-tl-none border border-white/[0.05]'
            }`}>
              {msg.role === 'user' ? (
                msg.content
              ) : (
                <div className="prose prose-sm prose-invert prose-p:leading-relaxed max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-white/[0.06] bg-[#0a0a0a]">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading || !moduleId}
            placeholder="Ask anything about this module..."
            className="w-full bg-[#111] border border-white/[0.1] rounded-xl pl-4 pr-12 py-3.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || !moduleId}
            className="absolute right-2 top-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-all disabled:opacity-50 disabled:bg-transparent disabled:text-gray-500"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StudySpaceTutor;
