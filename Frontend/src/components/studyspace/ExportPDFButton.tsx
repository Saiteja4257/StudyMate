import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { Download, Loader2 } from 'lucide-react';

interface ExportPDFButtonProps {
  space: any;
}

const ExportPDFButton: React.FC<ExportPDFButtonProps> = ({ space }) => {
  const [exporting, setExporting] = useState(false);

  const generatePDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const margin = 20;
      let yPosition = margin;
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxLineWidth = pageWidth - margin * 2;

      // Title Page
      doc.setFontSize(28);
      doc.setTextColor(40, 40, 40);
      doc.text(space.title, pageWidth / 2, 80, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.text(`Topic: ${space.topic}`, pageWidth / 2, 100, { align: 'center' });
      
      doc.setFontSize(12);
      const splitDesc = doc.splitTextToSize(space.description, maxLineWidth - 20);
      doc.text(splitDesc, pageWidth / 2, 120, { align: 'center' });

      // Curriculum overview
      doc.addPage();
      yPosition = margin;
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('Course Roadmap', margin, yPosition);
      yPosition += 15;

      space.modules.forEach((mod: any, index: number) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = margin;
        }
        doc.setFontSize(14);
        doc.setTextColor(60, 60, 150);
        doc.text(`Module \${index + 1}: \${mod.title}`, margin, yPosition);
        yPosition += 8;
        
        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80);
        const splitSummary = doc.splitTextToSize(mod.summary || 'Summary not available yet.', maxLineWidth);
        doc.text(splitSummary, margin, yPosition);
        yPosition += (splitSummary.length * 5) + 10;
      });

      // Modules Content
      for (let i = 0; i < space.modules.length; i++) {
        const mod = space.modules[i];
        if (!mod.contentGenerated) continue;

        doc.addPage();
        yPosition = margin;
        
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text(`Module \${i + 1}: \${mod.title}`, margin, yPosition);
        yPosition += 15;

        // Key Concepts
        if (mod.keyConcepts && mod.keyConcepts.length > 0) {
          doc.setFontSize(16);
          doc.setTextColor(40, 40, 40);
          doc.text('Key Concepts', margin, yPosition);
          yPosition += 10;
          
          doc.setFontSize(11);
          doc.setTextColor(80, 80, 80);
          mod.keyConcepts.forEach((concept: string) => {
            if (yPosition > 280) { doc.addPage(); yPosition = margin; }
            doc.text(`• \${concept}`, margin + 5, yPosition);
            yPosition += 7;
          });
          yPosition += 5;
        }

        // Detailed Notes (Strip Markdown for simple PDF text)
        if (mod.detailedNotes) {
          if (yPosition > 250) { doc.addPage(); yPosition = margin; }
          doc.setFontSize(16);
          doc.setTextColor(40, 40, 40);
          doc.text('Study Notes', margin, yPosition);
          yPosition += 10;

          // Extremely basic markdown stripping for PDF
          const plainText = mod.detailedNotes
            .replace(/\\*\\*(.*?)\\*\\*/g, '$1') // Bold
            .replace(/\\*(.*?)\\*/g, '$1') // Italic
            .replace(/#(.*?)\\n/g, '$1\\n') // Headers
            .replace(/\\[(.*?)\\]\\(.*?\\)/g, '$1'); // Links

          doc.setFontSize(11);
          doc.setTextColor(60, 60, 60);
          const splitNotes = doc.splitTextToSize(plainText, maxLineWidth);
          
          for (let j = 0; j < splitNotes.length; j++) {
            if (yPosition > 280) {
              doc.addPage();
              yPosition = margin;
            }
            doc.text(splitNotes[j], margin, yPosition);
            yPosition += 6;
          }
        }
      }

      doc.save(`\${space.title.replace(/\\s+/g, '_')}_StudyGuide.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={generatePDF}
      disabled={exporting || !space}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/[0.05] hover:bg-white/[0.1] text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50"
    >
      {exporting ? (
        <><Loader2 className="w-4 h-4 animate-spin" /> Generating PDF...</>
      ) : (
        <><Download className="w-4 h-4" /> Export Study Guide</>
      )}
    </button>
  );
};

export default ExportPDFButton;
