import React, { useState, useRef, useEffect } from 'react';

const LM_STUDIO_URL = "http://localhost:1234/v1/chat/completions";
const MODEL_NAME = "qwen2.5-coder-7b-instruct";

const SYSTEM_PROMPT = `
You are the "Visual Coder Assistant". You help users build algorithms using a node-based visual editor.
RULES:
1. General Questions: Answer clearly.
2. Build Requests: Explain Visual Graph Structure step-by-step using nodes like Assign, If/Else, Loops.
`;

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChatbotWidget = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi! I am your Flow Assistant. Ask me how to build logic!' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isOpen]);

  const handleSend = async () => {
    if (inputText.trim() === '') return;
    const userMessage = { from: 'user', text: inputText };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await fetch(LM_STUDIO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...[...messages, userMessage].map(m => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text }))],
          temperature: 0.7,
          max_tokens: 400,
          stream: false
        }),
      });
      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        setMessages(prev => [...prev, { from: 'bot', text: data.choices[0].message.content }]);
      } else {
        setMessages(prev => [...prev, { from: 'bot', text: "No response from AI." }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { from: 'bot', text: "Error connecting to AI." }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 shadow-2xl">
      <div className="w-80 h-96 bg-white rounded-lg flex flex-col border border-gray-200 font-sans shadow-xl">
        {/* Header */}
        <div className="bg-blue-600 p-3 rounded-t-lg text-white font-bold flex justify-between items-center shadow-sm">
          <span className="flex items-center gap-2">🤖 Flow Assistant</span>
          <button onClick={onClose} className="text-blue-100 hover:text-white transition-colors"><CloseIcon /></button>
        </div>

        {/* Message List */}
        <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-gray-50">
          {messages.map((msg, index) => (
            <div key={index} className={`p-3 rounded-lg max-w-[85%] text-sm shadow-sm ${msg.from === 'bot' ? 'bg-white text-gray-800 border border-gray-200 self-start' : 'bg-blue-600 text-white self-end ml-auto'}`}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
            </div>
          ))}
          {isTyping && <div className="p-3 rounded-lg bg-gray-200 text-gray-500 self-start text-xs italic animate-pulse">Thinking...</div>}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div className="p-3 border-t border-gray-200 bg-white flex rounded-b-lg gap-2">
          <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !isTyping && handleSend()} placeholder="Ask for help..." disabled={isTyping} className="flex-1 bg-gray-50 text-gray-800 rounded-md p-2 outline-none border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-all" />
          <button onClick={handleSend} disabled={isTyping} className="bg-blue-600 text-white rounded-md px-4 hover:bg-blue-700 disabled:bg-blue-300 transition-colors font-semibold shadow-sm">Send</button>
        </div>
      </div>
    </div>
  );
};

export default ChatbotWidget;