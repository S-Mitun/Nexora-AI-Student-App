import React, { useState, useEffect } from 'react';
import { 
  BookMarked, 
  Plus, 
  Search, 
  Sparkles, 
  User, 
  Calendar, 
  Tag, 
  Trash2, 
  Save, 
  Edit3, 
  ArrowRight,
  CheckCircle2,
  FileText,
  Star
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Tabs } from '../components/ui/Tabs';
import { Callout } from '../components/ui/Callout';
import { EmptyState } from '../components/ui/EmptyState';
import { Link } from 'react-router-dom';

interface Note {
  id: string;
  title: string;
  content: string;
  authorType: 'student' | 'ai';
  conceptTag: string;
  updatedAt: string;
  starred: boolean;
}

const DEFAULT_NOTES: Note[] = [
  {
    id: 'note-1',
    title: 'Doppler Effect Wavefront Intuition',
    content: `When the wave source moves, the emitted wavefronts don't speed up—they stay at speed 'v'.\n\nInstead, the center of each consecutive sphere is shifted forward by (v_s * Δt). Ahead of the source, consecutive crests are crammed closer together (λ' < λ), causing higher frequency.\n\nCrucial for exams: If v_s = v, wavefronts stack directly on top of each other (Mach 1 shock wave).`,
    authorType: 'student',
    conceptTag: 'Doppler Effect',
    updatedAt: 'Today at 4:15 PM',
    starred: true
  },
  {
    id: 'note-2',
    title: 'Binary Search Midpoint Calculation Gotcha',
    content: `Never write: mid = (low + high) / 2;\n\nIn languages with 32-bit signed integers (C++, Java), if low and high are large (e.g. > 10^9), the sum overflows into negative numbers!\n\nCorrect formula: mid = low + (high - low) / 2;\n\nAlso remember: Binary search requires random access (O(1)) like arrays. On linked lists, finding mid takes O(N), defeating the purpose.`,
    authorType: 'student',
    conceptTag: 'Binary Search',
    updatedAt: 'Yesterday',
    starred: true
  },
  {
    id: 'note-3',
    title: 'AI Synthesis: Acoustic Radar & Redshift Comparison',
    content: `Key Parallel:\n1. Acoustic Doppler uses sound waves moving through air (medium dependent, governed by classical Doppler formula).\n2. Optical Redshift uses electromagnetic radiation in vacuum (medium independent, governed by Special Relativistic Doppler: f_obs = f_src * sqrt((1 - β)/(1 + β))).\n\nBoth reflect the fundamental geometry of moving sources relative to wavefront propagation.`,
    authorType: 'ai',
    conceptTag: 'Doppler Effect',
    updatedAt: 'Sep 14, 2026',
    starred: false
  }
];

