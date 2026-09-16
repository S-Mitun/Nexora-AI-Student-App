import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';
import { HomePage } from './pages/HomePage';
import { LearnPage } from './pages/LearnPage';
import { MaterialsPage } from './pages/MaterialsPage';
import { ChatPage } from './pages/ChatPage';
import { LabsPage } from './pages/LabsPage';
import { MindMapPage } from './pages/MindMapPage';
import { NotesPage } from './pages/NotesPage';
import { ProgressPage } from './pages/ProgressPage';
import { ProfilePage } from './pages/ProfilePage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/materials" element={<MaterialsPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/labs" element={<LabsPage />} />
          <Route path="/mindmap" element={<MindMapPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
