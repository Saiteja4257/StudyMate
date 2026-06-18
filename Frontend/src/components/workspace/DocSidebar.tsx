import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { documentAPI } from '../../services/api';
import {
  Sparkles,
  Plus,
  Search,
  FileText,
  Trash2,
  LogOut,
  Loader2,
  X,
  Menu,
  ChevronLeft,
} from 'lucide-react';
import ConfirmModal from '../common/ConfirmModal';

interface DocItem {
  _id: string;
  title: string;
  createdAt: string;
  processingStatus: string;
  summary?: string;
  quiz?: any[];
  flashcards?: any[];
}

interface DocSidebarProps {
  documents: DocItem[];
  selectedDocId: string | null;
  onSelectDoc: (id: string) => void;
  onDocumentsChange: () => void;
}

const DocSidebar: React.FC<DocSidebarProps> = ({
  documents,
  selectedDocId,
  onSelectDoc,
  onDocumentsChange,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, id: string | null}>({ isOpen: false, id: null });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      const res = await documentAPI.upload(formData);
      onDocumentsChange();
      if (res.data.documentId) {
        onSelectDoc(res.data.documentId);
      }
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({ isOpen: true, id });
  };

  const executeDelete = async () => {
    const id = confirmModal.id;
    if (!id) return;
    setDeletingId(id);
    try {
      await documentAPI.delete(id);
      onDocumentsChange();
    } catch (error) {
      console.error('Delete failed', error);
    } finally {
      setDeletingId(null);
    }
  };

  const getGeneratedCount = (doc: DocItem) => {
    let count = 0;
    if (doc.summary) count++;
    if (doc.quiz && doc.quiz.length > 0) count++;
    if (doc.flashcards && doc.flashcards.length > 0) count++;
    return count;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand + Back */}
      <div className="p-4 pb-3 flex items-center justify-between">
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-white">StudyMate</span>
        </button>
        <button
          className="md:hidden text-gray-400 hover:text-white"
          onClick={() => setMobileOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Upload */}
      <div className="px-3 mb-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-gray-300 hover:bg-white/[0.07] hover:border-white/[0.1] transition-all duration-200 text-sm font-medium disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              New space
            </>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="px-3 mb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.05] rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary/30 transition-colors"
          />
        </div>
      </div>

      {/* Label */}
      <div className="px-4 py-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sources</p>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {filteredDocs.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-gray-600 text-sm">
              {searchQuery ? 'No matches' : 'No sources yet'}
            </p>
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const isActive = doc._id === selectedDocId;
            const genCount = getGeneratedCount(doc);
            return (
              <div
                key={doc._id}
                onClick={() => {
                  onSelectDoc(doc._id);
                  setMobileOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 group relative flex items-center gap-2.5 ${
                  isActive
                    ? 'bg-white/[0.08] text-white'
                    : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-300'
                }`}
              >
                <FileText className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary' : 'text-gray-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-clamp-1">{doc.title.replace('.pdf', '')}</p>
                </div>
                {genCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium flex-shrink-0">
                    {genCount}
                  </span>
                )}
                {/* Delete */}
                <button
                  onClick={(e) => handleDeleteClick(doc._id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-all flex-shrink-0"
                >
                  {deletingId === doc._id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-white/[0.05]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-300 truncate">{user?.name}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-[#1a1a1a] border border-white/[0.08] text-white"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-[300px] bg-[#111111] border-r border-white/[0.05] z-40 transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {sidebarContent}
      </aside>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Delete Document"
        message="Are you sure you want to delete this document? This will remove all generated summaries, quizzes, and flashcards."
        onConfirm={executeDelete}
        onCancel={() => setConfirmModal({ isOpen: false, id: null })}
      />
    </>
  );
};

export default DocSidebar;