export const NotesPage: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('nexora_student_notes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_NOTES;
      }
    }
    return DEFAULT_NOTES;
  });

  const [activeFilter, setActiveFilter] = useState<'all' | 'student' | 'ai' | 'starred'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState<string>(notes[0]?.id || '');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTag, setEditTag] = useState('');
  const [saveAlert, setSaveAlert] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('nexora_student_notes', JSON.stringify(notes));
  }, [notes]);

  const selectedNote = notes.find(n => n.id === selectedNoteId) || notes[0];

  useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content);
      setEditTag(selectedNote.conceptTag);
    }
  }, [selectedNoteId]);

  const handleCreateNote = () => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: 'Untitled Concept Note',
      content: 'Write your notes, derivations, and questions here...',
      authorType: 'student',
      conceptTag: 'General',
      updatedAt: 'Just now',
      starred: false
    };
    setNotes(prev => [newNote, ...prev]);
    setSelectedNoteId(newNote.id);
    setIsEditing(true);
    setEditTitle(newNote.title);
    setEditContent(newNote.content);
    setEditTag(newNote.conceptTag);
  };

  const handleSaveNote = () => {
    setNotes(prev => prev.map(n => {
      if (n.id === selectedNoteId) {
        return {
          ...n,
          title: editTitle,
          content: editContent,
          conceptTag: editTag,
          updatedAt: 'Just now'
        };
      }
      return n;
    }));
    setIsEditing(false);
    setSaveAlert('Note saved successfully!');
    setTimeout(() => setSaveAlert(null), 3000);
  };

  const handleDeleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selectedNoteId === id) {
      const remaining = notes.filter(n => n.id !== id);
      if (remaining.length > 0) {
        setSelectedNoteId(remaining[0].id);
      }
    }
  };

  const handleToggleStar = (id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, starred: !n.starred } : n));
  };

  const filterTabs = [
    { id: 'all', label: `All Notes (${notes.length})` },
    { id: 'student', label: `My Notes (${notes.filter(n => n.authorType === 'student').length})` },
    { id: 'ai', label: `AI Summaries (${notes.filter(n => n.authorType === 'ai').length})` },
    { id: 'starred', label: `Starred (${notes.filter(n => n.starred).length})` },
  ];

  const filteredNotes = notes.filter(n => {
    const matchesFilter = 
      activeFilter === 'all' ? true :
      activeFilter === 'student' ? n.authorType === 'student' :
      activeFilter === 'ai' ? n.authorType === 'ai' :
      n.starred;

    const matchesSearch = 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.conceptTag.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-nexora-primary bg-nexora-primary/10 px-2.5 py-0.5 rounded-full border border-nexora-primary/20">
              Personal Knowledge Journal
            </span>
            <span className="text-xs text-nexora-text-muted">Master Prompt 07 Reflection</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-nexora-text">
            My Notes & Synthesis
          </h1>
          <p className="text-sm text-nexora-text-muted mt-1">
            Capture your conceptual breakthroughs, derivations, and AI-assisted summaries in one searchable repository.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="primary" 
            icon={<Plus className="w-4 h-4" />}
            onClick={handleCreateNote}
          >
            New Note
          </Button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs 
          tabs={filterTabs} 
          activeTab={activeFilter} 
          onChange={(id) => setActiveFilter(id as any)} 
          variant="pills"
        />
        <div className="w-full sm:w-64">
          <Input 
            placeholder="Search notes or tags..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Notes Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Notes List (1 Col) */}
        <div className="space-y-3">
          {filteredNotes.length === 0 ? (
            <EmptyState 
              icon={<FileText className="w-8 h-8" />}
              title="No notes found"
              description="Create a new note or change your active filter."
              action={
                <Button variant="primary" size="sm" onClick={handleCreateNote}>
                  Create Note
                </Button>
              }
            />
          ) : (
            filteredNotes.map((note) => {
              const isSelected = note.id === selectedNoteId;
              return (
                <div
                  key={note.id}
                  onClick={() => { setSelectedNoteId(note.id); setIsEditing(false); }}
                  className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isSelected 
                      ? 'bg-nexora-surface border-nexora-primary shadow-glow-sm scale-[1.01]' 
                      : 'bg-nexora-surface/40 border-nexora-border/60 hover:bg-nexora-surface-hover/50 hover:border-nexora-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-nexora-text line-clamp-1">
                      {note.title}
                    </h3>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleStar(note.id); }}
                      className={`p-1 rounded hover:bg-nexora-surface-hover ${note.starred ? 'text-amber-400' : 'text-nexora-text-subtle'}`}
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>

                  <p className="text-xs text-nexora-text-muted mt-1.5 line-clamp-2 leading-relaxed">
                    {note.content}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-nexora-border/40 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {note.authorType === 'student' ? (
                        <span className="flex items-center gap-1 text-nexora-primary font-medium">
                          <User className="w-3 h-3" /> My Note
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-nexora-accent font-medium">
                          <Sparkles className="w-3 h-3" /> AI Summary
                        </span>
                      )}
                    </div>
                    <span className="text-nexora-text-subtle font-mono">{note.conceptTag}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Note Detail / Editor (2 Cols) */}
        <div className="lg:col-span-2">
          {selectedNote ? (
            <Card className="border-nexora-border/80 shadow-glow-sm">
              <CardHeader className="p-6 border-b border-nexora-border/40">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {selectedNote.authorType === 'student' ? (
                      <Badge variant="primary">Student Written</Badge>
                    ) : (
                      <Badge variant="info">AI Synthesis</Badge>
                    )}
                    <span className="text-xs text-nexora-text-muted flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {selectedNote.updatedAt}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <Button 
                        size="sm" 
                        variant="primary" 
                        icon={<Save className="w-3.5 h-3.5" />}
                        onClick={handleSaveNote}
                      >
                        Save Note
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        icon={<Edit3 className="w-3.5 h-3.5" />}
                        onClick={() => setIsEditing(true)}
                      >
                        Edit
                      </Button>
                    )}
                    <button
                      onClick={() => handleDeleteNote(selectedNote.id)}
                      className="p-2 text-nexora-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete Note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-3 mt-4">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full text-xl font-bold bg-nexora-surface/60 border border-nexora-border rounded-lg px-3 py-2 text-nexora-text focus:outline-none focus:border-nexora-primary"
                      placeholder="Note Title..."
                    />
                    <input
                      type="text"
                      value={editTag}
                      onChange={(e) => setEditTag(e.target.value)}
                      className="w-48 text-xs font-mono bg-nexora-surface/60 border border-nexora-border rounded-lg px-2.5 py-1 text-nexora-text-muted focus:outline-none focus:border-nexora-primary"
                      placeholder="Concept Tag..."
                    />
                  </div>
                ) : (
                  <div className="mt-3">
                    <h2 className="text-xl font-bold text-nexora-text">
                      {selectedNote.title}
                    </h2>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Tag className="w-3.5 h-3.5 text-nexora-text-muted" />
                      <span className="text-xs font-mono text-nexora-primary bg-nexora-primary/10 px-2 py-0.5 rounded border border-nexora-primary/20">
                        #{selectedNote.conceptTag}
                      </span>
                    </div>
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-6">
                {saveAlert && (
                  <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{saveAlert}</span>
                  </div>
                )}

                {isEditing ? (
                  <textarea
                    rows={14}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-4 rounded-xl bg-[#090d16] border border-nexora-border text-sm text-nexora-text font-mono leading-relaxed focus:outline-none focus:border-nexora-primary resize-y"
                    placeholder="Type note in markdown..."
                  />
                ) : (
                  <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap text-nexora-text font-sans">
                    {selectedNote.content}
                  </div>
                )}
              </CardContent>

              <CardFooter className="p-5 bg-nexora-surface-hover/20 border-t border-nexora-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-xs text-nexora-text-muted">
                  Connected Concept: <strong>{selectedNote.conceptTag}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <Link to={`/learn?q=${encodeURIComponent(selectedNote.conceptTag)}`}>
                    <Button variant="secondary" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Study in Learn
                    </Button>
                  </Link>
                  <Link to={`/chat?context=${encodeURIComponent(selectedNote.title)}`}>
                    <Button variant="ghost" size="sm" icon={<Sparkles className="w-3.5 h-3.5" />}>
                      Ask AI about this
                    </Button>
                  </Link>
                </div>
              </CardFooter>
            </Card>
          ) : (
            <EmptyState
              icon={<BookMarked className="w-8 h-8" />}
              title="No note selected"
              description="Choose a note from the left column or create a new one."
            />
          )}
        </div>
      </div>
    </div>
  );
};
