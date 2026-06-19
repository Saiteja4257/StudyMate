import React, { useState, useRef, useCallback } from 'react';
import { aiAPI } from '../../services/api';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { Download, Image as ImageIcon, Send, Loader2, Play, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface VisualLearnTabProps {
  document: any;
}

const VisualLearnTab: React.FC<VisualLearnTabProps> = ({ document }) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [visualData, setVisualData] = useState<any>(null);
  const [isVisualMode, setIsVisualMode] = useState(true);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const flowRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question.trim() || loading) return;

    setLoading(true);
    try {
      if (isVisualMode) {
        const response = await aiAPI.visualExplain(document._id, question);
        const data = response.data.data;
        
        setVisualData(data);
        
        // Map data to React Flow format
        if (data.nodes) {
          const flowNodes = data.nodes.map((node: any) => ({
            id: node.id,
            position: node.position || { x: Math.random() * 200, y: Math.random() * 200 },
            data: { label: node.data?.label || node.id },
            type: node.type || 'default',
            style: {
              background: '#1e1e24',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '10px 15px',
              fontSize: '12px',
              fontWeight: 'bold',
            }
          }));
          setNodes(flowNodes);
        }

        if (data.edges) {
          const flowEdges = data.edges.map((edge: any) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: edge.label || '',
            type: edge.type || 'smoothstep',
            animated: true,
            style: { stroke: '#3b82f6', strokeWidth: 2 },
            labelStyle: { fill: '#fff', fontWeight: 500 },
            labelBgStyle: { fill: '#1e1e24' },
          }));
          setEdges(flowEdges);
        }
      } else {
        // Fallback to text only using chat endpoint
        const response = await aiAPI.chat(document._id, question, []);
        setVisualData({
          title: 'Text Explanation',
          explanation: response.data.answer,
          diagramType: 'None',
          nodes: [],
          edges: []
        });
        setNodes([]);
        setEdges([]);
      }
    } catch (error) {
      console.error('Visual explain failed:', error);
      setVisualData({
        title: 'Error',
        explanation: 'Failed to generate visual explanation. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadPNG = useCallback(() => {
    if (flowRef.current === null) return;
    
    // Select the react flow pane specifically
    const flowElement = flowRef.current.querySelector('.react-flow__viewport') as HTMLElement;
    if (!flowElement) return;

    toPng(flowElement, { 
      backgroundColor: '#0f0f0f',
      style: {
        transform: 'translate(0, 0) scale(1)',
      }
    })
      .then((dataUrl) => {
        const a = window.document.createElement('a');
        a.setAttribute('download', `${visualData?.title || 'diagram'}.png`);
        a.setAttribute('href', dataUrl);
        a.click();
      })
      .catch((err) => console.error('PNG export failed', err));
  }, [visualData]);

  const downloadPDF = useCallback(() => {
    if (!visualData) return;

    const doc = new jsPDF();
    
    // Add Title
    doc.setFontSize(18);
    doc.text(visualData.title || 'Visual Explanation', 20, 20);
    
    // Add explanation text
    doc.setFontSize(12);
    const splitText = doc.splitTextToSize(visualData.explanation || '', 170);
    doc.text(splitText, 20, 35);
    
    // Optionally add diagram image
    if (flowRef.current) {
      const flowElement = flowRef.current.querySelector('.react-flow__viewport') as HTMLElement;
      if (flowElement && isVisualMode && nodes.length > 0) {
        toPng(flowElement, { backgroundColor: '#ffffff' })
          .then((dataUrl) => {
            const yPos = 40 + (splitText.length * 6);
            // Add image scaled down
            doc.addImage(dataUrl, 'PNG', 20, yPos, 170, 100);
            doc.save(`${visualData.title || 'explanation'}.pdf`);
          })
          .catch(() => {
            doc.save(`${visualData.title || 'explanation'}.pdf`);
          });
        return;
      }
    }
    
    doc.save(`${visualData.title || 'explanation'}.pdf`);
  }, [visualData, isVisualMode, nodes]);

  return (
    <div className="flex flex-col h-full animate-fade-in relative z-10 gap-4">
      {/* Input Section */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center">
        <form onSubmit={handleGenerate} className="relative flex items-center shadow-lg w-full">
          <Play className="absolute left-4 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question to generate a visual diagram (e.g., 'Explain Merge Sort')"
            className="w-full bg-[#1e1e24] border border-white/[0.05] rounded-xl pl-12 pr-14 py-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 transition-colors"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!question.trim() || loading}
            className="absolute right-2 p-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-30 disabled:bg-transparent transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>

        <div className="flex items-center gap-3 bg-[#1e1e24] px-4 py-2.5 rounded-xl border border-white/[0.05] flex-shrink-0 w-full md:w-auto justify-between md:justify-center">
          <span className="text-sm font-medium text-gray-300">Text</span>
          <button onClick={() => setIsVisualMode(!isVisualMode)} className="text-blue-400 hover:text-blue-300 transition-colors">
            {isVisualMode ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6 text-gray-500" />}
          </button>
          <span className="text-sm font-medium text-gray-300">Visual</span>
        </div>
      </div>

      {/* Main Content Area */}
      {visualData ? (
        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
          {/* Explanation Panel */}
          <div className="w-full lg:w-1/3 bg-white/[0.02] border border-white/[0.06] rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between bg-black/20">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                Explanation
              </h3>
            </div>
            <div className="p-5 overflow-y-auto flex-1 custom-scrollbar text-sm text-gray-300 leading-relaxed">
              <h2 className="text-xl font-bold text-white mb-4">{visualData.title}</h2>
              <ReactMarkdown
                components={{
                  ul: ({node, ...props}) => <ul className="list-disc ml-5 my-2 space-y-1" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal ml-5 my-2 space-y-1" {...props} />,
                  li: ({node, ...props}) => <li className="pl-1" {...props} />,
                  p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                }}
              >
                {visualData.explanation}
              </ReactMarkdown>
            </div>
            <div className="p-4 border-t border-white/[0.06] bg-black/20">
              <button 
                onClick={downloadPDF}
                className="w-full flex items-center justify-center gap-2 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 rounded-xl transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" /> Download as PDF
              </button>
            </div>
          </div>

          {/* Diagram Panel */}
          {isVisualMode && (
            <div className="w-full lg:w-2/3 bg-[#0a0a0f] border border-white/[0.06] rounded-2xl relative overflow-hidden" ref={flowRef}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
                colorMode="dark"
                minZoom={0.1}
              >
                <Background color="#333" gap={16} />
                <Controls className="bg-white/[0.05] border-white/[0.1] fill-white" />
                <MiniMap 
                  nodeColor="#1e1e24" 
                  maskColor="rgba(0,0,0,0.5)" 
                  style={{ backgroundColor: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)' }} 
                />
                
                <Panel position="top-right" className="bg-transparent m-4">
                  <button
                    onClick={downloadPNG}
                    className="flex items-center gap-2 px-3 py-2 bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.1] rounded-xl text-white text-xs font-medium transition-colors backdrop-blur-md shadow-xl"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Export PNG
                  </button>
                </Panel>
                
                <Panel position="top-left" className="m-4">
                  <div className="px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-xs font-bold backdrop-blur-md">
                    {visualData.diagramType || 'Diagram'}
                  </div>
                </Panel>
              </ReactFlow>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white/[0.01] border border-white/[0.05] rounded-2xl">
          <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
            <Sparkles className="w-10 h-10 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Visual Learning Mode</h2>
          <p className="text-gray-400 max-w-md leading-relaxed">
            Ask a question about the document to generate a structured text explanation alongside an interactive educational diagram.
          </p>
        </div>
      )}
    </div>
  );
};

export default VisualLearnTab;
