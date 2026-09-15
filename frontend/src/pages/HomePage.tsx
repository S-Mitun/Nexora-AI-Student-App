import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, ArrowRight, Zap, Cpu, Binary, Dna, Compass, BookOpen } from 'lucide-react';
import { apiService } from '../services/api';
import { Subject } from '../types/learning';

const EXAMPLE_QUERIES = [
  { label: 'Doppler Effect', domain: 'Physics' },
  { label: 'Binary Search', domain: 'Algorithms' },
  { label: 'Convolutional Neural Network', domain: 'Deep Learning' },
  { label: 'Explain deadlock', domain: 'Operating Systems' },
  { label: 'Why is normalization important?', domain: 'Databases' },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  useEffect(() => {
    let isMounted = true;
    apiService
      .getSubjects()
      .then((data) => {
        if (isMounted) {
          setSubjects(data);
          setLoadingSubjects(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadingSubjects(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/learn?q=${encodeURIComponent(query.trim())}`);
  };

  const selectExample = (example: string) => {
    setQuery(example);
    navigate(`/learn?q=${encodeURIComponent(example)}`);
  };

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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-nexora-primary/10 border border-nexora-primary/20 text-nexora-primary text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          SHOW ME, DON'T JUST TELL ME
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          You're already learning. <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
            NEXORA helps you understand.
          </span>
        </h1>

        <p className="text-base sm:text-xl text-nexora-subtext leading-relaxed">
          Keep your school, college lectures, textbooks, and online courses. When you hit a wall with a difficult concept, NEXORA turns it into an interactive experience.
        </p>
      </div>

      {/* Primary Action: What are you trying to understand? */}
      <div className="max-w-2xl mx-auto mb-10">
        <div className="glass-panel p-2 sm:p-3 rounded-2xl shadow-glow border border-nexora-border/80">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="pl-3 text-nexora-muted">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What are you trying to understand? (e.g. Doppler Effect, Binary Search, CNN)"
              className="flex-1 bg-transparent border-0 text-white placeholder-nexora-muted focus:ring-0 focus:outline-none text-sm sm:text-base py-2.5 px-2"
            />
            <button
              type="submit"
              className="bg-nexora-primary hover:bg-nexora-primaryHover text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-1.5 shadow-md shrink-0"
            >
              <span>Explore</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Example Prompt Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs">
          <span className="text-nexora-muted font-medium">Try exploring:</span>
          {EXAMPLE_QUERIES.map((item, idx) => (
            <button
              key={idx}
              onClick={() => selectExample(item.label)}
              className="px-2.5 py-1 rounded-lg bg-nexora-elevated border border-nexora-border/60 text-nexora-subtext hover:text-white hover:border-nexora-primary/50 transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Core Learning Journey Banner */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 mb-16 border border-nexora-border/60">
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">
            The NEXORA Learning Pathway
          </h2>
          <p className="text-xs text-nexora-muted mt-1">
            Structured for deep comprehension and verified retention
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
          <div className="p-3 rounded-xl bg-nexora-elevated/60 border border-nexora-border/40">
            <span className="text-indigo-400 font-bold block mb-1">1. DISCOVER</span>
            <span className="text-nexora-muted">Surface the core problem</span>
          </div>
          <div className="p-3 rounded-xl bg-nexora-elevated/60 border border-nexora-border/40">
            <span className="text-indigo-400 font-bold block mb-1">2. WHY?</span>
            <span className="text-nexora-muted">Real-world relevance</span>
          </div>
          <div className="p-3 rounded-xl bg-nexora-elevated/60 border border-nexora-border/40">
            <span className="text-cyan-400 font-bold block mb-1">3. VISUALIZE</span>
            <span className="text-nexora-muted">Observable mechanics</span>
          </div>
          <div className="p-3 rounded-xl bg-nexora-elevated/60 border border-nexora-border/40">
            <span className="text-cyan-400 font-bold block mb-1">4. EXPERIMENT</span>
            <span className="text-nexora-muted">Tune variables live</span>
          </div>
          <div className="p-3 rounded-xl bg-nexora-elevated/60 border border-nexora-border/40 col-span-2 sm:col-span-1">
            <span className="text-emerald-400 font-bold block mb-1">5. MASTER</span>
            <span className="text-nexora-muted">Apply & reflect</span>
          </div>
        </div>
      </div>

      {/* Domain Subjects Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Curriculum Domains</h2>
            <p className="text-sm text-nexora-muted mt-1">
              Explore concepts across fundamental STEM disciplines
            </p>
          </div>
          <span className="text-xs text-nexora-muted hidden sm:inline">
            Connected to API v1
          </span>
        </div>

        {loadingSubjects ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-36 rounded-2xl bg-nexora-surface/50 animate-pulse border border-nexora-border/40" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {subjects.map((sub) => (
              <div
                key={sub.id}
                onClick={() => navigate(`/learn?subject=${sub.slug}`)}
                className="glass-panel p-5 rounded-2xl border border-nexora-border/60 hover:border-nexora-primary/50 cursor-pointer transition-all hover:-translate-y-1 group"
              >
                <div className="w-10 h-10 rounded-xl bg-nexora-elevated flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  {getSubjectIcon(sub.icon)}
                </div>
                <h3 className="text-base font-semibold text-white group-hover:text-nexora-accent transition-colors">
                  {sub.name}
                </h3>
                <p className="text-xs text-nexora-subtext mt-1.5 line-clamp-2">
                  {sub.description}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-nexora-muted">
                  <span>{sub.concept_count} foundational concepts</span>
                  <Compass className="w-3.5 h-3.5 group-hover:text-nexora-primary transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
