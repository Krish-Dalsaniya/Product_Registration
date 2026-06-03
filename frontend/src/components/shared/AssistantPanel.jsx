import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';

const AssistantPanel = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi there! I am your Crudex AI Assistant. How can I help you navigate the app today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const apiMessages = [...messages, userMessage].map(m => ({ role: m.role, content: m.content }));
      
      const response = await axiosInstance.post('/chatbot/chat', {
        messages: apiMessages
      });

      if (response.data && response.data.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.data.content }]);
      }
    } catch (error) {
      console.error('Chatbot API Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I am having trouble connecting right now. Please try again later.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-[60] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Slide-out Panel */}
      <div 
        className={`fixed top-0 right-0 h-screen w-full sm:w-[400px] bg-[var(--bg-elevated)] border-l border-[var(--border-color)] shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="h-[60px] border-b border-[var(--border-color)] flex items-center justify-between px-6 bg-[var(--bg-workspace)]/50 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center shadow-inner">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="font-bold text-[var(--text-main)] leading-tight">AI Assistant</h2>
              <p className="text-[10px] text-[var(--accent)] font-bold uppercase tracking-wider">Online</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-workspace)] rounded-xl transition-colors text-[var(--text-muted)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[var(--bg-workspace)]/30">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--accent)]'}`}>
                {msg.role === 'user' ? <User size={14} /> : <Bot size={16} />}
              </div>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-[var(--accent)] text-white rounded-tr-sm' 
                  : 'bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-main)] rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--accent)] flex items-center justify-center shrink-0 shadow-sm">
                <Bot size={16} />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-tl-sm flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-[var(--accent)]" />
                <span className="text-xs text-[var(--text-muted)] font-medium">AI is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-elevated)] shrink-0">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me how to navigate..."
              className="flex-1 bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--accent)] transition-colors shadow-inner"
              disabled={isLoading}
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="bg-[var(--accent)] text-white p-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-md flex items-center justify-center shrink-0"
            >
              <Send size={18} className="transform translate-x-0.5" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default AssistantPanel;
