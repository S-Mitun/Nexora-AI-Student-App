import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AcademicContextProvider } from './context/AcademicContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppShell } from './layouts/AppShell';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { HomePage } from './pages/HomePage';
import { LearnPage } from './pages/LearnPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { SubjectDetailPage } from './pages/SubjectDetailPage';
import { ConceptPage } from './pages/ConceptPage';
import { ModulePage } from './pages/ModulePage';
import { LessonPage } from './pages/LessonPage';
import { MaterialsPage } from './pages/MaterialsPage';
import { PracticePage } from './pages/PracticePage';
import { LabsPage } from './pages/LabsPage';
import { NotesPage } from './pages/NotesPage';
import { ProgressPage } from './pages/ProgressPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { ChatPage } from './pages/ChatPage';
import { MindMapPage } from './pages/MindMapPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AcademicContextProvider>
          <Routes>
            {/* Public Authentication Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected Application Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/learn" element={<LearnPage />} />
                <Route path="/subjects" element={<SubjectsPage />} />
                <Route path="/subjects/:subjectSlug" element={<SubjectDetailPage />} />
                <Route path="/concepts/:conceptSlug" element={<ConceptPage />} />
                <Route path="/modules/:moduleId" element={<ModulePage />} />
                <Route path="/modules/:moduleId/lessons/:lessonSlug" element={<LessonPage />} />
                <Route path="/lessons/:lessonSlug" element={<LessonPage />} />
                <Route path="/materials" element={<MaterialsPage />} />
                <Route path="/practice" element={<PracticePage />} />
                <Route path="/labs" element={<LabsPage />} />
                <Route path="/notes" element={<NotesPage />} />
                <Route path="/progress" element={<ProgressPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/mindmap" element={<MindMapPage />} />
              </Route>
            </Route>

            {/* Fallback Catch-all Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AcademicContextProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
