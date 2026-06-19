import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { aiAPI } from '../../services/api';
import { Network, RefreshCw, Calendar, ArrowLeft, Loader2, ZoomIn, ZoomOut, Maximize2, Minimize2, MousePointer, Circle, ArrowRightFromLine, ArrowDownFromLine, X } from 'lucide-react';

interface MindMapTabProps {
  document: any;
  onDocumentUpdate: () => void;
}

interface MindMapNode {
  id: string;
  label: string;
  type: 'central' | 'branch' | 'leaf';
}

interface MindMapEdge {
  from: string;
  to: string;
}

interface MindMapData {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

interface LayoutNode extends MindMapNode {
  x: number;
  y: number;
  collapsed?: boolean;
}

type LayoutType = 'radial' | 'horizontal' | 'vertical';

// --- Layout Engines ---
function computeRadialLayout(data: MindMapData): LayoutNode[] {
  const { nodes, edges } = data;
  const centralNode = nodes.find(n => n.type === 'central');
  if (!centralNode) return nodes.map((n, i) => ({ ...n, x: i * 100, y: 0 }));

  // Build adjacency (parent → children)
  const children: Record<string, string[]> = {};
  edges.forEach(e => {
    if (!children[e.from]) children[e.from] = [];
    children[e.from].push(e.to);
  });

  const positioned: Record<string, { x: number; y: number }> = {};
  const layoutNodes: LayoutNode[] = [];

  // BFS from central
  const queue: { id: string; depth: number; angleStart: number; angleEnd: number }[] = [];
  const visited = new Set<string>();

  // Center
  positioned[centralNode.id] = { x: 0, y: 0 };
  visited.add(centralNode.id);

  const branchChildren = children[centralNode.id] || [];
  const anglePerChild = (2 * Math.PI) / Math.max(branchChildren.length, 1);
  branchChildren.forEach((childId, i) => {
    queue.push({
      id: childId,
      depth: 1,
      angleStart: i * anglePerChild - anglePerChild / 2,
      angleEnd: i * anglePerChild + anglePerChild / 2,
    });
  });

  while (queue.length > 0) {
    const { id, depth, angleStart, angleEnd } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const angle = (angleStart + angleEnd) / 2;
    const radius = depth * 220;
    positioned[id] = {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };

    const kids = children[id] || [];
    const kidAngleSpan = (angleEnd - angleStart) / Math.max(kids.length, 1);
    kids.forEach((kidId, i) => {
      queue.push({
        id: kidId,
        depth: depth + 1,
        angleStart: angleStart + i * kidAngleSpan,
        angleEnd: angleStart + (i + 1) * kidAngleSpan,
      });
    });
  }

  // Handle any disconnected nodes
  let offsetX = 0;
  nodes.forEach(n => {
    if (!positioned[n.id]) {
      positioned[n.id] = { x: 500 + offsetX, y: 400 };
      offsetX += 150;
    }
  });

  nodes.forEach(n => {
    layoutNodes.push({ ...n, ...positioned[n.id] });
  });

  return layoutNodes;
}

// --- Horizontal Tree Layout (left → right) ---
function computeHorizontalLayout(data: MindMapData): LayoutNode[] {
  const { nodes, edges } = data;
  const centralNode = nodes.find(n => n.type === 'central');
  if (!centralNode) return nodes.map((n, i) => ({ ...n, x: 0, y: i * 80 }));

  const children: Record<string, string[]> = {};
  edges.forEach(e => {
    if (!children[e.from]) children[e.from] = [];
    children[e.from].push(e.to);
  });

  const positioned: Record<string, { x: number; y: number }> = {};
  const visited = new Set<string>();
  let yCounter = 0;

  const H_SPACING = 280;
  const V_SPACING = 70;

  // DFS to assign leaf positions first, then center parents over children
  function layoutSubtree(nodeId: string, depth: number): { minY: number; maxY: number } {
    if (visited.has(nodeId)) return { minY: yCounter, maxY: yCounter };
    visited.add(nodeId);

    const kids = children[nodeId] || [];
    if (kids.length === 0) {
      // Leaf
      positioned[nodeId] = { x: depth * H_SPACING, y: yCounter * V_SPACING };
      const y = yCounter;
      yCounter++;
      return { minY: y, maxY: y };
    }

    let minY = Infinity;
    let maxY = -Infinity;
    kids.forEach(kid => {
      const range = layoutSubtree(kid, depth + 1);
      minY = Math.min(minY, range.minY);
      maxY = Math.max(maxY, range.maxY);
    });

    // Center parent over its children
    const centerY = ((minY + maxY) / 2) * V_SPACING;
    positioned[nodeId] = { x: depth * H_SPACING, y: centerY };
    return { minY, maxY };
  }

  layoutSubtree(centralNode.id, 0);

  // Handle disconnected nodes
  let offsetY = (yCounter + 1) * V_SPACING;
  nodes.forEach(n => {
    if (!positioned[n.id]) {
      positioned[n.id] = { x: 0, y: offsetY };
      offsetY += V_SPACING;
    }
  });

  return nodes.map(n => ({ ...n, ...positioned[n.id] }));
}

// --- Vertical Tree Layout (top → bottom) ---
function computeVerticalLayout(data: MindMapData): LayoutNode[] {
  const { nodes, edges } = data;
  const centralNode = nodes.find(n => n.type === 'central');
  if (!centralNode) return nodes.map((n, i) => ({ ...n, x: i * 160, y: 0 }));

  const children: Record<string, string[]> = {};
  edges.forEach(e => {
    if (!children[e.from]) children[e.from] = [];
    children[e.from].push(e.to);
  });

  const positioned: Record<string, { x: number; y: number }> = {};
  const visited = new Set<string>();
  let xCounter = 0;

  const H_SPACING = 180;
  const V_SPACING = 120;

  function layoutSubtree(nodeId: string, depth: number): { minX: number; maxX: number } {
    if (visited.has(nodeId)) return { minX: xCounter, maxX: xCounter };
    visited.add(nodeId);

    const kids = children[nodeId] || [];
    if (kids.length === 0) {
      positioned[nodeId] = { x: xCounter * H_SPACING, y: depth * V_SPACING };
      const x = xCounter;
      xCounter++;
      return { minX: x, maxX: x };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    kids.forEach(kid => {
      const range = layoutSubtree(kid, depth + 1);
      minX = Math.min(minX, range.minX);
      maxX = Math.max(maxX, range.maxX);
    });

    const centerX = ((minX + maxX) / 2) * H_SPACING;
    positioned[nodeId] = { x: centerX, y: depth * V_SPACING };
    return { minX, maxX };
  }

  layoutSubtree(centralNode.id, 0);

  // Handle disconnected nodes
  let offsetX = (xCounter + 1) * H_SPACING;
  nodes.forEach(n => {
    if (!positioned[n.id]) {
      positioned[n.id] = { x: offsetX, y: 0 };
      offsetX += H_SPACING;
    }
  });

  return nodes.map(n => ({ ...n, ...positioned[n.id] }));
}

// --- Layout Selector ---
function computeLayout(data: MindMapData, layoutType: LayoutType): LayoutNode[] {
  switch (layoutType) {
    case 'horizontal': return computeHorizontalLayout(data);
    case 'vertical': return computeVerticalLayout(data);
    case 'radial':
    default: return computeRadialLayout(data);
  }
}

// --- Node Colors ---
const nodeStyles: Record<string, { bg: string; border: string; text: string; glow: string; shadow: string }> = {
  central: {
    bg: 'rgba(99, 102, 241, 0.15)',
    border: 'rgba(99, 102, 241, 0.6)',
    text: '#c7d2fe',
    glow: 'rgba(99, 102, 241, 0.4)',
    shadow: '0 0 30px rgba(99, 102, 241, 0.3)',
  },
  branch: {
    bg: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(139, 92, 246, 0.45)',
    text: '#ddd6fe',
    glow: 'rgba(139, 92, 246, 0.3)',
    shadow: '0 0 20px rgba(139, 92, 246, 0.2)',
  },
  leaf: {
    bg: 'rgba(255, 255, 255, 0.04)',
    border: 'rgba(255, 255, 255, 0.12)',
    text: '#d1d5db',
    glow: 'rgba(255, 255, 255, 0.1)',
    shadow: '0 0 10px rgba(255, 255, 255, 0.05)',
  },
};

// --- Layout Switcher UI ---
const layoutOptions: { key: LayoutType; label: string; icon: React.ElementType }[] = [
  { key: 'radial', label: 'Radial', icon: Circle },
  { key: 'horizontal', label: 'Horizontal', icon: ArrowRightFromLine },
  { key: 'vertical', label: 'Vertical', icon: ArrowDownFromLine },
];

// --- SVG Mind Map Canvas ---
const MindMapCanvas: React.FC<{ data: MindMapData; layoutType: LayoutType; onLayoutChange: (lt: LayoutType) => void; onToggleFullscreen?: () => void; isFullscreen?: boolean }> = ({ data, layoutType, onLayoutChange, onToggleFullscreen, isFullscreen }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [viewBox, setViewBox] = useState({ x: -600, y: -450, w: 1200, h: 900 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [animProgress, setAnimProgress] = useState(0);

  const layoutNodes = useMemo(() => computeLayout(data, layoutType), [data, layoutType]);

  // Build children map for collapse logic
  const childrenMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    data.edges.forEach(e => {
      if (!map[e.from]) map[e.from] = [];
      map[e.from].push(e.to);
    });
    return map;
  }, [data]);

  // Get all descendants of a node
  const getDescendants = useCallback((nodeId: string): Set<string> => {
    const desc = new Set<string>();
    const queue = [nodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const kids = childrenMap[current] || [];
      kids.forEach(kid => {
        if (!desc.has(kid)) {
          desc.add(kid);
          queue.push(kid);
        }
      });
    }
    return desc;
  }, [childrenMap]);

  // Compute hidden nodes (children of collapsed nodes)
  const hiddenNodes = useMemo(() => {
    const hidden = new Set<string>();
    collapsedNodes.forEach(collapsedId => {
      const desc = getDescendants(collapsedId);
      desc.forEach(d => hidden.add(d));
    });
    return hidden;
  }, [collapsedNodes, getDescendants]);

  // Entrance animation — re-trigger on layout change
  useEffect(() => {
    setAnimProgress(0);
    let frame: number;
    const start = performance.now();
    const duration = 800;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimProgress(eased);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [data, layoutType]);

  // Auto-fit viewBox to content
  useEffect(() => {
    if (layoutNodes.length === 0) return;
    const padding = 200;
    const xs = layoutNodes.map(n => n.x);
    const ys = layoutNodes.map(n => n.y);
    const minX = Math.min(...xs) - padding;
    const maxX = Math.max(...xs) + padding;
    const minY = Math.min(...ys) - padding;
    const maxY = Math.max(...ys) + padding;
    setViewBox({
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY,
    });
  }, [layoutNodes]);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = viewBox.w / rect.width;
    const scaleY = viewBox.h / rect.height;
    setViewBox(prev => ({
      ...prev,
      x: prev.x - dx * scaleX,
      y: prev.y - dy * scaleY,
    }));
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsPanning(false);

  const zoomIn = () => {
    setViewBox(prev => ({
      x: prev.x + prev.w * 0.1,
      y: prev.y + prev.h * 0.1,
      w: prev.w * 0.8,
      h: prev.h * 0.8,
    }));
  };

  const zoomOut = () => {
    setViewBox(prev => ({
      x: prev.x - prev.w * 0.125,
      y: prev.y - prev.h * 0.125,
      w: prev.w * 1.25,
      h: prev.h * 1.25,
    }));
  };

  const resetView = () => {
    if (layoutNodes.length === 0) return;
    const padding = 200;
    const xs = layoutNodes.map(n => n.x);
    const ys = layoutNodes.map(n => n.y);
    setViewBox({
      x: Math.min(...xs) - padding,
      y: Math.min(...ys) - padding,
      w: Math.max(...xs) - Math.min(...xs) + padding * 2,
      h: Math.max(...ys) - Math.min(...ys) + padding * 2,
    });
  };

  const toggleCollapse = (nodeId: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Connected edges for hover highlight
  const connectedEdges = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const set = new Set<string>();
    data.edges.forEach(e => {
      if (e.from === hoveredNode || e.to === hoveredNode) {
        set.add(`${e.from}-${e.to}`);
      }
    });
    return set;
  }, [hoveredNode, data.edges]);

  const connectedNodes = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const set = new Set<string>();
    set.add(hoveredNode);
    data.edges.forEach(e => {
      if (e.from === hoveredNode) set.add(e.to);
      if (e.to === hoveredNode) set.add(e.from);
    });
    return set;
  }, [hoveredNode, data.edges]);

