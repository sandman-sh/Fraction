import React, { useState, useRef, useEffect } from "react";

export interface CustomShape {
  id: string;
  type: string;
  x: number;
  y: number;
  props: {
    w?: number;
    h?: number;
    color?: string;
    fill?: string;
    text?: string;
    font?: string;
    points?: { x: number; y: number }[];
    assetId?: string;
    strokeWidth?: number;
    strokeStyle?: "solid" | "dashed" | "dotted";
    opacity?: number;
    fontSize?: number;
    rx?: number;
  };
  meta: {
    filter?: string;
  };
}

export interface CustomAsset {
  id: string;
  type: "image";
  props: {
    name: string;
    src: string;
    w: number;
    h: number;
    mimeType: string;
  };
}

interface CustomCanvasProps {
  shapes: CustomShape[];
  setShapes: React.Dispatch<React.SetStateAction<CustomShape[]>>;
  assets: Record<string, CustomAsset>;
  selectedShapeIds: string[];
  setSelectedShapeIds: React.Dispatch<React.SetStateAction<string[]>>;
  activeTool: string;
  setActiveTool: (tool: string) => void;
  pan: { x: number; y: number };
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
}

export default function CustomCanvas({
  shapes,
  setShapes,
  assets,
  selectedShapeIds,
  setSelectedShapeIds,
  activeTool,
  setActiveTool,
  pan,
  setPan,
  zoom,
  setZoom,
}: CustomCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Interaction states
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [interactionMode, setInteractionMode] = useState<
    "none" | "pan" | "draw" | "drag" | "resize"
  >("none");

  // For resizing
  const [resizeHandle, setResizeHandle] = useState<"nw" | "ne" | "se" | "sw" | null>(null);

  // Drag offsets & drawing points
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const activeShapeIdRef = useRef<string | null>(null);

  // For inline text editing
  const [editingShapeId, setEditingShapeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  // Key tracking (e.g. Space key for panning, Delete key to erase)
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingShapeId) return; // ignore when editing text
      if (e.code === "Space") {
        setIsSpacePressed(true);
        e.preventDefault();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedShapeIds.length > 0) {
          setShapes((prev) => prev.filter((s) => !selectedShapeIds.includes(s.id)));
          setSelectedShapeIds([]);
        }
      }
      if (e.key === "Escape") {
        setSelectedShapeIds([]);
        setActiveTool("select");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [selectedShapeIds, editingShapeId]);

  // Translate screen clientX/clientY to canvas space
  const getCanvasCoords = (e: { clientX: number; clientY: number }) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    return {
      x: (screenX - pan.x) / zoom,
      y: (screenY - pan.y) / zoom,
    };
  };

  const getCanvasColorValue = (colorName: string): string => {
    const map: Record<string, string> = {
      black: "#18181b",
      blue: "#3b82f6",
      green: "#10b981",
      grey: "#71717a",
      "light-blue": "#60a5fa",
      "light-green": "#34d399",
      "light-red": "#f87171",
      "light-violet": "#a78bfa",
      orange: "#f97316",
      red: "#ef4444",
      turquoise: "#14b8a6",
      violet: "#8b5cf6",
      yellow: "#facc15",
    };
    return map[colorName] || colorName;
  };

  // Wheel Zoom & Pan
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (!svgRef.current) return;

    if (e.ctrlKey) {
      // Zoom
      const zoomFactor = 1.1;
      const nextZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
      const boundedZoom = Math.min(Math.max(nextZoom, 0.1), 8);

      // Zoom centered at the pointer
      const rect = svgRef.current.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;

      const canvasX = (pointerX - pan.x) / zoom;
      const canvasY = (pointerY - pan.y) / zoom;

      setZoom(boundedZoom);
      setPan({
        x: pointerX - canvasX * boundedZoom,
        y: pointerY - canvasY * boundedZoom,
      });
    } else {
      // Pan
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (editingShapeId) return;

    const coords = getCanvasCoords(e);
    setIsPointerDown(true);

    // 1. Pan Mode (hand tool or space key held, or middle click)
    if (activeTool === "hand" || isSpacePressed || e.button === 1) {
      setInteractionMode("pan");
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    // 2. Eraser tool immediately deletes clicked shape
    if (activeTool === "eraser") {
      const clickedShape = findShapeAt(coords);
      if (clickedShape) {
        setShapes((prev) => prev.filter((s) => s.id !== clickedShape.id));
        setSelectedShapeIds([]);
      }
      return;
    }

    // 3. Drawing tools (create shapes)
    if (
      ["rectangle", "ellipse", "line", "arrow", "draw", "text", "note"].includes(activeTool)
    ) {
      setInteractionMode("draw");
      const id = `shape:${Date.now()}`;
      activeShapeIdRef.current = id;
      dragStartRef.current = coords;

      let defaultProps: any = {
        color: "blue",
      };

      if (activeTool === "rectangle" || activeTool === "ellipse") {
        defaultProps.w = 1;
        defaultProps.h = 1;
        defaultProps.fill = "none";
      } else if (activeTool === "line" || activeTool === "arrow") {
        defaultProps.w = 1;
        defaultProps.h = 1;
      } else if (activeTool === "draw") {
        defaultProps.points = [{ x: 0, y: 0 }];
      } else if (activeTool === "text") {
        defaultProps.text = "Double click to edit";
        defaultProps.font = "sans";
      } else if (activeTool === "note") {
        defaultProps.text = "Sticky Note";
        defaultProps.w = 150;
        defaultProps.h = 150;
      }

      const newShape: CustomShape = {
        id,
        type: activeTool,
        x: coords.x,
        y: coords.y,
        props: defaultProps,
        meta: { filter: "none" },
      };

      setShapes((prev) => [...prev, newShape]);
      setSelectedShapeIds([id]);
      return;
    }

    // 4. Select Tool
    if (activeTool === "select") {
      // Check if clicking a resize handle of the selected shape
      const selected = shapes.find((s) => selectedShapeIds.includes(s.id));
      if (selected) {
        const handleClicked = checkResizeHandles(selected, coords);
        if (handleClicked) {
          setInteractionMode("resize");
          setResizeHandle(handleClicked);
          activeShapeIdRef.current = selected.id;
          dragStartRef.current = coords;
          return;
        }
      }

      // Check if clicking a shape
      const clicked = findShapeAt(coords);
      if (clicked) {
        setInteractionMode("drag");
        setSelectedShapeIds([clicked.id]);
        activeShapeIdRef.current = clicked.id;
        dragStartRef.current = { x: coords.x - clicked.x, y: coords.y - clicked.y };
      } else {
        // Clicked empty background
        setSelectedShapeIds([]);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isPointerDown) return;
    const coords = getCanvasCoords(e);

    if (interactionMode === "pan") {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    if (interactionMode === "drag" && activeShapeIdRef.current) {
      const dx = coords.x - dragStartRef.current.x;
      const dy = coords.y - dragStartRef.current.y;
      setShapes((prev) =>
        prev.map((s) => (s.id === activeShapeIdRef.current ? { ...s, x: dx, y: dy } : s))
      );
      return;
    }

    if (interactionMode === "resize" && activeShapeIdRef.current && resizeHandle) {
      const shape = shapes.find((s) => s.id === activeShapeIdRef.current);
      if (!shape) return;

      const w = shape.props.w ?? 100;
      const h = shape.props.h ?? 100;

      let newX = shape.x;
      let newY = shape.y;
      let newW = w;
      let newH = h;

      if (resizeHandle === "se") {
        newW = Math.max(10, coords.x - shape.x);
        newH = Math.max(10, coords.y - shape.y);
      } else if (resizeHandle === "sw") {
        newW = Math.max(10, shape.x + w - coords.x);
        newX = shape.x + w - newW;
        newH = Math.max(10, coords.y - shape.y);
      } else if (resizeHandle === "ne") {
        newW = Math.max(10, coords.x - shape.x);
        newH = Math.max(10, shape.y + h - coords.y);
        newY = shape.y + h - newH;
      } else if (resizeHandle === "nw") {
        newW = Math.max(10, shape.x + w - coords.x);
        newX = shape.x + w - newW;
        newH = Math.max(10, shape.y + h - coords.y);
        newY = shape.y + h - newH;
      }

      setShapes((prev) =>
        prev.map((s) =>
          s.id === activeShapeIdRef.current
            ? { ...s, x: newX, y: newY, props: { ...s.props, w: newW, h: newH } }
            : s
        )
      );
      return;
    }

    if (interactionMode === "draw" && activeShapeIdRef.current) {
      const start = dragStartRef.current;
      const type = activeTool;

      setShapes((prev) =>
        prev.map((s) => {
          if (s.id !== activeShapeIdRef.current) return s;

          if (type === "rectangle" || type === "ellipse") {
            const x = Math.min(start.x, coords.x);
            const y = Math.min(start.y, coords.y);
            const w = Math.max(5, Math.abs(coords.x - start.x));
            const h = Math.max(5, Math.abs(coords.y - start.y));
            return { ...s, x, y, props: { ...s.props, w, h } };
          } else if (type === "line" || type === "arrow") {
            const w = coords.x - start.x;
            const h = coords.y - start.y;
            return { ...s, props: { ...s.props, w, h } };
          } else if (type === "draw") {
            const points = s.props.points || [];
            const dx = coords.x - s.x;
            const dy = coords.y - s.y;
            return { ...s, props: { ...s.props, points: [...points, { x: dx, y: dy }] } };
          }
          return s;
        })
      );
    }
  };

  const handlePointerUp = () => {
    setIsPointerDown(false);
    setInteractionMode("none");
    setResizeHandle(null);
    activeShapeIdRef.current = null;

    if (
      ["rectangle", "ellipse", "line", "arrow", "draw", "text", "note"].includes(activeTool)
    ) {
      // Return to select tool after adding a shape
      setActiveTool("select");
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getCanvasCoords(e.nativeEvent);
    const clicked = findShapeAt(coords);
    if (clicked && (clicked.type === "text" || clicked.type === "note")) {
      setEditingShapeId(clicked.id);
      setEditingText(clicked.props.text || "");
    }
  };

  const handleTextSubmit = () => {
    if (!editingShapeId) return;
    setShapes((prev) =>
      prev.map((s) => (s.id === editingShapeId ? { ...s, props: { ...s.props, text: editingText } } : s))
    );
    setEditingShapeId(null);
  };

  // Find shape hit by click coordinates
  const findShapeAt = (coords: { x: number; y: number }): CustomShape | null => {
    for (let i = shapes.length - 1; i >= 0; i--) {
      const s = shapes[i];
      const w = s.props.w ?? 100;
      const h = s.props.h ?? 100;

      if (s.type === "rectangle" || s.type === "note" || s.type === "image") {
        if (coords.x >= s.x && coords.x <= s.x + w && coords.y >= s.y && coords.y <= s.y + h) {
          return s;
        }
      } else if (s.type === "ellipse") {
        const rx = w / 2;
        const ry = h / 2;
        const cx = s.x + rx;
        const cy = s.y + ry;
        const val = Math.pow(coords.x - cx, 2) / Math.pow(rx, 2) + Math.pow(coords.y - cy, 2) / Math.pow(ry, 2);
        if (val <= 1.05) return s;
      } else if (s.type === "text") {
        if (coords.x >= s.x && coords.x <= s.x + 180 && coords.y >= s.y && coords.y <= s.y + 30) {
          return s;
        }
      } else if (s.type === "line" || s.type === "arrow") {
        const x1 = s.x;
        const y1 = s.y;
        const x2 = s.x + w;
        const y2 = s.y + h;
        const dist = pointToLineDistance(coords.x, coords.y, x1, y1, x2, y2);
        if (dist <= 8) return s;
      } else if (s.type === "draw") {
        const points = s.props.points || [];
        for (let j = 0; j < points.length; j++) {
          const pt = points[j];
          const px = s.x + pt.x;
          const py = s.y + pt.y;
          const dist = Math.sqrt(Math.pow(coords.x - px, 2) + Math.pow(coords.y - py, 2));
          if (dist <= 10) return s;
        }
      }
    }
    return null;
  };

  const pointToLineDistance = (
    x: number,
    y: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) => {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const checkResizeHandles = (
    shape: CustomShape,
    coords: { x: number; y: number }
  ): "nw" | "ne" | "se" | "sw" | null => {
    if (shape.type === "line" || shape.type === "arrow" || shape.type === "draw") return null;

    const w = shape.props.w ?? 100;
    const h = shape.props.h ?? 100;
    const threshold = 10 / zoom;

    const handles = {
      nw: { x: shape.x, y: shape.y },
      ne: { x: shape.x + w, y: shape.y },
      se: { x: shape.x + w, y: shape.y + h },
      sw: { x: shape.x, y: shape.y + h },
    };

    for (const [key, pt] of Object.entries(handles)) {
      if (Math.abs(coords.x - pt.x) <= threshold && Math.abs(coords.y - pt.y) <= threshold) {
        return key as "nw" | "ne" | "se" | "sw";
      }
    }
    return null;
  };

  const noteColors: Record<string, { fill: string; stroke: string }> = {
    black: { fill: "#f4f4f5", stroke: "#18181b" },
    grey: { fill: "#f4f4f5", stroke: "#71717a" },
    blue: { fill: "#dbeafe", stroke: "#3b82f6" },
    "light-blue": { fill: "#e0f2fe", stroke: "#60a5fa" },
    green: { fill: "#d1fae5", stroke: "#10b981" },
    "light-green": { fill: "#f0fdf4", stroke: "#34d399" },
    yellow: { fill: "#fef08a", stroke: "#eab308" },
    orange: { fill: "#ffedd5", stroke: "#f97316" },
    red: { fill: "#fee2e2", stroke: "#ef4444" },
    "light-red": { fill: "#fee2e2", stroke: "#f87171" },
    violet: { fill: "#f3e8ff", stroke: "#8b5cf6" },
    "light-violet": { fill: "#f5f3ff", stroke: "#a78bfa" },
    turquoise: { fill: "#ccfbf1", stroke: "#14b8a6" },
  };

  const renderShape = (shape: CustomShape) => {
    const strokeColor = getCanvasColorValue(shape.props.color || "black");
    const fillColor =
      shape.props.fill === "solid"
        ? strokeColor
        : shape.props.fill === "semi"
        ? `${strokeColor}55`
        : "none";
    const strokeWidth = shape.props.strokeWidth ?? 2;
    const opacity = shape.props.opacity ?? 1;

    let strokeDasharray: string | undefined = undefined;
    if (shape.props.strokeStyle === "dashed") {
      strokeDasharray = `${strokeWidth * 3},${strokeWidth * 3}`;
    } else if (shape.props.strokeStyle === "dotted") {
      strokeDasharray = `${strokeWidth},${strokeWidth * 2}`;
    }

    const filterStyle = shape.meta?.filter 
      ? { filter: shape.meta.filter, opacity } 
      : { opacity };

    switch (shape.type) {
      case "rectangle":
        return (
          <rect
            key={shape.id}
            data-shape-id={shape.id}
            x={shape.x}
            y={shape.y}
            width={shape.props.w}
            height={shape.props.h}
            stroke={strokeColor}
            fill={fillColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            rx={shape.props.rx ?? 0}
            ry={shape.props.rx ?? 0}
            style={filterStyle}
          />
        );
      case "ellipse":
        return (
          <ellipse
            key={shape.id}
            data-shape-id={shape.id}
            cx={shape.x + (shape.props.w ?? 100) / 2}
            cy={shape.y + (shape.props.h ?? 100) / 2}
            rx={(shape.props.w ?? 100) / 2}
            ry={(shape.props.h ?? 100) / 2}
            stroke={strokeColor}
            fill={fillColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            style={filterStyle}
          />
        );
      case "text":
        return (
          <text
            key={shape.id}
            data-shape-id={shape.id}
            x={shape.x}
            y={shape.y + 20}
            fill={strokeColor}
            fontSize={shape.props.fontSize ?? 16}
            fontFamily={
              shape.props.font === "mono"
                ? "monospace"
                : shape.props.font === "serif"
                ? "serif"
                : "sans-serif"
            }
            style={filterStyle}
          >
            {shape.props.text}
          </text>
        );
      case "note": {
        const colorName = shape.props.color || "yellow";
        const noteCol = noteColors[colorName] || noteColors.yellow;
        return (
          <g key={shape.id} data-shape-id={shape.id} style={filterStyle}>
            <rect
              x={shape.x}
              y={shape.y}
              width={shape.props.w ?? 150}
              height={shape.props.h ?? 150}
              fill={noteCol.fill}
              stroke={noteCol.stroke}
              strokeWidth="1.5"
              rx="6"
            />
            <foreignObject
              x={shape.x + 8}
              y={shape.y + 8}
              width={(shape.props.w ?? 150) - 16}
              height={(shape.props.h ?? 150) - 16}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  color: "#000",
                  fontSize: shape.props.fontSize ?? 13,
                  fontFamily: "sans-serif",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  whiteSpace: "pre-wrap",
                }}
              >
                {shape.props.text}
              </div>
            </foreignObject>
          </g>
        );
      }
      case "image": {
        const asset = assets[shape.props.assetId || ""];
        return (
          <image
            key={shape.id}
            data-shape-id={shape.id}
            x={shape.x}
            y={shape.y}
            width={shape.props.w}
            height={shape.props.h}
            href={asset?.props.src}
            style={filterStyle}
          />
        );
      }
      case "line":
        return (
          <line
            key={shape.id}
            data-shape-id={shape.id}
            x1={shape.x}
            y1={shape.y}
            x2={shape.x + (shape.props.w ?? 100)}
            y2={shape.y + (shape.props.h ?? 100)}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            style={filterStyle}
          />
        );
      case "arrow": {
        const x1 = shape.x;
        const y1 = shape.y;
        const x2 = shape.x + (shape.props.w ?? 100);
        const y2 = shape.y + (shape.props.h ?? 100);
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const arrowLength = 12;

        const x3 = x2 - arrowLength * Math.cos(angle - Math.PI / 6);
        const y3 = y2 - arrowLength * Math.sin(angle - Math.PI / 6);
        const x4 = x2 - arrowLength * Math.cos(angle + Math.PI / 6);
        const y4 = y2 - arrowLength * Math.sin(angle + Math.PI / 6);

        return (
          <g key={shape.id} data-shape-id={shape.id} style={filterStyle}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
            />
            <polygon points={`${x2},${y2} ${x3},${y3} ${x4},${y4}`} fill={strokeColor} />
          </g>
        );
      }
      case "draw": {
        const points = shape.props.points || [];
        if (points.length < 2) return null;
        let d = `M ${shape.x + points[0].x} ${shape.y + points[0].y}`;
        for (let i = 1; i < points.length; i++) {
          d += ` L ${shape.x + points[i].x} ${shape.y + points[i].y}`;
        }
        return (
          <path
            key={shape.id}
            data-shape-id={shape.id}
            d={d}
            stroke={strokeColor}
            fill="none"
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={filterStyle}
          />
        );
      }
      default:
        return null;
    }
  };

  const getCursor = () => {
    if (isSpacePressed || interactionMode === "pan") return "grabbing";
    if (activeTool === "hand") return "grab";
    if (activeTool === "eraser") return "cell";
    if (["rectangle", "ellipse", "line", "arrow", "draw"].includes(activeTool)) return "crosshair";
    if (activeTool === "text" || activeTool === "note") return "text";
    return "default";
  };

  const renderSelectionOutline = () => {
    if (selectedShapeIds.length === 0) return null;
    const selected = shapes.find((s) => selectedShapeIds.includes(s.id));
    if (!selected) return null;
    if (selected.type === "line" || selected.type === "arrow" || selected.type === "draw") return null;

    const w = selected.props.w ?? 100;
    const h = selected.props.h ?? 100;
    const handleSize = 6 / zoom;

    return (
      <g>
        <rect
          x={selected.x}
          y={selected.y}
          width={w}
          height={h}
          fill="none"
          stroke="#a855f7"
          strokeWidth={1.5 / zoom}
          strokeDasharray={`${4 / zoom},${4 / zoom}`}
        />
        {[
          { key: "nw", x: selected.x, y: selected.y },
          { key: "ne", x: selected.x + w, y: selected.y },
          { key: "se", x: selected.x + w, y: selected.y + h },
          { key: "sw", x: selected.x, y: selected.y + h },
        ].map((pt) => (
          <rect
            key={pt.key}
            x={pt.x - handleSize / 2}
            y={pt.y - handleSize / 2}
            width={handleSize}
            height={handleSize}
            fill="#ffffff"
            stroke="#a855f7"
            strokeWidth={1.5 / zoom}
            style={{ cursor: `${pt.key}-resize` }}
          />
        ))}
      </g>
    );
  };

  const renderTextEditor = () => {
    if (!editingShapeId) return null;
    const shape = shapes.find((s) => s.id === editingShapeId);
    if (!shape) return null;

    const w = shape.props.w ?? 150;
    const h = shape.props.h ?? 150;

    const left = shape.x * zoom + pan.x;
    const top = shape.y * zoom + pan.y;
    const width = w * zoom;
    const height = h * zoom;

    const isText = shape.type === "text";

    return (
      <div
        style={{
          position: "absolute",
          left,
          top,
          width: isText ? "auto" : width,
          height: isText ? "auto" : height,
          zIndex: 1000,
          background: isText ? "transparent" : "#fef08a",
          border: isText ? "none" : "1px solid #eab308",
          padding: 8,
          borderRadius: 4,
          display: "flex",
          boxSizing: "border-box",
        }}
      >
        <textarea
          autoFocus
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          onBlur={handleTextSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleTextSubmit();
            }
            if (e.key === "Escape") {
              setEditingShapeId(null);
            }
          }}
          style={{
            width: isText ? 180 : "100%",
            height: isText ? 30 : "100%",
            background: "transparent",
            color: isText ? "#ffffff" : "#000000",
            border: "none",
            outline: "none",
            resize: "none",
            fontSize: isText ? 16 * zoom : 13 * zoom,
            fontFamily: "sans-serif",
            padding: 0,
            margin: 0,
          }}
        />
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        outline: "none",
        cursor: getCursor(),
      }}
    >
      <svg
        ref={svgRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          background: "#ffffff",
          userSelect: "none",
        }}
      >
        <defs>
          <pattern
            id="grid-pattern"
            width={40 * zoom}
            height={40 * zoom}
            patternUnits="userSpaceOnUse"
            x={pan.x}
            y={pan.y}
          >
            <path
              d={`M ${40 * zoom} 0 L 0 0 0 ${40 * zoom}`}
              fill="none"
              stroke="rgba(0,0,0,0.04)"
              strokeWidth="1"
            />
            <path
              d={`M ${200 * zoom} 0 L 0 0 0 ${200 * zoom}`}
              fill="none"
              stroke="rgba(0,0,0,0.08)"
              strokeWidth="1.5"
            />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#grid-pattern)" />

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {shapes.map(renderShape)}
          {renderSelectionOutline()}
        </g>
      </svg>

      {renderTextEditor()}
    </div>
  );
}
