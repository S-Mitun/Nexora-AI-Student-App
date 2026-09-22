import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Trash2,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  X,
  Upload,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { apiService } from '../services/api';
import { StudyMaterialDocument } from '../types/learning';
import { useSyllabus } from '../context/SyllabusContext';

export const MaterialsPage: React.FC = () => {
  const { hasSyllabus } = useSyllabus();
  const [documents, setDocuments] = useState<StudyMaterialDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Upload modal form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentLanguage, setDocumentLanguage] = useState('en');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    try {
      const data = await apiService.getDocuments();
      setDocuments(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load study materials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  // Poll for background ingestion status for any active jobs
  useEffect(() => {
    const hasActiveJobs = documents.some(
      (d) => d.status === 'queued' || d.status === 'processing'
    );
    if (!hasActiveJobs) return;

    const interval = setInterval(async () => {
      try {
        const updated = await apiService.getDocuments();
        setDocuments(updated);
      } catch (e) {
        // silent background polling catch
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [documents]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!documentTitle.trim()) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setDocumentTitle(nameWithoutExt);
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a document file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', documentTitle.trim() || selectedFile.name);
    formData.append('language', documentLanguage);

    try {
      await apiService.uploadDocument(formData);
      setIsModalOpen(false);
      setSelectedFile(null);
      setDocumentTitle('');
      await loadDocuments();
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Upload failed. Please check file format.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this study material?')) return;
    try {
      await apiService.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Could not delete document.');
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesFilter = activeFilter === 'all' || doc.source_type.toLowerCase() === activeFilter.toLowerCase();
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.source_type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (doc: StudyMaterialDocument) => {
    // 1. Primary Syllabus Documents (classified under syllabus lifecycle)
    if (doc.document_role === 'syllabus') {
      if (doc.status === 'failed') {
        return (
          <Badge variant="outline" size="sm" className="flex items-center gap-1 border-rose-500/40 text-rose-300 bg-rose-500/15" title={doc.error_message}>
            <AlertCircle className="w-3 h-3" />
            <span>Failed</span>
          </Badge>
        );
      }
      if (doc.status === 'active') {
        return (
          <Badge variant="success" size="sm" className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3" />
            <span>Active Syllabus</span>
          </Badge>
        );
      }
      return (
        <Badge variant="neutral" size="sm" className="flex items-center gap-1 border-purple-500/40 text-purple-300 bg-purple-500/15">
          <CheckCircle2 className="w-3 h-3 text-purple-400" />
          <span>Verified Syllabus</span>
        </Badge>
      );
    }

    // 2. Secondary Study Materials
    if (doc.status === 'completed' || doc.status === 'ready') {
      return (
        <Badge variant="success" size="sm" className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>Ready</span>
        </Badge>
      );
    }
    if (doc.status === 'failed') {
      return (
        <Badge variant="outline" size="sm" className="flex items-center gap-1 border-rose-500/40 text-rose-300 bg-rose-500/15" title={doc.error_message}>
          <AlertCircle className="w-3 h-3" />
          <span>Failed</span>
        </Badge>
      );
    }
    return (
      <Badge variant="warning" size="sm" className="flex items-center gap-1 animate-pulse">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>{doc.processing_stage ? doc.processing_stage.replace('_', ' ') : 'Processing'} ({doc.progress_percent}%)</span>
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const t = type.toUpperCase();
    if (t === 'PDF') {
      return <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 font-mono text-[10px] font-bold">PDF</span>;
    }
    if (t === 'DOCX') {
      return <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 font-mono text-[10px] font-bold">DOCX</span>;
    }
    if (t === 'PPTX') {
      return <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono text-[10px] font-bold">PPTX</span>;
    }
    return <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono text-[10px] font-bold">{t}</span>;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return 'Unknown size';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-nexora-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-nexora-primary bg-nexora-primary/10 px-2.5 py-0.5 rounded-full border border-nexora-primary/20">
              Universal Academic Ingestion
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            My Study Materials
          </h1>
          <p className="text-sm text-nexora-subtext mt-1">
            Upload your curriculum textbooks, chapter slides, syllabus, and lecture notes. NEXORA processes them asynchronously into your personal Academic Workspace.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadDocuments}
            leftIcon={<RefreshCw className="w-4 h-4" />}
            title="Refresh documents"
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Upload Material
          </Button>
        </div>
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
            All ({documents.length})
          </button>
          <button
            onClick={() => setActiveFilter('pdf')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeFilter === 'pdf' ? 'bg-nexora-primary text-white' : 'text-nexora-muted hover:text-white'
            }`}
          >
            PDFs
          </button>
          <button
            onClick={() => setActiveFilter('docx')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeFilter === 'docx' ? 'bg-nexora-primary text-white' : 'text-nexora-muted hover:text-white'
            }`}
          >
            Documents
          </button>
          <button
            onClick={() => setActiveFilter('pptx')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeFilter === 'pptx' ? 'bg-nexora-primary text-white' : 'text-nexora-muted hover:text-white'
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
            placeholder="Search study materials..."
            className="w-full bg-nexora-surface border border-nexora-border text-white text-xs rounded-xl pl-9 pr-3 py-2 placeholder-nexora-muted focus:outline-none focus:border-nexora-primary"
          />
        </div>
      </div>

      {/* Materials List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-nexora-surface border border-nexora-border/60 animate-pulse h-20" />
          ))}
        </div>
      ) : filteredDocuments.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-8 h-8 text-nexora-muted" />}
          title={!hasSyllabus ? "No syllabus uploaded yet" : "No academic materials uploaded yet"}
          description={
            !hasSyllabus
              ? "Upload your official syllabus to build your learning workspace and primary curriculum blueprint."
              : "Upload textbooks, slides, or notes to supplement your active syllabus curriculum."
          }
          action={
            !hasSyllabus ? (
              <Link to="/syllabus">
                <Button variant="primary" size="sm" leftIcon={<Upload className="w-4 h-4" />}>
                  Upload Syllabus
                </Button>
              </Link>
            ) : (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Upload className="w-4 h-4" />}
                onClick={() => setIsModalOpen(true)}
              >
                Upload First Document
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredDocuments.map((doc) => {
            const detectedChapters = doc.metadata_json?.detected_chapters || [];
            const extractedConcepts = doc.metadata_json?.extracted_concepts || [];

            return (
              <div
                key={doc.id}
                className="p-4 sm:p-5 rounded-xl bg-nexora-surface border border-nexora-border/80 flex flex-col gap-3 hover:border-nexora-primary/40 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-nexora-elevated flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-nexora-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {doc.document_role === 'syllabus' ? (
                          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold text-[10px] uppercase tracking-wide border border-purple-500/30">
                            Primary Syllabus
                          </span>
                        ) : (
                          getTypeBadge(doc.source_type)
                        )}
                        <span className="text-xs font-semibold text-nexora-subtext">
                          {formatFileSize(doc.file_size_bytes)}
                        </span>
                        <span className="text-xs text-nexora-border">&bull;</span>
                        <span className="text-[11px] text-nexora-muted">
                          Language: {doc.language.toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-semibold text-white truncate max-w-xl">
                        {doc.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    {getStatusBadge(doc)}
                    {doc.document_role === 'syllabus' && (
                      <Link
                        to="/syllabus"
                        className="px-2.5 py-1 rounded-lg text-xs font-medium text-purple-300 hover:bg-purple-500/15 transition-colors flex items-center gap-1 border border-purple-500/30"
                        title="View in Syllabus Hub"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Syllabus Hub</span>
                      </Link>
                    )}
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 text-nexora-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Remove Material"
                      aria-label="Remove Material"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar for background processing: ONLY for secondary materials */}
                {doc.status === 'processing' && doc.document_role !== 'syllabus' && (
                  <div className="space-y-1.5 pt-2 border-t border-nexora-border/40">
                    <div className="flex items-center justify-between text-xs text-nexora-subtext">
                      <span className="capitalize font-medium text-amber-300">
                        {doc.processing_stage.replace('_', ' ')}...
                      </span>
                      <span className="font-mono">{doc.progress_percent}%</span>
                    </div>
                    <div className="w-full bg-nexora-elevated rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-nexora-primary h-full transition-all duration-300 rounded-full"
                        style={{ width: `${doc.progress_percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Extracted Academic Structure preview */}
                {doc.status === 'completed' && (detectedChapters.length > 0 || extractedConcepts.length > 0) && (
                  <div className="pt-2 border-t border-nexora-border/40 flex flex-wrap items-center gap-2 text-xs text-nexora-subtext">
                    <span className="font-semibold text-white flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-nexora-accent" />
                      Extracted Structure:
                    </span>
                    {detectedChapters.length > 0 && (
                      <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-medium">
                        {detectedChapters.length} Chapters Detected
                      </span>
                    )}
                    {extractedConcepts.length > 0 && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-medium">
                        {extractedConcepts.length} Concepts Identified
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Material Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-nexora-surface border border-nexora-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-nexora-border/60">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-nexora-primary" />
                Upload Academic Material
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-nexora-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* File Selector */}
              <div>
                <label className="text-xs font-medium text-nexora-subtext block mb-1.5">
                  Select Textbook, Notes, or Lecture Slides
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.pptx,.txt,image/*"
                  className="w-full bg-nexora-bg border border-nexora-border rounded-xl px-3 py-2 text-xs text-white file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-nexora-primary file:text-white hover:file:bg-nexora-primary/80"
                  required
                />
                <p className="text-[11px] text-nexora-muted mt-1">
                  Supported formats: PDF, Word (.docx), PowerPoint (.pptx), Text (.txt) up to 50 MB.
                </p>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-medium text-nexora-subtext block mb-1">
                  Material Title
                </label>
                <input
                  type="text"
                  required
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  placeholder="e.g. NCERT Class 8 Science - Force & Pressure"
                  className="w-full bg-nexora-bg border border-nexora-border rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-nexora-muted focus:outline-none focus:border-nexora-primary"
                />
              </div>

              {/* Language */}
              <div>
                <label className="text-xs font-medium text-nexora-subtext block mb-1">
                  Primary Document Language
                </label>
                <select
                  value={documentLanguage}
                  onChange={(e) => setDocumentLanguage(e.target.value)}
                  className="w-full bg-nexora-bg border border-nexora-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-nexora-primary"
                >
                  <option value="en">English</option>
                  <option value="ta">Tamil (தமிழ்)</option>
                  <option value="te">Telugu (తెలుగు)</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                </select>
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
                  isLoading={isUploading}
                  leftIcon={<Upload className="w-4 h-4" />}
                >
                  Start Ingestion
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
