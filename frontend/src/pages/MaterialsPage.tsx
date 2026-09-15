import React from 'react';
import { ComingSoon } from '../components/ComingSoon';

export const MaterialsPage: React.FC = () => {
  return (
    <ComingSoon
      title="My Materials & Harmonization"
      stageBadge="Master Prompt 06 Ingestion"
      description="Upload your school syllabus, college lecture slides, textbook PDFs, or handwritten notes. NEXORA's Document Harmonization Service parses, normalizes, and extracts core concepts into unified learning objects."
      upcomingFeatures={[
        'PDF, DOCX, and PPTX chapter detection',
        'Automatic topic and concept extraction',
        'OCR for scanned sheets and textbook diagrams',
        'Direct semantic indexing into ChromaDB / Vector Store',
      ]}
    />
  );
};
