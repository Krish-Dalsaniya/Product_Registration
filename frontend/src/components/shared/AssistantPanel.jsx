import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Loader2, Sparkles, Mic } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';

const AssistantPanel = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi there! I am your Crudex AI Assistant. How can I help you navigate the app today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  useEffect(() => {
    if (SpeechRecognition && !recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? prev + ' ' + transcript : transcript));
        setIsListening(false);
      };
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please allow microphone permissions in your browser address bar.');
        } else if (event.error !== 'no-speech') {
          toast.error(`Voice input failed (${event.error}). Please try again.`);
        }
      };
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
    }
  }, [SpeechRecognition]);

  const toggleListen = (e) => {
    e.preventDefault();
    if (!recognitionRef.current) {
      toast.error('Voice input is not supported in this browser (try Chrome or Edge).');
      return;
    }
    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch(err) { console.error(err); }
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch(err) {
        console.error('Error starting recognition:', err);
        // If it's already started, just reset state
        if (err.name === 'InvalidStateError') {
          setIsListening(true);
        } else {
          toast.error('Could not start microphone. Please try again.');
          setIsListening(false);
        }
      }
    }
  };

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
        messages: apiMessages,
        currentPath: location.pathname
      });

      if (response.data) {
        if (response.data.content) {
          setMessages(prev => [...prev, { role: 'assistant', content: response.data.content }]);
        }
        if (response.data.action) {
          if (response.data.action.type === 'AUTOFILL_PRODUCT_FORM') {
            const isExactProductList = location.pathname === '/admin/products';
            const isProductProfile = location.pathname.startsWith('/admin/products/') && location.pathname.length > '/admin/products/'.length;
            const explicitProductId = response.data.action.payload.product_id;
            
            if (explicitProductId) {
              navigate('/admin/products', { state: { editProductId: explicitProductId } });
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent(response.data.action.type, { detail: response.data.action.payload }));
              }, 1000);
            } else if (isProductProfile) {
              const productId = location.pathname.split('/').pop();
              navigate('/admin/products', { state: { editProductId: productId } });
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent(response.data.action.type, { detail: response.data.action.payload }));
              }, 1000);
            } else if (!isExactProductList) {
              navigate('/admin/products');
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent(response.data.action.type, { detail: response.data.action.payload }));
              }, 800);
            } else {
              window.dispatchEvent(new CustomEvent(response.data.action.type, { detail: response.data.action.payload }));
            }
          } else if (response.data.action.type === 'AUTOFILL_BOOK_A_SALE') {
            const isExactBookASale = location.pathname === '/admin/book-a-sale';
            if (!isExactBookASale) {
              navigate('/admin/book-a-sale');
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent(response.data.action.type, { detail: response.data.action.payload }));
              }, 800);
            } else {
              window.dispatchEvent(new CustomEvent(response.data.action.type, { detail: response.data.action.payload }));
            }
          } else {
            window.dispatchEvent(new CustomEvent(response.data.action.type, { detail: response.data.action.payload }));
          }
        }
      }
    } catch (error) {
      console.error('Chatbot API Error:', error);
      const errorMessage = error.response?.data?.error || 'Sorry, I am having trouble connecting right now. Please try again later.';
      setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
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
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-[var(--accent)] text-white rounded-tr-sm' 
                  : 'bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-main)] rounded-tl-sm'
              }`}>
                {msg.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown 
                      components={{
                        a: ({node, ...props}) => (
                          <Link to={props.href} className="text-[var(--accent)] hover:underline font-medium" onClick={onClose}>
                            {props.children}
                          </Link>
                        ),
                        p: ({node, ...props}) => <p className="m-0 mb-2 last:mb-0" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 last:mb-0" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 last:mb-0" {...props} />
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
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
                <span className="text-xs text-[var(--text-muted)] font-medium">Thinking...</span>
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
              type="button" 
              onClick={toggleListen}
              className={`p-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center shrink-0 ${
                isListening 
                  ? 'bg-rose-500 text-white animate-pulse' 
                  : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-dim)]'
              }`}
              title="Voice Input"
            >
              <Mic size={18} />
            </button>
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
