import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { aiAPI } from '../../services/api';
import { FileText, RefreshCw, Calendar, ArrowLeft, Trash2 } from 'lucide-react';
import ConfirmModal from '../common/ConfirmModal';

interface SummaryTabProps {
  document: any;
  onDocumentUpdate: () => void;
}

const SummaryTab: React.FC<SummaryTabProps> = ({ document, onDocumentUpdate }) => {
  const summaries = document.summaries && document.summaries.length > 0 
    ? document.summaries 
    : (document.summary ? [{ content: document.summary, createdAt: document.createdAt || new Date() }] : []);

  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, index: number | null}>({ isOpen: false, index: null });
  const [error, setError] = useState('');

  const handleGenerate = async (regenerate = false) => {
    setLoading(true);
    setError('');
    try {
      await aiAPI.generateSummary(document._id, regenerate);
      onDocumentUpdate();
      setSelectedIndex(summaries.length);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({ isOpen: true, index });
  };

  const executeDelete = async () => {
    const index = confirmModal.index;
    if (index === null) return;
    
    setDeletingIndex(index);
    setError('');
    try {
      await aiAPI.deleteSummary(document._id, index);
      onDocumentUpdate();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete summary');
    } finally {
      setDeletingIndex(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="glass p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1">
            <div className="h-full bg-gradient-to-r from-primary to-blue-500 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-primary animate-pulse mb-6" />
            <h3 className="text-xl font-semibold text-white mb-2">Generating summary...</h3>
            <p className="text-gray-400 text-sm">Reading through your document</p>
          </div>
        </div>
      </div>
    );
  }

  // Summary Hub View
  if (selectedIndex === null) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-white">Summary Hub</h2>
          </div>
          <button
            onClick={() => handleGenerate(true)}
            className="bg-gradient-to-r from-primary to-blue-600 text-white font-medium py-2 px-5 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Generate New Summary
          </button>
        </div>

        {error && <p className="text-red-400 text-sm mb-6">{error}</p>}

        {summaries.length === 0 ? (
          <div className="glass p-12 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 animate-float">
              <FileText className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">No summaries generated yet</h3>
            <p className="text-gray-400 max-w-md mb-8 leading-relaxed">
              Get a concise AI-generated summary of your document's key points.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {summaries.map((s: any, idx: number) => (
              <div key={idx} className="glass p-6 hover:border-primary/30 transition-all group flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-primary/10 text-primary text-sm font-bold px-3 py-1 rounded-full">
                    Version {idx + 1}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(s.createdAt).toLocaleDateString()}
                    </div>
                    <button 
                      onClick={(e) => handleDeleteClick(idx, e)}
                      disabled={deletingIndex === idx}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                      title="Delete Summary"
                    >
                      {deletingIndex === idx ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <div className="mb-6 flex-1">
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Comprehensive AI-generated breakdown of your document's key concepts, structured into clear sections and study notes.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-primary/70 bg-primary/10 px-2.5 py-1 rounded-md">Structured</span>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-purple-400/70 bg-purple-400/10 px-2.5 py-1 rounded-md">Key Concepts</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedIndex(idx)}
                  className="mt-auto w-full py-2.5 bg-white/[0.04] group-hover:bg-primary text-white font-medium rounded-xl transition-all"
                >
                  View Summary
                </button>
              </div>
            ))}
          </div>
        )}

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title="Delete Summary"
          message="Are you sure you want to delete this summary version? This action cannot be undone."
          onConfirm={executeDelete}
          onCancel={() => setConfirmModal({ isOpen: false, index: null })}
        />
      </div>
    );
  }

  // Active Summary View
  const activeSummary = summaries[selectedIndex];

  if (!activeSummary) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-gray-400">Loading new summary...</p>
      </div>
    );
  }

  const summary = activeSummary.content;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedIndex(null)}
            className="p-2 rounded-full hover:bg-white/[0.1] transition-colors text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-white">AI Summary</h3>
            <span className="text-primary font-bold tracking-wider uppercase text-sm bg-white/[0.05] px-3 py-1 rounded-full ml-2">
              Version {selectedIndex + 1}
            </span>
          </div>
        </div>
      </div>

      <div className="glass p-8">
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown>{summary}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default SummaryTab;
