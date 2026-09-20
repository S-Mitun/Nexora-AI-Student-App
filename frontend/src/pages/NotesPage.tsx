import React, { useState, useEffect, useCallback } from 'react';
import {
  BookMarked,
  Plus,
  Search,
  Trash2,
  Edit3,
  Calendar,
  Pin,
  X,
  Save,
  Loader2,
  Tag,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { useAcademicContext } from '../context/AcademicContext';
import { AcademicContentRenderer } from '../components/common/AcademicContentRenderer';
import { apiService } from '../services/api';
import { StudentNote } from '../types/learning';

export const NotesPage: React.FC = () => {
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<'all' | 'pinned' | 'by-subject'>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { academicContext, enrolledSubjects } = useAcademicContext();
  const currentTier = academicContext?.academic_level;

  // Modal / Editor State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalSubjectId, setModalSubjectId] = useState<string>('');
  const [modalContent, setModalContent] = useState('');
  const [modalTags, setModalTags] = useState('');
  const [modalIsPinned, setModalIsPinned] = useState(false);

  // View note detail modal
  const [viewingNote, setViewingNote] = useState<StudentNote | null>(null);

  const loadNotes = useCallback(async () => {
    if (!currentTier) {
      setNotes([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiService.getNotes({ academic_level: currentTier });
      setNotes(data);
    } catch (err: any) {
      console.error('Failed to load notes from API:', err);
      setError(err.response?.data?.detail || 'Failed to fetch personal notes.');
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentTier]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleOpenCreateModal = () => {
    setEditingNoteId(null);
    setModalTitle('');
    setModalSubjectId(enrolledSubjects[0]?.id || '');
    setModalContent('');
    setModalTags('');
    setModalIsPinned(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (note: StudentNote) => {
    setEditingNoteId(note.id);
    setModalTitle(note.title);
    setModalSubjectId(note.subject_id || '');
    setModalContent(note.content);
    setModalTags(note.tags ? note.tags.join(', ') : '');
    setModalIsPinned(note.is_pinned);
    setIsModalOpen(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim()) return;

    setIsSaving(true);
    try {
      const parsedTags = modalTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      if (editingNoteId) {
        const updated = await apiService.updateNote(editingNoteId, {
          title: modalTitle.trim(),
          content: modalContent,
          subject_id: modalSubjectId || null,
          tags: parsedTags,
          is_pinned: modalIsPinned,
        });
        setNotes((prev) => prev.map((n) => (n.id === editingNoteId ? updated : n)));
      } else {
        const created = await apiService.createNote({
          title: modalTitle.trim(),
          content: modalContent,
          subject_id: modalSubjectId || null,
          academic_level: currentTier,
          tags: parsedTags,
          is_pinned: modalIsPinned,
        });
        setNotes((prev) => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save note:', err);
      alert(err.response?.data?.detail || 'Could not save note.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this study note?')) return;
    try {
      await apiService.deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (viewingNote?.id === id) setViewingNote(null);
    } catch (err: any) {
      console.error('Failed to delete note:', err);
      alert('Failed to delete note.');
    }
  };

  const handleTogglePin = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await apiService.togglePinNote(id);
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      if (viewingNote?.id === id) setViewingNote(updated);
    } catch (err: any) {
      console.error('Failed to toggle pin:', err);
    }
  };

  const getSubjectName = (subjectId?: string | null) => {
    if (!subjectId) return 'General Notes';
    const found = enrolledSubjects.find((s) => s.id === subjectId);
    return found ? found.name : 'Study Note';
  };

  const filteredNotes = notes.filter((note) => {
    if (activeFilter === 'pinned' && !note.is_pinned) return false;
    if (selectedSubjectId !== 'all' && note.subject_id !== selectedSubjectId) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = note.title.toLowerCase().includes(q);
      const contentMatch = note.content.toLowerCase().includes(q);
      const tagsMatch = note.tags?.some((t) => t.toLowerCase().includes(q));
      return titleMatch || contentMatch || tagsMatch;
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-nexora-border/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Study Notes
          </h1>
          <p className="text-sm text-nexora-subtext mt-1">
            Personal study notes, formula references, and concept reflections scoped to your current academic tier ({academicContext?.education_category || currentTier}).
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
              setSelectedSubjectId('all');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              activeFilter === 'all' && selectedSubjectId === 'all'
                ? 'bg-nexora-primary text-white'
                : 'text-nexora-muted hover:text-white'
            }`}
          >
            All Notes ({notes.length})
          </button>
          <button
            onClick={() => {
              setActiveFilter('pinned');
              setSelectedSubjectId('all');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              activeFilter === 'pinned'
                ? 'bg-nexora-primary text-white'
                : 'text-nexora-muted hover:text-white'
            }`}
          >
            Pinned ({notes.filter((n) => n.is_pinned).length})
          </button>
          {enrolledSubjects.map((sub) => (
            <button
              key={sub.id}
              onClick={() => {
                setActiveFilter('by-subject');
                setSelectedSubjectId(sub.id);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                selectedSubjectId === sub.id
                  ? 'bg-nexora-primary text-white'
                  : 'text-nexora-muted hover:text-white'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-nexora-muted absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes or tags..."
            className="w-full bg-nexora-surface border border-nexora-border text-white text-xs rounded-xl pl-9 pr-3 py-2 placeholder-nexora-muted focus:outline-none focus:border-nexora-primary"
          />
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-nexora-muted">
          <Loader2 className="w-8 h-8 animate-spin text-nexora-primary mb-3" />
          <p className="text-sm">Loading your personal study notes...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm text-center">
          {error}
        </div>
      ) : filteredNotes.length === 0 ? (
        <EmptyState
          icon={<BookMarked className="w-8 h-8 text-nexora-muted" />}
          title="No notes created yet for this academic level"
          description="Your notes are strictly tied to your active academic context. Create your first note or key equation reference below."
          action={
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={handleOpenCreateModal}
            >
              Create Your First Note
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNotes.map((note) => (
            <Card
              key={note.id}
              className="border-nexora-border/80 flex flex-col justify-between hover:border-nexora-primary/40 transition-colors group relative"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-semibold text-nexora-accent bg-nexora-elevated px-2 py-0.5 rounded-md truncate max-w-[160px]">
                    {getSubjectName(note.subject_id)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleTogglePin(note.id, e)}
                      className={`p-1 rounded-md transition-colors ${
                        note.is_pinned
                          ? 'text-amber-400 hover:text-amber-300'
                          : 'text-nexora-muted hover:text-white'
                      }`}
                      title={note.is_pinned ? 'Unpin Note' : 'Pin Note'}
                    >
                      <Pin className={`w-3.5 h-3.5 ${note.is_pinned ? 'fill-current' : ''}`} />
                    </button>
                    <span className="text-[10px] text-nexora-muted flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(note.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <CardTitle className="text-base text-white group-hover:text-nexora-primary transition-colors line-clamp-1">
                  {note.title}
                </CardTitle>
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {note.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] bg-nexora-surface border border-nexora-border/60 text-nexora-subtext px-1.5 py-0.5 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </CardHeader>

              <CardContent className="py-2 flex-1">
                <div className="line-clamp-4 overflow-hidden text-xs text-nexora-text">
                  <AcademicContentRenderer content={note.content} compact />
                </div>
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
                  {getSubjectName(viewingNote.subject_id)}
                </span>
                <h3 className="text-lg font-bold text-white mt-1.5">{viewingNote.title}</h3>
                <p className="text-[11px] text-nexora-muted">
                  Updated: {new Date(viewingNote.updated_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setViewingNote(null)}
                className="p-1 rounded-lg text-nexora-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-nexora-bg border border-nexora-border text-xs sm:text-sm text-nexora-text leading-relaxed max-h-96 overflow-y-auto">
              <AcademicContentRenderer content={viewingNote.content} />
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
                  placeholder="e.g. Newton's Laws & Hydraulic Lift Derivation"
                  className="w-full bg-nexora-bg border border-nexora-border rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-nexora-muted focus:outline-none focus:border-nexora-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-nexora-subtext block mb-1">
                  Subject Association
                </label>
                <select
                  value={modalSubjectId}
                  onChange={(e) => setModalSubjectId(e.target.value)}
                  className="w-full bg-nexora-bg border border-nexora-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-nexora-primary"
                >
                  <option value="">General Notes (No specific subject)</option>
                  {enrolledSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-nexora-subtext block mb-1">
                  Content (Supports LaTeX e.g. $F=ma$, and Markdown)
                </label>
                <textarea
                  rows={6}
                  required
                  value={modalContent}
                  onChange={(e) => setModalContent(e.target.value)}
                  placeholder="Write your personal observations, equations ($E=mc^2$), and takeaways..."
                  className="w-full bg-nexora-bg border border-nexora-border rounded-xl p-3 text-xs sm:text-sm text-white placeholder-nexora-muted focus:outline-none focus:border-nexora-primary font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-nexora-subtext block mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={modalTags}
                  onChange={(e) => setModalTags(e.target.value)}
                  placeholder="e.g. physics, formulas, exam-review"
                  className="w-full bg-nexora-bg border border-nexora-border rounded-xl px-3 py-2 text-xs text-white placeholder-nexora-muted focus:outline-none focus:border-nexora-primary"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="modalIsPinned"
                  checked={modalIsPinned}
                  onChange={(e) => setModalIsPinned(e.target.checked)}
                  className="rounded border-nexora-border text-nexora-primary focus:ring-0"
                />
                <label htmlFor="modalIsPinned" className="text-xs text-nexora-text cursor-pointer">
                  Pin to top of study space
                </label>
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
                  disabled={isSaving}
                  leftIcon={isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                >
                  {isSaving ? 'Saving...' : 'Save Note'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
