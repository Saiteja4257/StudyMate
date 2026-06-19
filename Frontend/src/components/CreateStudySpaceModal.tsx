import React from 'react';
import { X, FileText, Sparkles } from 'lucide-react';

interface CreateStudySpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPDF: () => void;
  onSelectAI: () => void;
}

const CreateStudySpaceModal: React.FC<CreateStudySpaceModalProps> = ({
  isOpen,
  onClose,
  onSelectPDF,
  onSelectAI,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <div className="bg-[#111] border border-white/[0.08] rounded-3xl w-full max-w-2xl relative z-10 overflow-hidden shadow-2xl animate-fade-in">
        <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Create Study Space</h2>
            <p className="text-sm text-gray-400 mt-1">Choose how you want to generate your study material</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/[0.05] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => {
              onClose();
              onSelectPDF();
            }}
            className="group relative flex flex-col items-center text-center p-8 bg-white/[0.02] border border-white/[0.06] hover:border-blue-500/50 rounded-2xl transition-all duration-300 hover:bg-white/[0.04]"
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Upload PDF</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Have your own lecture slides or notes? Upload a PDF and we'll extract the text to create quizzes and flashcards.
            </p>
          </button>

          <button
            onClick={() => {
              onClose();
              onSelectAI();
            }}
            className="group relative flex flex-col items-center text-center p-8 bg-white/[0.02] border border-white/[0.06] hover:border-indigo-500/50 rounded-2xl transition-all duration-300 hover:bg-white/[0.04]"
          >
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">AI Course Generator</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Don't have notes? Enter any topic and our AI will instantly generate a comprehensive curriculum and study material.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateStudySpaceModal;
