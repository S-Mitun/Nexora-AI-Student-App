import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileText, 
  FileCheck, 
  Clock, 
  Sparkles, 
  Trash2, 
  ExternalLink, 
  Search, 
  BookOpen, 
  Layers,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Tabs } from '../components/ui/Tabs';
import { Callout } from '../components/ui/Callout';
import { EmptyState } from '../components/ui/EmptyState';
import { Link } from 'react-router-dom';

interface DocumentItem {
  id: string;
  name: string;
  type: 'PDF' | 'DOCX' | 'PPTX' | 'IMAGE';
  size: string;
  uploadedAt: string;
  status: 'indexed' | 'processing' | 'pending';
  topicsExtracted: number;
  course: string;
}

const INITIAL_DOCS: DocumentItem[] = [
  {
    id: 'doc-1',
    name: 'Halliday_Resnick_Wave_Mechanics_Ch17.pdf',
    type: 'PDF',
    size: '4.8 MB',
    uploadedAt: 'Yesterday',
    status: 'indexed',
    topicsExtracted: 14,
    course: 'Physics 101'
  },
  {
    id: 'doc-2',
    name: 'CLRS_Algorithms_Divide_and_Conquer.docx',
    type: 'DOCX',
    size: '2.1 MB',
    uploadedAt: '3 days ago',
    status: 'indexed',
    topicsExtracted: 8,
    course: 'Data Structures & Algorithms'
  },
  {
    id: 'doc-3',
    name: 'Signals_Systems_Fourier_Transform_Lec04.pptx',
    type: 'PPTX',
    size: '12.4 MB',
    uploadedAt: 'Just now',
    status: 'processing',
    topicsExtracted: 6,
    course: 'Electrical Engineering'
  },
  {
    id: 'doc-4',
    name: 'Differential_Calculus_Handwritten_Notes.pdf',
    type: 'PDF',
    size: '9.2 MB',
    uploadedAt: 'Sep 12, 2026',
    status: 'indexed',
    topicsExtracted: 11,
    course: 'Engineering Mathematics'
  }
];

