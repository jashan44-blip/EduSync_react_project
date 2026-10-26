import { useEffect, useRef, useState } from "react";
import { Shell } from "../Shell.jsx";
import { usePage } from "../SiteLayout.jsx";
import { aiRespond, currentUser, currentUserData } from "../core.js";

const SUGGESTIONS = [
  "What should I study today?",
  "How's my attendance?",
  "What's overdue?",
  "Give me a summary of patterns",
  "Motivate me"
];
const SUGGESTION_LABELS = {
  "Give me a summary of patterns": "Summary of patterns"
};

export default function Assistant() {
  usePage("AI Study Assistant — EduSync", "assistant");
  const data = currentUserData();
  const firstSubject = data.subjects[0];
  const chatLog = useRef(null);
  const timers = useRef([]);
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState(() => {
    const u = currentUser();
    // Opening message
    return [{
      sender: "bot",
      text: `Hi ${u.fullName.split(" ")[0]}! I'm your local AI Study Assistant — I read your subjects, assignments and attendance right here on this device. Ask a question, or say “mark [subject name] present” or “mark [subject name] absent” to update a class.`
    }];
  });
  const [input, setInput] = useState("");

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // keep the log scrolled to the newest message
  useEffect(() => {
    chatLog.current.scrollTop = chatLog.current.scrollHeight;
  }, [messages, typing]);

  function ask(question) {
    setMessages(m => [...m, { sender: "user", text: question }]);
    setTyping(true);
    const delay = 400 + Math.random() * 500; // brief, believable "thinking" pause — purely cosmetic
    timers.current.push(setTimeout(() => {
      setTyping(false);
      const answer = aiRespond(question);
      setMessages(m => [...m, { sender: "bot", text: answer }]);
    }, delay));
  }

  function onSubmit(e) {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    setInput("");
    ask(q);
  }

  return (
    <Shell active="assistant" title="AI Study Assistant">
      <p style={{ color: "var(--muted)", marginBottom: "4px" }}>Ask about your studies or update attendance with a command like “mark {firstSubject?.name || "a subject"} present”. Your data stays on this device; no API key or network call is needed.</p>
      <div className="chat-shell">
        <div className="chat-log" id="chatLog" ref={chatLog}>
          {messages.map((m, i) => m.sender === "bot" ? (
            <div className="chat-msg bot" key={i}>
              <div className="ai-tag">✨ EduSync AI</div><div dangerouslySetInnerHTML={{ __html: m.text }} />
            </div>
          ) : (
            <div className="chat-msg user" key={i}>{m.text}</div>
          ))}
          {typing && (
            <div className="chat-msg bot" id="typingIndicator">
              <div className="ai-tag">✨ EduSync AI</div><div className="typing-dots"><span></span><span></span><span></span></div>
            </div>
          )}
        </div>
        <div className="chat-suggestions" id="chatSuggestions">
          {[...SUGGESTIONS, ...(firstSubject ? [`Mark ${firstSubject.name} present`] : [])].map(q => (
            <button key={q} className="chip" onClick={() => ask(q)}>{SUGGESTION_LABELS[q] || q}</button>
          ))}
        </div>
        <form id="chatForm" className="chat-input-row" onSubmit={onSubmit}>
          <input type="text" id="chatInput" placeholder="Ask anything about your studies…" autoComplete="off"
            value={input} onChange={(e) => setInput(e.target.value)} />
          <button type="submit" className="btn btn-ai magnetic">Send</button>
        </form>
      </div>
    </Shell>
  );
}