  const nodeMap = useMemo(() => {
    const map: Record<string, LayoutNode> = {};
    layoutNodes.forEach(n => { map[n.id] = n; });
    return map;
  }, [layoutNodes]);

  // Node dimensions
  const getNodeSize = (type: string) => {
    if (type === 'central') return { w: 180, h: 56 };
    if (type === 'branch') return { w: 150, h: 44 };
    return { w: 130, h: 38 };
  };

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[500px]">
      {/* Zoom Controls + Layout Switcher */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        {/* Layout Switcher */}
        <div className="flex flex-col gap-0.5 bg-black/40 backdrop-blur-sm rounded-xl border border-white/[0.08] p-1">
          {layoutOptions.map(opt => {
            const isActive = layoutType === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => onLayoutChange(opt.key)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] border border-transparent'
                }`}
                title={`${opt.label} layout`}
              >
                <opt.icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>

        {/* Zoom Buttons */}
        <button
          onClick={zoomIn}
          className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.1] transition-all"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={zoomOut}
          className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.1] transition-all"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.1] transition-all"
          title="Fit to view"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-all"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Hint */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 text-[10px] text-gray-600 uppercase tracking-wider font-medium bg-black/30 rounded-lg px-3 py-1.5 border border-white/[0.04]">
        <MousePointer className="w-3 h-3" />
        Drag to pan • Click branches to collapse
      </div>

      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        className={`w-full h-full ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ touchAction: 'none' }}
      >
        <defs>
          {/* Edge gradient */}
          <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(99, 102, 241, 0.4)" />
            <stop offset="100%" stopColor="rgba(139, 92, 246, 0.25)" />
          </linearGradient>
          <linearGradient id="edgeGradHover" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(99, 102, 241, 0.8)" />
            <stop offset="100%" stopColor="rgba(139, 92, 246, 0.6)" />
          </linearGradient>
          {/* Central node glow filter */}
          <filter id="centralGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feFlood floodColor="rgba(99, 102, 241, 0.5)" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="nodeGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="rgba(139, 92, 246, 0.3)" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Edges */}
        {data.edges.map((edge) => {
          const from = nodeMap[edge.from];
          const to = nodeMap[edge.to];
          if (!from || !to) return null;
          if (hiddenNodes.has(edge.from) || hiddenNodes.has(edge.to)) return null;

          const edgeKey = `${edge.from}-${edge.to}`;
          const isHighlighted = connectedEdges.has(edgeKey);
          const isDimmed = hoveredNode && !isHighlighted;

          // Curved Bézier edge
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const cx1 = from.x + dx * 0.4;
          const cy1 = from.y;
          const cx2 = from.x + dx * 0.6;
          const cy2 = to.y;
          const path = `M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`;

          return (
            <path
              key={edgeKey}
              d={path}
              fill="none"
              stroke={isHighlighted ? 'url(#edgeGradHover)' : 'url(#edgeGrad)'}
              strokeWidth={isHighlighted ? 3 : 2}
              opacity={(isDimmed ? 0.15 : 1) * animProgress}
              strokeDasharray={isDimmed ? '4 4' : 'none'}
              style={{ transition: 'opacity 0.3s, stroke-width 0.3s' }}
            />
          );
        })}

        {/* Nodes */}
        {layoutNodes.map((node) => {
          if (hiddenNodes.has(node.id)) return null;

          const style = nodeStyles[node.type] || nodeStyles.leaf;
          const { w, h } = getNodeSize(node.type);
          const isHovered = hoveredNode === node.id;
          const isConnected = connectedNodes.has(node.id);
          const isDimmed = hoveredNode && !isConnected;
          const isCollapsed = collapsedNodes.has(node.id);
          const hasChildren = (childrenMap[node.id] || []).length > 0;
          const scaleFactor = isHovered ? 1.08 : 1;
          const filter = node.type === 'central' ? 'url(#centralGlow)' : (isHovered ? 'url(#nodeGlow)' : 'none');

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y}) scale(${scaleFactor * animProgress})`}
              opacity={isDimmed ? 0.35 : animProgress}
              style={{
                transition: 'opacity 0.3s, transform 0.3s',
                cursor: hasChildren && node.type !== 'central' ? 'pointer' : 'default',
              }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren && node.type !== 'central') toggleCollapse(node.id);
              }}
              filter={filter}
            >
              {/* Node background */}
              <rect
                x={-w / 2}
                y={-h / 2}
                width={w}
                height={h}
                rx={node.type === 'central' ? 16 : 12}
                fill={style.bg}
                stroke={isHovered ? style.glow : style.border}
                strokeWidth={node.type === 'central' ? 2 : 1.5}
              />

              {/* Label */}
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fill={style.text}
                fontSize={node.type === 'central' ? 15 : node.type === 'branch' ? 13 : 11}
                fontWeight={node.type === 'central' ? 700 : node.type === 'branch' ? 600 : 400}
                fontFamily="Inter, system-ui, sans-serif"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {node.label}
              </text>

              {/* Collapse indicator */}
              {hasChildren && node.type !== 'central' && (
                <g transform={`translate(${w / 2 - 8}, ${-h / 2 - 8})`}>
                  <circle r={8} fill="rgba(99, 102, 241, 0.2)" stroke="rgba(99, 102, 241, 0.4)" strokeWidth={1} />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#a5b4fc"
                    fontSize={10}
                    fontWeight={700}
                    fontFamily="Inter, system-ui, sans-serif"
                    style={{ pointerEvents: 'none' }}
                  >
                    {isCollapsed ? '+' : '−'}
                  </text>
                </g>
              )}

              {/* Central node pulse ring */}
              {node.type === 'central' && (
                <rect
                  x={-w / 2 - 4}
                  y={-h / 2 - 4}
                  width={w + 8}
                  height={h + 8}
                  rx={20}
                  fill="none"
                  stroke="rgba(99, 102, 241, 0.2)"
                  strokeWidth={1}
                  className="mindmap-pulse"
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// --- Main Tab Component ---
const MindMapTab: React.FC<MindMapTabProps> = ({ document, onDocumentUpdate }) => {
  const mindMaps = document.mindMaps && document.mindMaps.length > 0
    ? document.mindMaps
    : (document.mindMap ? [{ data: document.mindMap, createdAt: document.createdAt || new Date() }] : []);

  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [layoutType, setLayoutType] = useState<LayoutType>('radial');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Close fullscreen on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const handleGenerate = async (regenerate = false) => {
    setLoading(true);
    setError('');
    try {
      await aiAPI.generateMindMap(document._id, regenerate);
      onDocumentUpdate();
      setSelectedIndex(mindMaps.length);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate mind map');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="glass p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1">
            <div className="h-full bg-gradient-to-r from-primary to-secondary animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <Network className="w-12 h-12 text-primary animate-pulse mb-6" />
            <h3 className="text-xl font-semibold text-white mb-2">Generating mind map...</h3>
            <p className="text-gray-400 text-sm">Analyzing concepts and relationships</p>
          </div>
        </div>
      </div>
    );
  }

  // Mind Map Hub View
  if (selectedIndex === null) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Network className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-white">Mind Map Hub</h2>
          </div>
          <button
            onClick={() => handleGenerate(true)}
            className="bg-gradient-to-r from-primary to-blue-600 text-white font-medium py-2 px-5 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] flex items-center gap-2"
          >
            <Network className="w-4 h-4" />
            Generate New Mind Map
          </button>
        </div>

        {error && <p className="text-red-400 text-sm mb-6">{error}</p>}

        {mindMaps.length === 0 ? (
          <div className="glass p-12 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 animate-float">
              <Network className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">No mind maps generated yet</h3>
            <p className="text-gray-400 max-w-md mb-8 leading-relaxed">
              Visualize your document's key concepts and their relationships as an interactive mind map.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mindMaps.map((m: any, idx: number) => {
              const nodeCount = m.data?.nodes?.length || 0;
              const edgeCount = m.data?.edges?.length || 0;
              const centralLabel = m.data?.nodes?.find((n: any) => n.type === 'central')?.label || 'Mind Map';
              return (
                <div key={idx} className="glass p-6 hover:border-primary/30 transition-all group flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <span className="bg-primary/10 text-primary text-sm font-bold px-3 py-1 rounded-full">
                      Version {idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(m.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-white font-medium text-sm mb-2">{centralLabel}</p>
                    <div className="flex gap-3 text-xs text-gray-500">
                      <span>{nodeCount} concepts</span>
                      <span>•</span>
                      <span>{edgeCount} connections</span>
                    </div>
                  </div>

                  {/* Mini preview of nodes */}
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {m.data?.nodes?.slice(0, 6).map((n: any, i: number) => (
                      <span
                        key={i}
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          n.type === 'central'
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : n.type === 'branch'
                            ? 'bg-secondary/10 text-secondary border-secondary/20'
                            : 'bg-white/[0.03] text-gray-500 border-white/[0.06]'
                        }`}
                      >
                        {n.label}
                      </span>
                    ))}
                    {nodeCount > 6 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.03] text-gray-600 border border-white/[0.06]">
                        +{nodeCount - 6} more
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedIndex(idx)}
                    className="mt-auto w-full py-2.5 bg-white/[0.04] group-hover:bg-primary text-white font-medium rounded-xl transition-all"
                  >
                    View Mind Map
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Active Mind Map View
  const mindMapData: MindMapData = mindMaps[selectedIndex]?.data;

  if (!mindMapData || !mindMapData.nodes) {
    return (
      // <div className="animate-fade-in">
      //   <p className="text-red-400">Invalid mind map data</p>
      //   <button onClick={() => setSelectedIndex(null)} className="text-primary mt-4 text-sm hover:underline">
      //     ← Back to hub
      //   </button>
      // </div>
      null
    );
  }

  return (
    <div className="animate-fade-in h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedIndex(null)}
            className="p-2 rounded-full hover:bg-white/[0.1] transition-colors text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-white">Mind Map</h3>
            <span className="text-primary font-bold tracking-wider uppercase text-sm bg-white/[0.05] px-3 py-1 rounded-full ml-2">
              Version {selectedIndex + 1}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Layout toggle pills */}
          <div className="flex items-center bg-white/[0.03] rounded-xl border border-white/[0.06] p-0.5">
            {layoutOptions.map(opt => {
              const isActive = layoutType === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setLayoutType(opt.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-primary/15 text-primary border border-primary/20'
                      : 'text-gray-500 hover:text-gray-300 border border-transparent'
                  }`}
                >
                  <opt.icon className="w-3 h-3" />
                  {opt.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{mindMapData.nodes.length} concepts</span>
            <span>•</span>
            <span>{mindMapData.edges.length} connections</span>
          </div>
        </div>
      </div>

      <div className="glass flex-1 overflow-hidden relative" style={{ minHeight: '500px' }}>
        <MindMapCanvas data={mindMapData} layoutType={layoutType} onLayoutChange={setLayoutType} onToggleFullscreen={() => setIsFullscreen(true)} />
      </div>

      {/* Fullscreen Modal (Dedicated Page View) */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[9999] bg-[#0B0F19] flex flex-col animate-fade-in">
          {/* Fullscreen Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] flex-shrink-0 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsFullscreen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="font-medium text-sm">Back to Workspace</span>
              </button>

              <button
                onClick={() => {
                  window.location.href = '/'; // Navigate to dashboard/home to create a new space
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-primary hover:bg-primary/10 transition-all font-medium text-sm border border-transparent hover:border-primary/20"
              >
                <span className="text-lg leading-none mb-0.5">+</span>
                New space
              </button>

              <div className="w-px h-6 bg-white/[0.1] mx-3"></div>

              <Network className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-white">{document.title || 'Mind Map'}</h3>
              <span className="text-primary font-bold tracking-wider uppercase text-xs bg-white/[0.05] px-3 py-1 rounded-full">
                Version {selectedIndex + 1}
              </span>
            </div>
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>{mindMapData.nodes.length} concepts</span>
                <span>•</span>
                <span>{mindMapData.edges.length} connections</span>
              </div>
              
              {/* Layout toggle pills in fullscreen */}
              <div className="flex items-center bg-white/[0.03] rounded-xl border border-white/[0.06] p-0.5">
                {layoutOptions.map(opt => {
                  const isActive = layoutType === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setLayoutType(opt.key)}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-primary/15 text-primary border border-primary/20'
                          : 'text-gray-500 hover:text-gray-300 border border-transparent'
                      }`}
                    >
                      <opt.icon className="w-3.5 h-3.5" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Fullscreen Canvas */}
          <div className="flex-1 overflow-hidden relative">
            <MindMapCanvas data={mindMapData} layoutType={layoutType} onLayoutChange={setLayoutType} onToggleFullscreen={() => setIsFullscreen(false)} isFullscreen={true} />
          </div>
        </div>
      )}
    </div>
  );
};

export default MindMapTab;
