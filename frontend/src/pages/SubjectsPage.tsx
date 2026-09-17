import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  BookOpen,
  Cpu,
  Zap,
  Binary,
  Dna,
  Search,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { apiService } from '../services/api';
import { Subject } from '../types/learning';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SkeletonCard } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';

export const SubjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDomain, setFilterDomain] = useState<'all' | 'cs' | 'sciences'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    let isMounted = true;
    apiService
      .getSubjects()
      .then((data) => {
        if (isMounted) {
          setSubjects(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const getSubjectIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap':
        return <Zap className="w-5 h-5 text-amber-400" />;
      case 'Cpu':
        return <Cpu className="w-5 h-5 text-indigo-400" />;
      case 'Binary':
        return <Binary className="w-5 h-5 text-cyan-400" />;
      case 'Dna':
        return <Dna className="w-5 h-5 text-emerald-400" />;
      default:
        return <BookOpen className="w-5 h-5 text-indigo-400" />;
    }
  };

  // Curated subject educational metadata
  const subjectMetadata: Record<string, { modules: number; domain: 'cs' | 'sciences' }> = {
    'computer-science': { modules: 5, domain: 'cs' },
    physics: { modules: 4, domain: 'sciences' },
    mathematics: { modules: 4, domain: 'sciences' },
    biology: { modules: 3, domain: 'sciences' },
  };

  const filteredSubjects = subjects.filter((sub) => {
    const meta = subjectMetadata[sub.slug] || { domain: 'sciences' };
    const matchesDomain = filterDomain === 'all' || meta.domain === filterDomain;
    const matchesSearch = sub.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          sub.description.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesDomain && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-nexora-border/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Subjects &amp; Course Tracks
          </h1>
          <p className="text-sm text-nexora-subtext mt-1">
            Browse structured courses, curriculum modules, and syllabus topics.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-nexora-surface rounded-xl border border-nexora-border/70 w-full sm:w-auto">
          <button
            onClick={() => setFilterDomain('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterDomain === 'all' ? 'bg-nexora-primary text-white' : 'text-nexora-muted hover:text-white'
            }`}
          >
            All Subjects
          </button>
          <button
            onClick={() => setFilterDomain('cs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterDomain === 'cs' ? 'bg-nexora-primary text-white' : 'text-nexora-muted hover:text-white'
            }`}
          >
            Computer Science
          </button>
          <button
            onClick={() => setFilterDomain('sciences')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterDomain === 'sciences' ? 'bg-nexora-primary text-white' : 'text-nexora-muted hover:text-white'
            }`}
          >
            Natural Sciences &amp; Math
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-nexora-muted absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter subjects..."
            className="w-full bg-nexora-surface border border-nexora-border text-white text-xs rounded-xl pl-9 pr-3 py-2 placeholder-nexora-muted focus:outline-none focus:border-nexora-primary"
          />
        </div>
      </div>

      {/* Subjects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubjects.map((sub) => {
            const meta = subjectMetadata[sub.slug] || { modules: 4, progress: 25, domain: 'sciences' };

            return (
              <Card
                key={sub.id}
                variant="interactive"
                onClick={() => navigate(`/subjects/${sub.slug}`)}
                className="group flex flex-col justify-between"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-nexora-elevated flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      {getSubjectIcon(sub.icon)}
                    </div>
                    <Badge variant="neutral" size="sm">
                      {meta.modules} Modules
                    </Badge>
                  </div>
                  <CardTitle className="text-lg group-hover:text-nexora-accent transition-colors">
                    {sub.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 text-xs">
                    {sub.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="py-2">
                  <div className="p-3 rounded-xl bg-nexora-bg/60 border border-nexora-border/50 space-y-2">
                    <div className="flex justify-between text-xs text-nexora-subtext">
                      <span>Curriculum Modules</span>
                      <span className="font-semibold text-white">{meta.modules} Modules</span>
                    </div>
                    <div className="flex justify-between text-xs text-nexora-subtext">
                      <span>Foundational Topics</span>
                      <span className="font-semibold text-white">{sub.concept_count} Lessons</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-nexora-muted pt-1 border-t border-nexora-border/40">
                      <span>Course Track</span>
                      <span className="text-nexora-accent font-medium">Standard Syllabus</span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-3 border-t border-nexora-border/50 flex justify-between items-center">
                  <span className="text-xs text-nexora-muted">
                    Full structured syllabus
                  </span>
                  <Button variant="primary" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                    Open Subject
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
