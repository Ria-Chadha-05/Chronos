/**
 * DependencyGraphCard.jsx
 *
 * Renders the dependency graph as a visual node-link diagram.
 * Pure React + SVG — no external graph libraries.
 *
 * Layout: simple left-to-right topological layout using column levels
 * derived from the edge structure. Nodes are coloured by urgency.
 *
 * @prop {object}  graph      - Output of buildDependencyGraph().
 * @prop {string}  [className=''] - Extra Tailwind classes.
 */

import React, { useMemo, useState } from 'react';

const NODE_COLORS = {
  critical: { fill: 'rgba(255,51,102,0.18)',  stroke: '#FF3366', text: '#FF3366' },
  high:     { fill: 'rgba(255,140,0,0.16)',   stroke: '#FF8C00', text: '#FF8C00' },
  medium:   { fill: 'rgba(0,212,255,0.12)',   stroke: '#00D4FF', text: '#00D4FF' },
  low:      { fill: 'rgba(61,90,122,0.18)',   stroke: '#3D5A7A', text: '#7A9ABB' },
  done:     { fill: 'rgba(0,255,136,0.1)',    stroke: '#00FF88', text: '#00FF88' },
  default:  { fill: 'rgba(17,29,53,0.9)',     stroke: '#3D5A7A', text: '#7A9ABB' },
};

const EDGE_COLORS = {
  blockedBy:  '#FF3366',
  waitingFor: '#FF8C00',
  blocking:   '#9B59FF',
};

const NODE_W = 130;
const NODE_H = 44;
const COL_GAP = 170;
const ROW_GAP = 64;
const MARGIN  = 20;

/**
 * Assign column levels via Kahn's BFS topological sort.
 * @param {Array<object>} nodes
 * @param {Array<object>} edges
 * @returns {Map<string, number>} nodeId → column index
 */
function assignColumns(nodes, edges) {
  const inDegree = new Map(nodes.map((n) => [n.id, 0]));
  const adj      = new Map(nodes.map((n) => [n.id, []]));

  edges.forEach(({ from, to }) => {
    if (inDegree.has(to)) inDegree.set(to, inDegree.get(to) + 1);
    if (adj.has(from))    adj.get(from).push(to);
  });

  const levels = new Map();
  const queue  = [];

  inDegree.forEach((deg, id) => {
    if (deg === 0) { queue.push(id); levels.set(id, 0); }
  });

  while (queue.length > 0) {
    const current = queue.shift();
    const level   = levels.get(current) || 0;
    (adj.get(current) || []).forEach((next) => {
      const newLevel = Math.max(levels.get(next) ?? 0, level + 1);
      levels.set(next, newLevel);
      inDegree.set(next, inDegree.get(next) - 1);
      if (inDegree.get(next) === 0) queue.push(next);
    });
  }

  // Nodes not reached (cycles or isolated)
  nodes.forEach((n) => { if (!levels.has(n.id)) levels.set(n.id, 0); });
  return levels;
}

/**
 * DependencyGraphCard component.
 * @param {object} props
 */
