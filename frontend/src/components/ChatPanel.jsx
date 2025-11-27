import React, { useEffect, useRef, useState } from 'react';

export default function ChatPanel(){
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef();
  const textareaRef = useRef();
  const messagesContainerRef = useRef();

  useEffect(()=> { 
    // Only auto-scroll if user is already at bottom
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      if (isAtBottom) {
        endRef.current?.scrollIntoView({behavior:'smooth'}); 
      }
    }
  }, [messages]);

  const handleKeyDown = (e) => {
    // Submit on Enter (but not Shift+Enter for new line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  async function send(){
    if(!text.trim() || isLoading) return;
    const msg = text;
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    // add user message and placeholder bot message
    setMessages(m => [...m, { from: 'user', text: msg }, { from: 'bot', text: '...' }]);
    setIsLoading(true);
    try{
      // request with streaming
      const res = await fetch('http://localhost:4000/chat?stream=1', {
        method: 'POST', 
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ message: msg })
      });
      if (!res.ok) throw new Error('Chat request failed');

      // try to read streaming response
      if (res.body && typeof res.body.getReader === 'function') {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let fullText = '';
        while(!done) {
          const { value, done: d } = await reader.read();
          done = d;
          if (value) {
            const chunk = decoder.decode(value);
            fullText += chunk;
            // update last bot message with accumulated text
            setMessages(prev => {
              const copy = [...prev];
              if (copy[copy.length - 1].from === 'bot') {
                copy[copy.length - 1].text = fullText;
              }
              return copy;
            });
          }
        }
      } else {
        // fallback to JSON response
        const data = await res.json();
        setMessages(m => {
          const copy = [...m];
          copy[copy.length - 1].text = data.reply || 'No response';
          return copy;
        });
      }
    }catch(e){
      console.error('Chat error:', e);
      setMessages(m => {
        const copy = [...m];
        copy[copy.length - 1].text = 'Sorry, I could not reach the chat service.';
        return copy;
      });
    }
    setIsLoading(false);
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',minHeight:0}}>
      <div ref={messagesContainerRef} style={{flex:1,overflow:'hidden',padding:12,display:'flex',flexDirection:'column',minHeight:0}}>
        {messages.length === 0 && (
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#888',fontSize:'14px',textAlign:'center',fontStyle:'italic'}}>
            Start a conversation. I'm here to listen and support you.
          </div>
        )}
        {messages.map((m,i)=> (
          <div key={i} style={{margin:'8px 0',textAlign: m.from === 'user' ? 'right' : 'left',flexShrink:0}}>
            <div style={{display:'inline-block',background: m.from === 'user' ? '#6FA8F1' : '#E8F4F8', color: m.from === 'user' ? '#fff' : '#2C3E50', padding:'10px 14px', borderRadius:14, boxShadow:'0 2px 8px rgba(0,0,0,0.08)',maxWidth:'85%',wordWrap:'break-word'}}>{m.text}</div>
          </div>
        ))}
        <div ref={endRef} style={{flexShrink:0}} />
      </div>
      <div style={{display:'flex',padding:12,borderTop:'1px solid rgba(0,0,0,0.1)',background:'#fff',gap:8,flexShrink:0}}>
        <textarea 
          ref={textareaRef}
          value={text} 
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          style={{flex:1,padding:10,borderRadius:10,border:'1px solid #D1E7F0',fontSize:'14px',fontFamily:'Inter, system-ui, sans-serif',resize:'none',minHeight:'40px',maxHeight:'120px',boxShadow:'0 2px 6px rgba(111,168,241,0.1)',opacity: isLoading ? 0.6 : 1,cursor: isLoading ? 'not-allowed' : 'text',overflow:'hidden'}} 
          placeholder="Say something... (Press Enter to send, Shift+Enter for new line)"
        />
        <button 
          onClick={send}
          disabled={isLoading || !text.trim()}
          style={{padding:'10px 16px',borderRadius:10,background: isLoading || !text.trim() ? '#ccc' : 'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)',color:'#fff',border:'none',cursor: isLoading || !text.trim() ? 'not-allowed' : 'pointer',fontWeight:'600',boxShadow: isLoading ? 'none' : '0 4px 12px rgba(111,168,241,0.3)',transition:'all 0.3s ease',opacity: isLoading || !text.trim() ? 0.6 : 1,flexShrink:0}}
          onMouseOver={(e) => !isLoading && text.trim() && (e.target.style.transform = 'translateY(-2px)')}
          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
