import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Trash2,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  X,
  Upload,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

export interface StudyMaterial {
  id: string;
  name: string;
  type: 'PDF' | 'DOCX' | 'PPTX';
  subject: string;
  dateAdded: string;
  status: 'Ready' | 'Processing';
  size: string;
}

export const MaterialsPage: React.FC = () => {
  const [materials, setMaterials] = useState<StudyMaterial[]>(() => {
    const saved = localStorage.getItem('nexora_student_materials');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [activeFilter, setActiveFilter] = useState<'all' | 'PDF' | 'DOCX' | 'PPTX'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Add material form state
  const [newName, setNewName] = useState('');
  const [newSubject, setNewSubject] = useState('Computer Science');
  const [newType, setNewType] = useState<'PDF' | 'DOCX' | 'PPTX'>('PDF');

  useEffect(() => {
    localStorage.setItem('nexora_student_materials', JSON.stringify(materials));
  }, [materials]);

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const formattedName = newName.trim().endsWith(`.${newType.toLowerCase()}`)
      ? newName.trim()
      : `${newName.trim()}.${newType.toLowerCase()}`;

    const newMaterial: StudyMaterial = {
      id: `mat-${Date.now()}`,
      name: formattedName,
      type: newType,
      subject: newSubject,
      dateAdded: 'Today',
      status: 'Ready',
      size: '2.4 MB',
    };

    setMaterials([newMaterial, ...materials]);
    setNewName('');
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setMaterials(materials.filter((m) => m.id !== id));
  };

  const filteredMaterials = materials.filter((m) => {
    const matchesFilter = activeFilter === 'all' || m.type === activeFilter;
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getTypeBadge = (type: StudyMaterial['type']) => {
    switch (type) {
      case 'PDF':
        return <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 font-mono text-[10px] font-bold">PDF</span>;
      case 'DOCX':
        return <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 font-mono text-[10px] font-bold">DOCX</span>;
      case 'PPTX':
        return <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono text-[10px] font-bold">PPTX</span>;
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-nexora-border/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            My Materials
          </h1>
          <p className="text-sm text-nexora-subtext mt-1">
            Keep your textbooks, lecture notes, syllabus, and course slides organized in one place.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Add Material
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-nexora-surface rounded-xl border border-nexora-border/70 w-full sm:w-auto">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeFilter === 'all' ? 'bg-nexora-primary text-white' : 'text-nexora-muted hover:text-white'
            }`}
          >
            All ({materials.length})
          </button>
          <button
            onClick={() => setActiveFilter('PDF')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeFilter === 'PDF' ? 'bg-nexora-primary text-white' : 'text-nexora-muted hover:text-white'
            }`}
          >
            PDFs
          </button>
          <button
            onClick={() => setActiveFilter('DOCX')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeFilter === 'DOCX' ? 'bg-nexora-primary text-white' : 'text-nexora-muted hover:text-white'
            }`}
          >
            Documents
          </button>
          <button
            onClick={() => setActiveFilter('PPTX')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeFilter === 'PPTX' ? 'bg-nexora-primary text-white' : 'text-nexora-muted hover:text-white'
            }`}
          >
            Slides
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-nexora-muted absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search materials..."
            className="w-full bg-nexora-surface border border-nexora-border text-white text-xs rounded-xl pl-9 pr-3 py-2 placeholder-nexora-muted focus:outline-none focus:border-nexora-primary"
          />
        </div>
      </div>

      {/* Materials List */}
      {filteredMaterials.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-8 h-8 text-nexora-muted" />}
          title="No materials uploaded yet"
          description="Upload your syllabus, lecture notes, or textbooks (PDF, DOCX) to study with them."
          action={
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsModalOpen(true)}
            >
              Upload First Document
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredMaterials.map((mat) => (
            <div
              key={mat.id}
              className="p-4 rounded-xl bg-nexora-surface border border-nexora-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-nexora-primary/40 transition-colors"
            >
              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-nexora-elevated flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-nexora-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {getTypeBadge(mat.type)}
                    <span className="text-xs font-semibold text-nexora-subtext">{mat.subject}</span>
                    <span className="text-xs text-nexora-border">&bull;</span>
                    <span className="text-[11px] text-nexora-muted">Added {mat.dateAdded}</span>
                  </div>
                  <h3 className="text-sm font-medium text-white truncate max-w-xl">
                    {mat.name}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                <Badge variant="success" size="sm">
                  {mat.status}
                </Badge>
                <button
                  onClick={() => alert(`Opening material: ${mat.name}`)}
                  className="px-3 py-1.5 rounded-lg bg-nexora-elevated hover:bg-nexora-elevated/80 text-white text-xs font-medium border border-nexora-border transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open</span>
                </button>
                <button
                  onClick={() => handleDelete(mat.id)}
                  className="p-1.5 text-nexora-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Remove Material"
                  aria-label="Remove Material"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Material Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-nexora-surface border border-nexora-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-nexora-border/60">
              <h3 className="text-base font-bold text-white">Add Study Material</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-nexora-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMaterial} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-nexora-subtext block mb-1">
                  Document or Material Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Operating Systems Chapter 3 Notes"
                  className="w-full bg-nexora-bg border border-nexora-border rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-nexora-muted focus:outline-none focus:border-nexora-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-nexora-subtext block mb-1">
                    Subject Course
                  </label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full bg-nexora-bg border border-nexora-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-nexora-primary"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Physics">Physics</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Electrical Engineering">Electrical Engineering</option>
                    <option value="Biology">Biology</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-nexora-subtext block mb-1">
                    Document Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full bg-nexora-bg border border-nexora-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-nexora-primary"
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="DOCX">Word (.docx)</option>
                    <option value="PPTX">Slides (.pptx)</option>
                  </select>
                </div>
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
                <Button type="submit" variant="primary" size="sm">
                  Add to Materials
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