export default function DependencyGraphCard({ graph = {}, className = '' }) {
  const [hoveredId, setHoveredId] = useState(null);
  const { nodes = [], edges = [], blockedChains = [], criticalPaths = [] } = graph;

  const criticalSet = new Set(criticalPaths.flat());

  const { positions, svgWidth, svgHeight } = useMemo(() => {
    if (nodes.length === 0) return { positions: new Map(), svgWidth: 300, svgHeight: 100 };

    const levels = assignColumns(nodes, edges);

    // Group nodes by column
    const byColumn = new Map();
    nodes.forEach((n) => {
      const col = levels.get(n.id) || 0;
      if (!byColumn.has(col)) byColumn.set(col, []);
      byColumn.get(col).push(n.id);
    });

    const positions = new Map();
    byColumn.forEach((ids, col) => {
      ids.forEach((id, rowIdx) => {
        positions.set(id, {
          x: MARGIN + col * COL_GAP,
          y: MARGIN + rowIdx * ROW_GAP,
        });
      });
    });

    const maxCol = Math.max(...[...levels.values()]);
    const maxRow = Math.max(...[...byColumn.values()].map((ids) => ids.length));
    const svgWidth  = MARGIN * 2 + (maxCol + 1) * COL_GAP + NODE_W;
    const svgHeight = MARGIN * 2 + maxRow * ROW_GAP + NODE_H;

    return { positions, svgWidth, svgHeight };
  }, [nodes, edges]);

  if (nodes.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
        <span className="text-3xl mb-3">🔗</span>
        <p className="text-sm text-[#3D5A7A]">No dependency graph to display.</p>
      </div>
    );
  }

  // Edge path: curved bezier
  function edgePath(fromId, toId) {
    const from = positions.get(fromId);
    const to   = positions.get(toId);
    if (!from || !to) return null;

    const x1 = from.x + NODE_W;
    const y1 = from.y + NODE_H / 2;
    const x2 = to.x;
    const y2 = to.y + NODE_H / 2;
    const cx  = (x1 + x2) / 2;

    return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[11px]">
        {[
          { color: '#FF3366', label: 'Blocked by' },
          { color: '#FF8C00', label: 'Waiting for' },
          { color: '#9B59FF', label: 'Blocking' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-5 h-0.5 rounded" style={{ backgroundColor: color }} />
            <span className="text-[#3D5A7A]">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[#3D5A7A]">{nodes.length} nodes · {edges.length} edges</span>
        </div>
      </div>

      {/* SVG graph */}
      <div className="overflow-x-auto rounded-xl border border-[rgba(0,212,255,0.1)] bg-[#080F1E] p-2">
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ minWidth: svgWidth, display: 'block' }}
        >
          {/* Defs: arrowheads */}
          <defs>
            {Object.entries(EDGE_COLORS).map(([type, color]) => (
              <marker
                key={type}
                id={`arrow-${type}`}
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L0,6 L8,3 z" fill={color} opacity="0.8" />
              </marker>
            ))}
          </defs>

          {/* Edges */}
          {edges.map((edge, i) => {
            const d     = edgePath(edge.from, edge.to);
            const color = EDGE_COLORS[edge.type] || '#3D5A7A';
            if (!d) return null;
            const isHighlighted = hoveredId === edge.from || hoveredId === edge.to;
            return (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={isHighlighted ? 2 : 1}
                strokeOpacity={isHighlighted ? 0.9 : 0.4}
                markerEnd={`url(#arrow-${edge.type})`}
                style={{ transition: 'all 0.2s' }}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const pos     = positions.get(node.id);
            if (!pos) return null;
            const isHovered = hoveredId === node.id;
            const isCritical = criticalSet.has(node.id);
            const urgency = node.urgency || (node.status === 'done' ? 'done' : 'default');
            const colors  = NODE_COLORS[urgency] || NODE_COLORS.default;
            const label   = node.title.length > 16 ? node.title.slice(0, 14) + '…' : node.title;

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Critical path glow */}
                {isCritical && (
                  <rect
                    x="-3" y="-3"
                    width={NODE_W + 6} height={NODE_H + 6}
                    rx="11"
                    fill="none"
                    stroke="#FF3366"
                    strokeWidth="1"
                    strokeOpacity="0.4"
                    strokeDasharray="4 3"
                  />
                )}
                <rect
                  x="0" y="0"
                  width={NODE_W} height={NODE_H}
                  rx="8"
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={isHovered ? 1.5 : 1}
                  strokeOpacity={isHovered ? 1 : 0.6}
                  style={{ transition: 'all 0.2s' }}
                />
                <text
                  x={NODE_W / 2}
                  y={NODE_H / 2 - 5}
                  textAnchor="middle"
                  fill={colors.text}
                  fontSize="11"
                  fontFamily="Inter, sans-serif"
                  fontWeight="500"
                >
                  {label}
                </text>
                <text
                  x={NODE_W / 2}
                  y={NODE_H / 2 + 9}
                  textAnchor="middle"
                  fill={colors.stroke}
                  fontSize="9"
                  fontFamily="JetBrains Mono, monospace"
                  opacity="0.7"
                >
                  {node.status || 'unknown'}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Chain summary */}
      {blockedChains.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] text-[#3D5A7A] uppercase tracking-wider">Blocked chains</p>
          {blockedChains.slice(0, 3).map((chain, i) => (
            <div
              key={i}
              className="flex items-center gap-1 text-xs text-[#7A9ABB] flex-wrap"
            >
              {chain.map((id, j) => {
                const node = nodes.find((n) => n.id === id);
                return (
                  <React.Fragment key={id}>
                    <span
                      className="px-2 py-0.5 rounded-md border border-[rgba(0,212,255,0.12)] bg-[rgba(0,212,255,0.05)]"
                    >
                      {node?.title?.slice(0, 18) || id}
                    </span>
                    {j < chain.length - 1 && <span className="text-[#3D5A7A]">→</span>}
                  </React.Fragment>
                );
              })}
            </div>
          ))}
          {blockedChains.length > 3 && (
            <p className="text-[11px] text-[#3D5A7A]">+{blockedChains.length - 3} more chains</p>
          )}
        </div>
      )}
    </div>
  );
}
