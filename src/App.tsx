import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/Auth/LoginForm';
import { SignupForm } from './components/Auth/SignupForm';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { Sidebar } from './components/Layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { BomCheck } from './pages/BomCheck';
import { DocCheck } from './pages/DocCheck';
import { ReferenceLibrary } from './pages/ReferenceLibrary';
import { StandardsManagement } from './pages/StandardsManagement';
import { BomItemsValidation } from './pages/BomItemsValidation';
import { BomCorrectionPreview } from './pages/BomCorrectionPreview';
import { ReportGeneration } from './pages/ReportGeneration';

function AppContent() {
  const { user } = useAuth();
  const [showLogin, setShowLogin] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (!user) {
    return showLogin ? (
      <LoginForm onToggleForm={() => setShowLogin(false)} />
    ) : (
      <SignupForm onToggleForm={() => setShowLogin(true)} />
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'bom-check':
        return <BomCheck />;
      case 'doc-check':
        return <DocCheck />;
      case 'standards-management':
        return <StandardsManagement />;
      case 'reports':
        return <ReportGeneration />;
      case 'reference-library':
        return (
          <ProtectedRoute requireAdmin>
            <ReferenceLibrary />
          </ProtectedRoute>
        );
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-900">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        <main className="flex-1 lg:ml-0 p-6 lg:p-8 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
