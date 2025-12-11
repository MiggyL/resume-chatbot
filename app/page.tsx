"use client";

import { useState } from "react";

type Message = { role: "user" | "bot"; text: string };

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  async function send() {
    if (!input.trim()) return;

    const userText = input;
    setMessages((m) => [...m, { role: "user", text: userText }]);
    setInput("");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: userText })
    });

    const data = await res.json();
    setMessages((m) => [...m, { role: "bot", text: data.answer }]);
  }

  return (
    <main style={{ maxWidth: 800, margin: "2rem auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>Resume Chatbot (FREE, No API Keys)</h1>

      <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8, minHeight: 300 }}>
        {messages.map((m, idx) => (
          <div key={idx} style={{ marginBottom: 12 }}>
            <strong>{m.role === "user" ? "You" : "Bot"}</strong>
            <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
          </div>
        ))}
        {messages.length === 0 && (
          <p style={{ color: "#777" }}>Ask anything about your résumé — skills, projects, experience, certifications.</p>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask a question..."
          style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: "1px solid #ccc" }}
        />
        <button onClick={send} style={{ padding: "8px 16px", borderRadius: 6 }}>
          Send
        </button>
      </div>
    </main>
  );
}