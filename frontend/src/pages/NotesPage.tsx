import React, { useState, useEffect } from 'react';
import {
  BookMarked,
  Plus,
  Search,
  Trash2,
  Edit3,
  Calendar,
  FolderKanban,
  CheckCircle2,
  X,
  FileText,
  Save,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

export interface StudentNote {
  id: string;
  title: string;
  subject: string;
  content: string;
  updatedAt: string;
}

const DEFAULT_STUDENT_NOTES: StudentNote[] = [
  {
    id: 'note-1',
    title: 'Doppler Effect Wavefront Mechanics',
    subject: 'Physics',
    content:
      "When the wave source moves, emitted wavefronts do not speed up—they remain at propagation speed 'v'.\n\nInstead, the geometric center of each consecutive sphere is shifted forward by (v_s * Δt). Ahead of the moving source, consecutive crests are compressed together (λ' < λ), producing higher observed frequency.\n\nExam Tip: If v_s approaches v, wavefronts pile up into a high-pressure shock cone (Mach 1).",
    updatedAt: 'Today at 4:15 PM',
  },
  {
    id: 'note-2',
    title: 'Binary Search Midpoint Overflow Protection',
    subject: 'Computer Science',
    content:
      'Avoid writing: mid = (low + high) / 2;\n\nIn standard 32-bit signed integers, if low and high are large (e.g. > 10^9), the sum overflows into negative values!\n\nStandard robust formulation: mid = low + (high - low) / 2;\n\nKey requirement: Binary search strictly requires random access memory arrays (O(1)). On singly linked lists, finding midpoint requires O(N) sequential traversal.',
    updatedAt: 'Yesterday',
  },
  {
    id: 'note-3',
    title: 'Matrix Coordinate Transformations & Basis Vectors',
    subject: 'Mathematics',
    content:
      'A matrix transformation can be visualized simply as describing where the standard basis vectors i-hat (1, 0) and j-hat (0, 1) land in the transformed space.\n\nThe determinant represents the factor by which any unit area scales under the transformation.',
    updatedAt: 'Sep 14, 2026',
  },
];

export const NotesPage: React.FC = () => {
  const [notes, setNotes] = useState<StudentNote[]>(() => {
    const saved = localStorage.getItem('nexora_student_notes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_STUDENT_NOTES;
      }
    }
    return DEFAULT_STUDENT_NOTES;
  });

  const [activeFilter, setActiveFilter] = useState<'all' | 'recent' | 'by-subject'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal / Editor State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalSubject, setModalSubject] = useState('Computer Science');
  const [modalContent, setModalContent] = useState('');

  // View note detail state
  const [viewingNote, setViewingNote] = useState<StudentNote | null>(null);

  useEffect(() => {
    localStorage.setItem('nexora_student_notes', JSON.stringify(notes));
  }, [notes]);

  const handleOpenCreateModal = () => {
    setEditingNoteId(null);
    setModalTitle('');
    setModalSubject('Computer Science');
    setModalContent('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (note: StudentNote) => {
    setEditingNoteId(note.id);
    setModalTitle(note.title);
    setModalSubject(note.subject);
    setModalContent(note.content);
    setIsModalOpen(true);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim()) return;

    if (editingNoteId) {
      // Edit existing
      setNotes(
        notes.map((n) =>
          n.id === editingNoteId
            ? {
                ...n,
                title: modalTitle.trim(),
                subject: modalSubject,
                content: modalContent,
                updatedAt: 'Just now',
              }
            : n
        )
      );
    } else {
      // Create new
      const newNote: StudentNote = {
        id: `note-${Date.now()}`,
        title: modalTitle.trim(),
        subject: modalSubject,
        content: modalContent,
        updatedAt: 'Just now',
      };
      setNotes([newNote, ...notes]);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setNotes(notes.filter((n) => n.id !== id));
    if (viewingNote?.id === id) setViewingNote(null);
  };

  // Unique subjects for subject filter
  const allSubjects = Array.from(new Set(notes.map((n) => n.subject)));

  const filteredNotes = notes.filter((note) => {
    const matchesSubject =
      selectedSubject === 'all' || note.subject.toLowerCase() === selectedSubject.toLowerCase();
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-nexora-border/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            My Notes
          </h1>
          <p className="text-sm text-nexora-subtext mt-1">
            Personal study reflections, lecture notes, and formula references.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleOpenCreateModal}
        >
          Create Note
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-nexora-surface rounded-xl border border-nexora-border/70 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => {
              setActiveFilter('all');
              setSelectedSubject('all');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              activeFilter === 'all' && selectedSubject === 'all'
                ? 'bg-nexora-primary text-white'
                : 'text-nexora-muted hover:text-white'
            }`}
          >
            All Notes ({notes.length})
          </button>
          {allSubjects.map((sub) => (
            <button
              key={sub}
              onClick={() => {
                setActiveFilter('by-subject');
                setSelectedSubject(sub);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                selectedSubject === sub
                  ? 'bg-nexora-primary text-white'
                  : 'text-nexora-muted hover:text-white'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-nexora-muted absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full bg-nexora-surface border border-nexora-border text-white text-xs rounded-xl pl-9 pr-3 py-2 placeholder-nexora-muted focus:outline-none focus:border-nexora-primary"
          />
        </div>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <EmptyState
          icon={<BookMarked className="w-8 h-8 text-nexora-muted" />}
          title="No notes yet"
          description="Create your first study note to organize your learning reflections."
          action={
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={handleOpenCreateModal}
            >
              Create Note
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNotes.map((note) => (
            <Card
              key={note.id}
              className="border-nexora-border/80 flex flex-col justify-between hover:border-nexora-primary/40 transition-colors group"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-semibold text-nexora-accent bg-nexora-elevated px-2 py-0.5 rounded-md">
                    {note.subject}
                  </span>
                  <span className="text-[10px] text-nexora-muted flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {note.updatedAt}
                  </span>
                </div>
                <CardTitle className="text-base text-white group-hover:text-nexora-primary transition-colors line-clamp-1">
                  {note.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="py-2 flex-1">
                <p className="text-xs text-nexora-subtext line-clamp-4 leading-relaxed whitespace-pre-line font-normal">
                  {note.content}
                </p>
              </CardContent>

              <CardFooter className="pt-3 border-t border-nexora-border/40 flex justify-between items-center">
                <button
                  onClick={() => setViewingNote(note)}
                  className="text-xs font-semibold text-nexora-primary hover:underline flex items-center gap-1"
                >
                  Open Note
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(note)}
                    className="p-1.5 text-nexora-muted hover:text-white hover:bg-nexora-elevated rounded-lg transition-colors"
                    title="Edit Note"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-1.5 text-nexora-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Delete Note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Note View Dialog */}
      {viewingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-nexora-surface border border-nexora-border rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between pb-3 border-b border-nexora-border/60">
              <div>
                <span className="text-xs font-semibold text-nexora-accent bg-nexora-elevated px-2 py-0.5 rounded-md">
                  {viewingNote.subject}
                </span>
                <h3 className="text-lg font-bold text-white mt-1.5">{viewingNote.title}</h3>
                <p className="text-[11px] text-nexora-muted">Last edited: {viewingNote.updatedAt}</p>
              </div>
              <button
                onClick={() => setViewingNote(null)}
                className="p-1 rounded-lg text-nexora-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-nexora-bg border border-nexora-border text-xs sm:text-sm text-nexora-text leading-relaxed whitespace-pre-line max-h-96 overflow-y-auto">
              {viewingNote.content}
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                onClick={() => {
                  const toEdit = viewingNote;
                  setViewingNote(null);
                  handleOpenEditModal(toEdit);
                }}
              >
                Edit Note
              </Button>
              <Button variant="primary" size="sm" onClick={() => setViewingNote(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Note Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-nexora-surface border border-nexora-border rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-nexora-border/60">
              <h3 className="text-base font-bold text-white">
                {editingNoteId ? 'Edit Study Note' : 'Create Study Note'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-nexora-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-nexora-subtext block mb-1">
                  Note Title
                </label>
                <input
                  type="text"
                  required
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder="e.g. Asymptotic Complexity Rules"
                  className="w-full bg-nexora-bg border border-nexora-border rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-nexora-muted focus:outline-none focus:border-nexora-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-nexora-subtext block mb-1">
                  Subject
                </label>
                <select
                  value={modalSubject}
                  onChange={(e) => setModalSubject(e.target.value)}
                  className="w-full bg-nexora-bg border border-nexora-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-nexora-primary"
                >
                  <option value="Computer Science">Computer Science</option>
                  <option value="Physics">Physics</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Biology">Biology</option>
                  <option value="Electrical Engineering">Electrical Engineering</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-nexora-subtext block mb-1">
                  Content &amp; Key Takeaways
                </label>
                <textarea
                  rows={6}
                  required
                  value={modalContent}
                  onChange={(e) => setModalContent(e.target.value)}
                  placeholder="Write your personal observations, equations, or reflections..."
                  className="w-full bg-nexora-bg border border-nexora-border rounded-xl p-3 text-xs sm:text-sm text-white placeholder-nexora-muted focus:outline-none focus:border-nexora-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-nexora-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  leftIcon={<Save className="w-3.5 h-3.5" />}
                >
                  Save Note
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
