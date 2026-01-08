import { LayoutDashboard, FileCheck, FileText, Library, LogOut, Menu, X, BookOpen, FileBarChart } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { profile, signOut, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, admin: false },
    { id: 'bom-check', label: 'BoM Check', icon: FileCheck, admin: false },
    { id: 'doc-check', label: 'Document Check', icon: FileText, admin: false },
    { id: 'standards-management', label: 'Standards Library', icon: BookOpen, admin: false },
    { id: 'reports', label: 'Reports', icon: FileBarChart, admin: false },
    { id: 'reference-library', label: 'Admin Library', icon: Library, admin: true },
  ];

  const filteredNavItems = navItems.filter(item => !item.admin || isAdmin);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">BoM Quality Check</h1>
        <p className="text-sm text-slate-400 mt-1">Senvion Engineering</p>
      </div>

      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="bg-slate-700 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-white">{profile?.full_name || 'User'}</p>
          <p className="text-xs text-slate-400 mt-1">{profile?.email}</p>
          <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
            isAdmin ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
          }`}>
            {isAdmin ? 'Admin' : 'User'}
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-slate-800 p-2 rounded-lg text-white border border-slate-700"
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <aside className="hidden lg:flex lg:flex-col w-64 bg-slate-800 border-r border-slate-700 min-h-screen">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-slate-800 border-r border-slate-700 z-50 flex flex-col">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