export const MaterialsPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>(INITIAL_DOCS);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const filterTabs = [
    { id: 'all', label: `All Materials (${documents.length})` },
    { id: 'PDF', label: `PDFs (${documents.filter(d => d.type === 'PDF').length})` },
    { id: 'DOCX', label: `Word / DOCX (${documents.filter(d => d.type === 'DOCX').length})` },
    { id: 'PPTX', label: `Slides / PPTX (${documents.filter(d => d.type === 'PPTX').length})` },
  ];

  const handleSimulatedUpload = (fileType: 'PDF' | 'DOCX' | 'PPTX' = 'PDF') => {
    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      name: `Uploaded_Syllabus_${Date.now().toString().slice(-4)}.${fileType.toLowerCase()}`,
      type: fileType,
      size: `${(Math.random() * 5 + 1).toFixed(1)} MB`,
      uploadedAt: 'Just now',
      status: 'processing',
      topicsExtracted: Math.floor(Math.random() * 8) + 3,
      course: 'Independent Study'
    };
    setDocuments(prev => [newDoc, ...prev]);
    setUploadNotice(`Received "${newDoc.name}". Harmonization pipeline queued.`);
    setTimeout(() => setUploadNotice(null), 4000);
  };

  const handleDelete = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const filteredDocs = documents.filter(doc => {
    const matchesType = filterType === 'all' || doc.type === filterType;
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          doc.course.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-nexora-primary bg-nexora-primary/10 px-2.5 py-0.5 rounded-full border border-nexora-primary/20">
              Harmonization Hub
            </span>
            <span className="text-xs text-nexora-text-muted">Master Prompt 06 Ingestion</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-nexora-text">
            My Study Materials
          </h1>
          <p className="text-sm text-nexora-text-muted mt-1">
            Upload your syllabus, lecture slides, and notes. NEXORA unifies them into cross-referenced, interactive learning objects.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="primary" 
            icon={<UploadCloud className="w-4 h-4" />}
            onClick={() => handleSimulatedUpload('PDF')}
          >
            Upload File
          </Button>
        </div>
      </div>

      {/* Harmonization Explanation Callout */}
      <Callout
        variant="info"
        title="Document Harmonization Engine (Concept-Centric Architecture)"
      >
        <p className="text-sm leading-relaxed">
          NEXORA doesn't simply store static PDFs. In the harmonization pipeline, uploaded files are parsed, 
          deconstructed into structural headings, sanitized of duplicate terminology, and mapped into our 
          <strong> universal knowledge graph</strong>. This connects your college slides directly to visual labs, 
          Socratic AI explanations, and practice checkpoints.
        </p>
      </Callout>

      {/* Upload Dropzone */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleSimulatedUpload('PDF');
        }}
        className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all duration-300 ${
          isDragging 
            ? 'border-nexora-primary bg-nexora-primary/10 scale-[1.01]' 
            : 'border-nexora-border/60 hover:border-nexora-primary/40 bg-nexora-surface/30'
        }`}
      >
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-nexora-primary/10 border border-nexora-primary/20 flex items-center justify-center text-nexora-primary shadow-glow-sm">
          <UploadCloud className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-nexora-text">
          Drag & drop your study materials here
        </h3>
        <p className="text-xs text-nexora-text-muted mt-1.5 max-w-md mx-auto">
          Supports PDF, Word (.docx), PowerPoint (.pptx), and high-res diagram scans. Maximum file size 50 MB.
        </p>

        <div className="flex items-center justify-center gap-3 mt-5">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => handleSimulatedUpload('PDF')}
          >
            + Add PDF
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => handleSimulatedUpload('DOCX')}
          >
            + Add DOCX
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => handleSimulatedUpload('PPTX')}
          >
            + Add Slides
          </Button>
        </div>

        {uploadNotice && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs animate-fadeIn">
            <CheckCircle2 className="w-4 h-4" />
            <span>{uploadNotice}</span>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Tabs 
            tabs={filterTabs} 
            activeTab={filterType} 
            onChange={setFilterType} 
            variant="pills"
          />
          <div className="w-full sm:w-72">
            <Input 
              placeholder="Filter by title or course..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Documents Grid */}
        {filteredDocs.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-8 h-8" />}
            title="No matching materials found"
            description="Try changing your search query or upload a new syllabus document."
            action={
              <Button variant="primary" size="sm" onClick={() => handleSimulatedUpload('PDF')}>
                Upload Document
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDocs.map((doc) => {
              const typeColor = 
                doc.type === 'PDF' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                doc.type === 'DOCX' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                doc.type === 'PPTX' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                'text-purple-400 bg-purple-500/10 border-purple-500/20';

              return (
                <Card key={doc.id} hover className="flex flex-col justify-between">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border font-semibold text-xs ${typeColor}`}>
                          {doc.type}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-nexora-text leading-snug break-all line-clamp-1">
                            {doc.name}
                          </h4>
                          <p className="text-xs text-nexora-text-muted mt-1 flex items-center gap-2">
                            <span>{doc.course}</span>
                            <span>•</span>
                            <span>{doc.size}</span>
                            <span>•</span>
                            <span>{doc.uploadedAt}</span>
                          </p>
                        </div>
                      </div>

                      <div>
                        {doc.status === 'indexed' && (
                          <Badge variant="success" dot pulse={false}>
                            Indexed
                          </Badge>
                        )}
                        {doc.status === 'processing' && (
                          <Badge variant="warning" dot pulse={true}>
                            Harmonizing
                          </Badge>
                        )}
                        {doc.status === 'pending' && (
                          <Badge variant="neutral">
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3.5 border-t border-nexora-border/40 flex items-center justify-between text-xs text-nexora-text-muted">
                      <div className="flex items-center gap-1.5 text-nexora-accent">
                        <Layers className="w-3.5 h-3.5" />
                        <span className="font-medium">{doc.topicsExtracted} concepts extracted</span>
                      </div>
                      <span className="text-nexora-text-subtle">Vector Embeddings Ready</span>
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 bg-nexora-surface-hover/30 border-t border-nexora-border/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link to={`/learn?concept=wave-mechanics`}>
                        <Button variant="secondary" size="sm" icon={<BookOpen className="w-3.5 h-3.5" />}>
                          Explore
                        </Button>
                      </Link>
                      <Link to={`/chat?context=${encodeURIComponent(doc.name)}`}>
                        <Button variant="ghost" size="sm" icon={<Sparkles className="w-3.5 h-3.5" />}>
                          Ask AI
                        </Button>
                      </Link>
                    </div>

                    <button 
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 text-nexora-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete material"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
