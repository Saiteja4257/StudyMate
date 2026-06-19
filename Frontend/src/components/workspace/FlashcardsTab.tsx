import React, { useState } from 'react';
import { aiAPI } from '../../services/api';
import { Layers, RefreshCw, ChevronLeft, ChevronRight, RotateCcw, Calendar, ArrowLeft } from 'lucide-react';

interface Flashcard {
  front: string;
  back: string;
}

interface FlashcardsTabProps {
  document: any;
  onDocumentUpdate: () => void;
}

const FlashcardsTab: React.FC<FlashcardsTabProps> = ({ document, onDocumentUpdate }) => {
  const decks = document.flashcardDecks && document.flashcardDecks.length > 0
    ? document.flashcardDecks
    : (document.flashcards && document.flashcards.length > 0 ? [{ cards: document.flashcards, createdAt: document.createdAt || new Date() }] : []);

  const [loading, setLoading] = useState(false);
  const [selectedDeckIndex, setSelectedDeckIndex] = useState<number | null>(null);
  const [error, setError] = useState('');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Reset card index when changing decks
  React.useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [selectedDeckIndex]);

  const handleGenerate = async (regenerate = false) => {
    setLoading(true);
    setError('');
    try {
      await aiAPI.generateFlashcards(document._id, regenerate);
      onDocumentUpdate();
      setSelectedDeckIndex(decks.length);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate flashcards');
    } finally {
      setLoading(false);
    }
  };

  const flashcards = selectedDeckIndex !== null && decks[selectedDeckIndex] ? decks[selectedDeckIndex].cards : [];

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev + 1) % flashcards.length), 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length), 150);
  };

  // Loading
  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="glass p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1">
            <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-28 bg-amber-500/15 rounded-xl border border-amber-500/30 flex items-center justify-center mb-6 animate-pulse">
              <Layers className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Creating flashcards...</h3>
            <p className="text-gray-400 text-sm">Extracting key concepts for active recall</p>
          </div>
        </div>
      </div>
    );
  }

  // Flashcards Hub View
  if (selectedDeckIndex === null) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-amber-500" />
            <h2 className="text-2xl font-bold text-white">Flashcards Hub</h2>
          </div>
          <button
            onClick={() => handleGenerate(true)}
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-dark font-medium py-2 px-5 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] flex items-center gap-2"
          >
            <Layers className="w-4 h-4" />
            Generate New Deck
          </button>
        </div>

        {error && <p className="text-red-400 text-sm mb-6">{error}</p>}

        {decks.length === 0 ? (
          <div className="glass p-12 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6 animate-float">
              <Layers className="w-10 h-10 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">No flashcards generated yet</h3>
            <p className="text-gray-400 max-w-md mb-8 leading-relaxed">
              Create interactive flip cards for active recall study sessions powered by AI.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {decks.map((deck: any, idx: number) => (
              <div key={idx} className="glass p-6 hover:border-amber-500/30 transition-all group flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-amber-500/10 text-amber-500 text-sm font-bold px-3 py-1 rounded-full">
                    Deck {idx + 1}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(deck.createdAt).toLocaleDateString()}
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-gray-500" />
                  {deck.cards?.length || 0} Cards
                </h3>

                <button
                  onClick={() => setSelectedDeckIndex(idx)}
                  className="mt-auto w-full py-2.5 bg-white/[0.04] group-hover:bg-amber-500 group-hover:text-dark text-white font-medium rounded-xl transition-all"
                >
                  Study Deck
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Flashcards display
  const card = flashcards[currentIndex];
  if (!card) return null;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedDeckIndex(null)}
            className="p-2 rounded-full hover:bg-white/[0.1] transition-colors text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-white">Study Cards</h3>
            <span className="text-amber-500 font-bold tracking-wider uppercase text-sm bg-white/[0.05] px-3 py-1 rounded-full">
              Deck {selectedDeckIndex + 1}
            </span>
            <span className="bg-amber-500/10 text-amber-500 text-sm font-mono font-medium px-2.5 py-0.5 rounded-lg">
              {currentIndex + 1} / {flashcards.length}
            </span>
          </div>
        </div>
      </div>

      {/* Flashcard */}
      <div className="flex flex-col items-center py-8">
        <div className="w-full max-w-2xl aspect-[3/2] perspective-1000 mb-10">
          <div
            className={`relative w-full h-full transition-transform duration-700 preserve-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            {/* Front */}
            <div className="absolute w-full h-full backface-hidden bg-gradient-to-br from-[rgba(255,255,255,0.04)] to-[rgba(255,255,255,0.01)] rounded-3xl border border-white/[0.08] flex flex-col items-center justify-center p-10 text-center shadow-2xl">
              <div className="absolute top-5 left-6 text-amber-500/40 text-xs font-bold tracking-[0.2em] uppercase">Question</div>
              <h3 className="text-2xl md:text-3xl font-bold text-white leading-tight max-w-lg">
                {card.front}
              </h3>
              <div className="absolute bottom-5 flex items-center text-gray-500 text-xs gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> Click to reveal
              </div>
            </div>

            {/* Back */}
            <div className="absolute w-full h-full backface-hidden bg-gradient-to-br from-amber-500/[0.08] to-orange-600/[0.04] rounded-3xl border border-amber-500/20 flex flex-col items-center justify-center p-10 text-center rotate-y-180 shadow-2xl">
              <div className="absolute top-5 left-6 text-amber-500/60 text-xs font-bold tracking-[0.2em] uppercase">Answer</div>
              <p className="text-xl md:text-2xl text-white leading-relaxed max-w-lg">
                {card.back}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-6">
          <button
            onClick={handlePrev}
            className="p-3 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white transition-all hover:scale-110 active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Dot indicators */}
          <div className="flex gap-1.5 max-w-[200px] overflow-x-auto no-scrollbar">
            {flashcards.map((_:Flashcard, idx:number) => (
              <button
                key={idx}
                onClick={() => {
                  setIsFlipped(false);
                  setCurrentIndex(idx);
                }}
                className={`rounded-full transition-all duration-300 flex-shrink-0 ${
                  idx === currentIndex ? 'w-6 h-2 bg-amber-500' : 'w-2 h-2 bg-white/[0.1] hover:bg-white/[0.2]'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="p-3 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white transition-all hover:scale-110 active:scale-95"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlashcardsTab;
