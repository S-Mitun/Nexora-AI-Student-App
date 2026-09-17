import React from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Clock,
  BookOpen,
  ArrowRight,
  HelpCircle,
  Sparkles,
  FileText,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const ChatPage: React.FC = () => {
  const plannedCapabilities = [
    {
      title: 'Socratic Concept Inquiries',
      description: 'Guided questioning to uncover root misconceptions and build strong mental models.',
      icon: HelpCircle,
    },
    {
      title: 'Syllabus & Material Guidance',
      description: 'Ask questions directly referencing your uploaded textbooks and course notes.',
      icon: FileText,
    },
    {
      title: 'Intuitive Analogies',
      description: 'Plain-language real-world comparisons when mathematical equations feel abstract.',
      icon: BookOpen,
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-nexora-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-nexora-accent uppercase tracking-wider">
              Learning Assistant
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Study Assistant
          </h1>
          <p className="text-sm text-nexora-subtext mt-1">
            Ask targeted questions regarding your course topics, problem sets, and study materials.
          </p>
        </div>
      </div>

      {/* Preparation Card */}
      <Card className="border-nexora-border/80 p-8 text-center max-w-2xl mx-auto space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-nexora-elevated border border-nexora-border flex items-center justify-center text-nexora-primary mx-auto">
          <MessageSquare className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-nexora-elevated text-xs font-semibold text-nexora-accent">
            <Clock className="w-3.5 h-3.5" />
            <span>Coming in Upcoming Releases</span>
          </div>
          <h2 className="text-xl font-bold text-white">
            The Study Assistant is Being Prepared
          </h2>
          <p className="text-xs sm:text-sm text-nexora-subtext max-w-lg mx-auto leading-relaxed">
            Personalized, step-by-step assistance grounded in your registered curriculum will be activated in upcoming platform updates.
          </p>
        </div>

        <div className="pt-4 border-t border-nexora-border/50">
          <Link to="/learn">
            <Button variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Explore Active Lessons
            </Button>
          </Link>
        </div>
      </Card>

      {/* Planned Features Outline */}
      <div className="space-y-4 max-w-2xl mx-auto">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Planned Learning Assistance Capabilities
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {plannedCapabilities.map((cap, idx) => {
            const Icon = cap.icon;
            return (
              <div
                key={idx}
                className="p-4 rounded-xl bg-nexora-surface border border-nexora-border/70 space-y-2"
              >
                <div className="w-8 h-8 rounded-lg bg-nexora-elevated flex items-center justify-center text-nexora-accent">
                  <Icon className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white">{cap.title}</h4>
                <p className="text-[11px] text-nexora-subtext leading-relaxed">
                  {cap.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
