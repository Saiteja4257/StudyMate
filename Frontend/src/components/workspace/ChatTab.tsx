import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Loader2, Bot, User, Sparkles, ChevronDown, Trash2, RefreshCw, Plus, Menu, X } from 'lucide-react';
import { aiAPI } from '../../services/api';
import ReactMarkdown from 'react-markdown';
import ConfirmModal from '../common/ConfirmModal';

interface ChatTabProps {
  document: any;
  onDocumentUpdate: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
}

const ChatTab: React.FC<ChatTabProps> = ({ document, onDocumentUpdate }) => {
  const chats = document.chats || [];
  
  // Default to a new chat
  const [selectedIndex, setSelectedIndex] = useState<number>(chats.length);
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hello! I'm ready to answer any questions about "${document.title}". What would you like to know?`,
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, index: number | null}>({ isOpen: false, index: null });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{isOpen: boolean, x: number, y: number, index: number | null}>({ isOpen: false, x: 0, y: 0, index: null });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedIndex]);

  // Close context menu when clicking anywhere
  useEffect(() => {
    const handleClick = () => setContextMenu(prev => ({ ...prev, isOpen: false }));
    if (contextMenu.isOpen) {
      window.document.addEventListener('click', handleClick);
      return () => window.document.removeEventListener('click', handleClick);
    }
  }, [contextMenu.isOpen]);

  // If chats length changes (like after a delete) and we're out of bounds, fix it
  useEffect(() => {
    if (selectedIndex > chats.length) {
      handleStartNewChat();
    }
  }, [chats.length]);

  const handleStartNewChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Hello! I'm ready to answer any questions about "${document.title}". What would you like to know?`,
      }
    ]);
    setSelectedIndex(chats.length);
    setMobileMenuOpen(false);
  };

  const handleOpenChat = (index: number) => {
    setMessages(chats[index].messages);
    setSelectedIndex(index);
    setMobileMenuOpen(false);
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  };

  const handleContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.pageX,
      y: e.pageY,
      index
    });
  };

  const handleDeleteClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({ isOpen: true, index });
  };

  const executeDelete = async () => {
    const index = confirmModal.index;
    if (index === null) return;
    
    setDeletingIndex(index);
    try {
      await aiAPI.deleteChat(document._id, index);
      onDocumentUpdate();
      if (selectedIndex === index) {
        handleStartNewChat();
      } else if (selectedIndex > index) {
        setSelectedIndex(selectedIndex - 1);
      }
    } catch (err: any) {
      console.error('Failed to delete chat', err);
    } finally {
      setDeletingIndex(null);
      setConfirmModal({ isOpen: false, index: null });
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput('');
    setLoading(true);

    try {
      // We no longer pass a manually sliced title, backend will auto-generate it if it's new
      await aiAPI.saveChat(
        document._id, 
        selectedIndex, 
        currentMessages,
        undefined 
      );
      onDocumentUpdate();

      const history = currentMessages
        .slice(1) // skip greeting
        .map(m => ({ role: m.role, content: m.content }));
        
      const res = await aiAPI.chat(document._id, userMessage.content, history);
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: res.data.answer,
        sources: res.data.sources,
      };
      
      const finalMessages = [...currentMessages, assistantMessage];
      setMessages(finalMessages);
      
      await aiAPI.saveChat(document._id, selectedIndex, finalMessages);
      onDocumentUpdate();
      
    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMessage = error.response?.data?.message || 'Sorry, I encountered an error.';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage,
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in relative z-10">
      {/* Top Header */}
      <div className="flex items-center gap-3 mb-6 flex-shrink-0 px-2 lg:px-0">
        <button 
          className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-white"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Document Chat</h2>
          <p className="text-sm text-gray-400">Ask questions based on the uploaded content</p>
        </div>
      </div>

      {/* Split View Container */}
      <div className="flex-1 flex gap-4 min-h-0 relative">
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar for History */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 glass border-r border-white/[0.06] flex flex-col transform transition-transform duration-300 lg:relative lg:translate-x-0 lg:w-64 lg:h-full lg:rounded-2xl lg:border lg:flex
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <button 
            onClick={handleStartNewChat} 
            className="flex-1 flex items-center justify-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 py-2.5 rounded-xl transition-colors text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> New Chat
          </button>
          <button 
            className="lg:hidden ml-2 p-2 text-gray-400 hover:text-white"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {chats.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm mt-4">
              No previous chats found.
            </div>
          ) : (
            chats.map((chat: any, idx: number) => (
              <div 
                key={idx} 
                onClick={() => handleOpenChat(idx)} 
                onContextMenu={(e) => handleContextMenu(e, idx)}
                className={`p-3 rounded-xl cursor-pointer transition-colors group flex items-start gap-3 ${selectedIndex === idx ? 'bg-white/[0.08] text-white' : 'text-gray-400 hover:bg-white/[0.04]'}`}
              >
                <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-70" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{chat.title || "Chat Session"}</div>
                  <div className="text-[10px] opacity-60 mt-0.5">{new Date(chat.createdAt).toLocaleDateString()}</div>
                </div>
                {deletingIndex === idx && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-gray-500 p-1 flex-shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 max-w-4xl mx-auto w-full relative glass rounded-2xl border border-white/[0.06] overflow-hidden">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-28 md:pb-32 space-y-6 custom-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                msg.role === 'user' ? 'bg-primary text-white' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              
              <div className={`max-w-[85%] md:max-w-[80%] ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block px-4 py-3 md:px-5 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-primary text-white rounded-tr-sm' 
                    : 'bg-white/[0.04] border border-white/[0.06] text-gray-200 rounded-tl-sm'
                }`}>
                  <div className="text-sm leading-relaxed">
                      <ReactMarkdown
                        components={{
                          ul: ({node, ...props}) => <ul className="list-disc ml-5 my-2 space-y-1" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal ml-5 my-2 space-y-1" {...props} />,
                          li: ({node, ...props}) => <li className="pl-1" {...props} />,
                          p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                          h1: ({node, ...props}) => <h1 className="text-xl font-bold text-white mb-2 mt-4" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-lg font-bold text-white mb-2 mt-3" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-base font-bold text-white mb-2 mt-3" {...props} />,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Sources Snippet */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3">
                      <details className="group relative">
                        <summary className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-blue-400 cursor-pointer transition-colors select-none list-none [&::-webkit-details-marker]:hidden inline-flex px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06]">
                          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                          <span>View retrieved context ({msg.sources.length})</span>
                          <ChevronDown className="w-3.5 h-3.5 opacity-50 group-open:rotate-180 transition-transform ml-1" />
                        </summary>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.sources.map((src, i) => (
                            <div key={i} className="bg-black/20 hover:bg-black/40 transition-colors border border-white/[0.05] rounded-xl p-3 text-[11px] text-gray-400 leading-relaxed shadow-inner">
                              <div className="flex items-start gap-2">
                                <span className="bg-white/[0.05] text-gray-500 font-mono px-1.5 py-0.5 rounded text-[9px] mt-0.5">
                                  {i + 1}
                                </span>
                                <p className="line-clamp-4">
                                  "{src.text}"
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-sm px-5 py-4 flex flex-col gap-2">
                   <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none">
            <div className="max-w-3xl mx-auto pointer-events-auto">
              <form onSubmit={handleSend} className="relative flex items-center shadow-2xl">
                <Plus className="absolute left-4 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything"
                  className="w-full bg-[#1e1e24] border border-white/[0.05] rounded-full pl-12 pr-14 py-4 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-white/[0.1] transition-colors shadow-lg"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="absolute right-2 p-2.5 rounded-full bg-white/10 text-white disabled:opacity-30 disabled:bg-transparent transition-all hover:bg-white/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <div className="text-center mt-3">
                 <p className="text-[10px] text-gray-500 font-medium tracking-wide drop-shadow-md">AI can make mistakes. Verify important info.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Delete Chat Session"
        message="Are you sure you want to delete this chat session? This action cannot be undone."
        onConfirm={executeDelete}
        onCancel={() => setConfirmModal({ isOpen: false, index: null })}
      />

      {/* Custom Context Menu */}
      {contextMenu.isOpen && contextMenu.index !== null && (
        <div 
          className="fixed z-[100] bg-[#1e1e24] border border-white/[0.08] rounded-xl shadow-2xl py-1.5 w-48 animate-fade-in"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={(e) => {
               e.stopPropagation();
               setContextMenu(prev => ({ ...prev, isOpen: false }));
               handleDeleteClick(contextMenu.index!, e);
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-white/[0.04] flex items-center gap-3 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Chat
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatTab;
