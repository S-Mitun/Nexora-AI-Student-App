import React, { useState } from 'react';
import {
  MessageSquare,
  Sparkles,
  Paperclip,
  Mic,
  Send,
  BookOpen,
  HelpCircle,
  FileText,
  Sliders,
  Award,
  Compass,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

interface ChatMessage {
  id: string;
  sender: 'student' | 'assistant';
  content: string;
  citations?: Array<{ source: string; page?: number; excerpt?: string }>;
  suggestedFollowUps?: string[];
  timestamp: string;
}

const CHAT_MODES = [
  { id: 'materials', label: 'My Materials', icon: FileText, desc: 'Grounded in uploaded syllabus & PDFs' },
  { id: 'socratic', label: 'Learn With Me', icon: Compass, desc: 'Socratic questioning & misconception checks' },
  { id: 'deep', label: 'Deep Explanation', icon: BookOpen, desc: 'Rigorous mathematical/technical depth' },
  { id: 'simple', label: 'Simple Explanation', icon: Sparkles, desc: 'Intuitive analogies & plain language' },
  { id: 'visualize', label: 'Visualize This', icon: Sliders, desc: 'Generates observable interactive models' },
  { id: 'apply', label: 'Apply This', icon: Award, desc: 'Real-world engineering scenarios' },
  { id: 'test', label: 'Test Me', icon: HelpCircle, desc: 'Active recall & concept challenges' },
];

export const ChatPage: React.FC = () => {
  const [activeMode, setActiveMode] = useState('socratic');
  const [inputQuery, setInputQuery] = useState('');

  // Demonstration conversation shell representing the verified pedagogical format
  const [messages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      content:
        "Hello! I am your NEXORA AI Tutor. I don't just dump pre-written summaries—I help you understand the core mechanics of what you are learning through Socratic inquiry. What concept or problem are you wrestling with?",
      suggestedFollowUps: [
        'Why does wavefront frequency shift in the Doppler Effect?',
        'How does Binary Search achieve O(log n) efficiency?',
        'Explain deadlock using a relatable analogy.',
      ],
      timestamp: 'Just now',
    },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;
    // In Stage 02, transparently show that message dispatch connects to Stage 06 RAG pipeline
    alert(
      `Query received: "${inputQuery}"\n\nNEXORA AI Companion Shell: Grounded RAG retrieval and LLM completions will be activated in Master Prompt 06. Your query has been logged to the session.`
    );
    setInputQuery('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-nexora-border/40">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="primary" size="sm">
              Stage 06 Preview
            </Badge>
            <span className="text-xs text-nexora-muted">&bull;</span>
            <span className="text-xs text-nexora-muted">Grounded RAG Assistant Shell</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            NEXORA Socratic AI Companion
          </h1>
        </div>

        <Badge variant="accent" size="sm" hasDot>
          Mode: {CHAT_MODES.find((m) => m.id === activeMode)?.label}
        </Badge>
      </div>

      {/* Mode Switcher Bar */}
      <div className="bg-nexora-surface/70 rounded-2xl p-2 border border-nexora-border/70 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-[640px]">
          {CHAT_MODES.map((mode) => {
            const Icon = mode.icon;
            const isActive = mode.id === activeMode;
            return (
              <button
                key={mode.id}
                onClick={() => setActiveMode(mode.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-nexora-primary text-white shadow-glow/40'
                    : 'text-nexora-subtext hover:text-white hover:bg-nexora-elevated'
                }`}
                title={mode.desc}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message Stream */}
      <Card variant="glass" className="min-h-[380px] flex flex-col justify-between p-4 sm:p-6 space-y-6">
        <div className="space-y-4 overflow-y-auto max-h-[460px] pr-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3.5 ${msg.sender === 'student' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shrink-0 shadow-glow/40">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'student'
                    ? 'bg-nexora-primary text-white rounded-br-none'
                    : 'bg-nexora-elevated border border-nexora-border/70 text-nexora-text rounded-bl-none'
                }`}
              >
                <p>{msg.content}</p>

                {/* Citations block */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-nexora-accent block">
                      Textbook Citations
                    </span>
                    {msg.citations.map((c, i) => (
                      <div key={i} className="text-[11px] text-nexora-subtext flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-indigo-400" />
                        <span>
                          {c.source} {c.page ? `(Page ${c.page})` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggested follow-ups */}
                {msg.suggestedFollowUps && (
                  <div className="mt-4 pt-3 border-t border-nexora-border/50">
                    <span className="text-[10px] font-bold text-nexora-muted uppercase tracking-wider block mb-2">
                      Suggested Socratic Prompts:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestedFollowUps.map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => setInputQuery(prompt)}
                          className="text-[11px] text-left px-2.5 py-1 rounded-lg bg-nexora-bg/70 border border-nexora-border text-nexora-subtext hover:text-white hover:border-nexora-primary/50 transition-colors cursor-pointer"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* RAG Context Notice */}
        <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-center">
          <p className="text-[11px] text-indigo-300">
            <strong>Stage 06 Connection Point:</strong> RAG retrieval embeddings and real LLM completions will be integrated during Master Prompt 06.
          </p>
        </div>

        {/* Input Bar with attachments & voice icons */}
        <form onSubmit={handleSend} className="pt-3 border-t border-nexora-border/60">
          <div className="relative flex items-center rounded-2xl bg-nexora-surface border border-nexora-border p-1.5 focus-within:border-nexora-primary">
            <button
              type="button"
              className="p-2 text-nexora-muted hover:text-white hover:bg-nexora-elevated rounded-xl transition-colors"
              title="Attach study material or lecture notes"
              onClick={() => alert('Document attachment will link to My Materials in Stage 06.')}
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={`Ask NEXORA in ${CHAT_MODES.find((m) => m.id === activeMode)?.label} mode...`}
              className="flex-1 bg-transparent border-0 text-white placeholder-nexora-muted text-xs sm:text-sm px-3 focus:outline-none"
            />

            <button
              type="button"
              className="p-2 text-nexora-muted hover:text-white hover:bg-nexora-elevated rounded-xl transition-colors"
              title="Voice query (Stage 15 multilingual voice)"
              onClick={() => alert('Voice input is prepared for Stage 15.')}
            >
              <Mic className="w-4 h-4" />
            </button>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!inputQuery.trim()}
              className="rounded-xl px-3"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
