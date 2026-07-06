import React, { useState, useEffect, useMemo } from "react";
import CustomCanvas, { CustomShape, CustomAsset } from "./CustomCanvas";
type Editor = any;
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Download,
  Wallet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MousePointer,
  Hand,
  Square,
  Circle as CircleIcon,
  ArrowUpRight,
  Type,
  Palette,
  Loader2,
  Coins,
  Lock,
  Zap,
  Grid3x3,
  Eye,
  LogOut,
  Slash,
  PenTool,
  StickyNote,
  Frame,
  Eraser,
  X,
  MessageSquare,
  Image as ImageIcon,
} from "lucide-react";

/* ─── Constants ─── */
const PLATFORM_WALLET = "0x933a2405f84c224be1ef373ba16e992e1f459682";
const ARC_TESTNET_HEX = "0x4cef52";
const RPC_ENDPOINT = import.meta.env.VITE_ARC_TESTNET_RPC || "https://rpc.testnet.arc-node.thecanteenapp.com/v1/swrm_3e98784aef12ddb795b7025cbf883a53ca15fa76869353ca4fa132f3de3e9082";

/* ─── Helpers ─── */
function b64encode(obj: any) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
}
function b64decode(s: string) {
  return decodeURIComponent(escape(atob(s)));
}
function randomNonceHex() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return (
    "0x" +
    Array.from(b)
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
  );
}

export function getCanvasColorValue(colorName: string): string {
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
}

/* ── Basic Markdown Renderer Helper ── */
function renderMarkdown(text: string): string {
  if (!text) return "";
  
  const lines = text.split("\n");
  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];
  const htmlLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Table parser
    if (line.startsWith("|")) {
      const parts = line.split("|").map(p => p.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (!inTable) {
        inTable = true;
        tableHeaders = parts;
      } else if (line.includes("---")) {
        continue;
      } else {
        tableRows.push(parts);
      }
      continue;
    } else if (inTable) {
      inTable = false;
      let tableHtml = `<table style="width:100%; border-collapse:collapse; margin:8px 0; font-size:11px; border:1px solid #e4e4e7;">`;
      tableHtml += `<thead style="background:#f4f4f5; border-bottom:1px solid #e4e4e7;"><tr>`;
      tableHeaders.forEach(h => {
        tableHtml += `<th style="padding:6px 8px; text-align:left; font-weight:700;">${h}</th>`;
      });
      tableHtml += `</tr></thead><tbody>`;
      tableRows.forEach(row => {
        tableHtml += `<tr style="border-bottom:1px solid #e4e4e7;">`;
        row.forEach(cell => {
          tableHtml += `<td style="padding:6px 8px;">${cell}</td>`;
        });
        tableHtml += `</tr>`;
      });
      tableHtml += `</tbody></table>`;
      htmlLines.push(tableHtml);
      tableRows = [];
      tableHeaders = [];
    }
    
    let formatted = line;
    
    // Headings
    if (formatted.startsWith("### ")) {
      formatted = `<h4 style="margin:12px 0 6px 0; font-weight:800; font-size:13px; color:#0f172a; border-bottom:1px solid #f1f5f9; padding-bottom:2px;">${formatted.slice(4)}</h4>`;
    } else if (formatted.startsWith("## ")) {
      formatted = `<h3 style="margin:16px 0 8px 0; font-weight:800; font-size:14px; color:#0f172a;">${formatted.slice(3)}</h3>`;
    } else if (formatted.startsWith("# ")) {
      formatted = `<h2 style="margin:18px 0 10px 0; font-weight:800; font-size:15px; color:#0f172a;">${formatted.slice(2)}</h2>`;
    }
    // Lists
    else if (formatted.startsWith("* ") || formatted.startsWith("- ")) {
      formatted = `<div style="display:flex; margin:4px 0 4px 8px; font-size:12px; line-height:1.4;"><span style="margin-right:6px; color:#eab308;">•</span><span>${formatted.slice(2)}</span></div>`;
    }
    else if (/^\d+\.\s/.test(formatted)) {
      const dotIndex = formatted.indexOf(".");
      const num = formatted.substring(0, dotIndex);
      const rest = formatted.substring(dotIndex + 1).trim();
      formatted = `<div style="display:flex; margin:6px 0 6px 4px; font-size:12px; line-height:1.4;"><span style="font-weight:700; margin-right:6px; color:#eab308;">${num}.</span><span>${rest}</span></div>`;
    }
    
    // Bold / Inline Code
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong style='font-weight:800; color:#0f172a;'>$1</strong>");
    formatted = formatted.replace(/`(.*?)`/g, "<code style='background:#e2e8f0; padding:2px 4px; border-radius:4px; font-family:monospace; font-size:11px;'>$1</code>");
    
    if (formatted !== "") {
      htmlLines.push(formatted + "<br/>");
    }
  }
  
  if (inTable) {
    let tableHtml = `<table style="width:100%; border-collapse:collapse; margin:8px 0; font-size:11px; border:1px solid #e4e4e7;">`;
    tableHtml += `<thead style="background:#f4f4f5; border-bottom:1px solid #e4e4e7;"><tr>`;
    tableHeaders.forEach(h => {
      tableHtml += `<th style="padding:6px 8px; text-align:left; font-weight:700;">${h}</th>`;
    });
    tableHtml += `</tr></thead><tbody>`;
    tableRows.forEach(row => {
      tableHtml += `<tr style="border-bottom:1px solid #e4e4e7;">`;
      row.forEach(cell => {
        tableHtml += `<td style="padding:6px 8px;">${cell}</td>`;
      });
      tableHtml += `</tr>`;
    });
    tableHtml += `</tbody></table>`;
    htmlLines.push(tableHtml);
  }
  
  return htmlLines.join("");
}

/* ─────────────────────────────────────────────── */
/*                    APP                          */
/* ─────────────────────────────────────────────── */
export default function App() {
  const [view, setView] = useState<"landing" | "canvas">("landing");
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState("0.00");
  const [connecting, setConnecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [providers, setProviders] = useState<any[]>([]);
  const [activeProvider, setActiveProvider] = useState<any>(null);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  const [shapes, setShapes] = useState<CustomShape[]>(() => {
    try {
      const saved = localStorage.getItem("fraction-canvas-v2");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [assets, setAssets] = useState<Record<string, CustomAsset>>(() => {
    try {
      const saved = localStorage.getItem("fraction-canvas-assets-v2");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [editorChangeCallbacks, setEditorChangeCallbacks] = useState<(() => void)[]>([]);

  // Update selectedShapes state when shapes or selectedShapeIds change
  useEffect(() => {
    const sel = shapes.filter((s) => selectedShapeIds.includes(s.id));
    setSelectedShapes(sel);
    editorChangeCallbacks.forEach((cb) => cb());
  }, [shapes, selectedShapeIds]);

  // Sync shapes to localStorage
  useEffect(() => {
    localStorage.setItem("fraction-canvas-v2", JSON.stringify(shapes));
  }, [shapes]);

  useEffect(() => {
    localStorage.setItem("fraction-canvas-assets-v2", JSON.stringify(assets));
  }, [assets]);

  const [canvasName, setCanvasName] = useState(() => {
    return localStorage.getItem("fraction-canvas-name") || "Untitled-Design.canvas";
  });

  useEffect(() => {
    localStorage.setItem("fraction-canvas-name", canvasName);
  }, [canvasName]);

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    if (view === "canvas" && !account) {
      setView("landing");
    }
  }, [view, account]);

  const mockEditor = useMemo(() => {
    return {
      getSelectedShapes() {
        return shapes.filter((s) => selectedShapeIds.includes(s.id));
      },
      getCurrentPageShapeIds() {
        return new Set(shapes.map((s) => s.id));
      },
      getCurrentPageShapes() {
        return shapes;
      },
      createAssets(newAssets: any[]) {
        setAssets((prev) => {
          const next = { ...prev };
          newAssets.forEach((a) => {
            next[a.id] = a;
          });
          return next;
        });
      },
      createShapes(newShapes: any[]) {
        setShapes((prev) => [...prev, ...newShapes]);
      },
      setCurrentTool(toolName: string, options?: any) {
        if (toolName === "geo" && options?.shapeType) {
          setActiveTool(options.shapeType);
        } else {
          setActiveTool(toolName);
        }
      },
      updateShapes(updates: any[]) {
        setShapes((prev) =>
          prev.map((shape) => {
            const update = updates.find((u) => u.id === shape.id);
            if (!update) return shape;
            return {
              ...shape,
              x: update.x !== undefined ? update.x : shape.x,
              y: update.y !== undefined ? update.y : shape.y,
              props: {
                ...shape.props,
                ...(update.props || {}),
              },
              meta: {
                ...shape.meta,
                ...(update.meta || {}),
              },
            };
          })
        );
      },
      on(event: string, callback: () => void) {
        if (event === "change") {
          setEditorChangeCallbacks((prev) => [...prev, callback]);
        }
      },
      off(event: string, callback: () => void) {
        if (event === "change") {
          setEditorChangeCallbacks((prev) => prev.filter((cb) => cb !== callback));
        }
      },
      async getSvg(ids: string[]) {
        const svgNamespace = "http://www.w3.org/2000/svg";
        const svgEl = document.createElementNS(svgNamespace, "svg") as SVGSVGElement;
        
        const shapesToRender = shapes.filter((s) => ids.includes(s.id));
        if (shapesToRender.length === 0) return svgEl;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        shapesToRender.forEach((shape) => {
          const w = shape.props?.w ?? 100;
          const h = shape.props?.h ?? 100;
          if (shape.x < minX) minX = shape.x;
          if (shape.y < minY) minY = shape.y;
          if (shape.x + w > maxX) maxX = shape.x + w;
          if (shape.y + h > maxY) maxY = shape.y + h;
        });

        minX -= 20;
        minY -= 20;
        maxX += 20;
        maxY += 20;

        const width = maxX - minX;
        const height = maxY - minY;

        svgEl.setAttribute("viewBox", `${minX} ${minY} ${width} ${height}`);
        svgEl.setAttribute("width", width.toString());
        svgEl.setAttribute("height", height.toString());


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

        shapesToRender.forEach((shape) => {
          const strokeColor = getCanvasColorValue(shape.props?.color || "black");
          const fillColor = shape.props?.fill === "solid" ? strokeColor : (shape.props?.fill === "semi" ? `${strokeColor}55` : "none");
          const strokeWidth = shape.props?.strokeWidth ?? 2;
          const opacity = shape.props?.opacity ?? 1;

          let strokeDasharray: string | undefined = undefined;
          if (shape.props?.strokeStyle === "dashed") {
            strokeDasharray = `${strokeWidth * 3},${strokeWidth * 3}`;
          } else if (shape.props?.strokeStyle === "dotted") {
            strokeDasharray = `${strokeWidth},${strokeWidth * 2}`;
          }

          let el: SVGElement | null = null;
          switch (shape.type) {
            case "rectangle": {
              const rect = document.createElementNS(svgNamespace, "rect");
              rect.setAttribute("x", shape.x.toString());
              rect.setAttribute("y", shape.y.toString());
              rect.setAttribute("width", (shape.props?.w ?? 100).toString());
              rect.setAttribute("height", (shape.props?.h ?? 100).toString());
              rect.setAttribute("stroke", strokeColor);
              rect.setAttribute("fill", fillColor);
              rect.setAttribute("stroke-width", strokeWidth.toString());
              if (strokeDasharray) rect.setAttribute("stroke-dasharray", strokeDasharray);
              if (shape.props?.rx) {
                rect.setAttribute("rx", shape.props.rx.toString());
                rect.setAttribute("ry", shape.props.rx.toString());
              }
              rect.setAttribute("data-shape-id", shape.id);
              el = rect;
              break;
            }
            case "ellipse": {
              const cx = shape.x + (shape.props?.w ?? 100) / 2;
              const cy = shape.y + (shape.props?.h ?? 100) / 2;
              const rx = (shape.props?.w ?? 100) / 2;
              const ry = (shape.props?.h ?? 100) / 2;
              const ellipse = document.createElementNS(svgNamespace, "ellipse");
              ellipse.setAttribute("cx", cx.toString());
              ellipse.setAttribute("cy", cy.toString());
              ellipse.setAttribute("rx", rx.toString());
              ellipse.setAttribute("ry", ry.toString());
              ellipse.setAttribute("stroke", strokeColor);
              ellipse.setAttribute("fill", fillColor);
              ellipse.setAttribute("stroke-width", strokeWidth.toString());
              if (strokeDasharray) ellipse.setAttribute("stroke-dasharray", strokeDasharray);
              ellipse.setAttribute("data-shape-id", shape.id);
              el = ellipse;
              break;
            }
            case "text": {
              const text = document.createElementNS(svgNamespace, "text");
              text.setAttribute("x", shape.x.toString());
              text.setAttribute("y", (shape.y + 20).toString());
              text.setAttribute("fill", strokeColor);
              text.setAttribute("font-family", shape.props?.font === "mono" ? "monospace" : (shape.props?.font === "serif" ? "serif" : "sans-serif"));
              text.setAttribute("font-size", (shape.props?.fontSize ?? 16).toString());
              text.textContent = shape.props?.text ?? "";
              text.setAttribute("data-shape-id", shape.id);
              el = text;
              break;
            }
            case "note": {
              const g = document.createElementNS(svgNamespace, "g");
              const rect = document.createElementNS(svgNamespace, "rect");
              const w = shape.props?.w ?? 150;
              const h = shape.props?.h ?? 150;
              const colorName = shape.props?.color || "yellow";
              const noteCol = noteColors[colorName] || noteColors.yellow;
              rect.setAttribute("x", shape.x.toString());
              rect.setAttribute("y", shape.y.toString());
              rect.setAttribute("width", w.toString());
              rect.setAttribute("height", h.toString());
              rect.setAttribute("fill", noteCol.fill);
              rect.setAttribute("stroke", noteCol.stroke);
              rect.setAttribute("stroke-width", "1.5");
              rect.setAttribute("rx", "6");
              rect.setAttribute("ry", "6");
              g.appendChild(rect);

              const text = document.createElementNS(svgNamespace, "text");
              text.setAttribute("x", (shape.x + w / 2).toString());
              text.setAttribute("y", (shape.y + h / 2).toString());
              text.setAttribute("text-anchor", "middle");
              text.setAttribute("dominant-baseline", "middle");
              text.setAttribute("fill", "#000000");
              text.setAttribute("font-size", (shape.props?.fontSize ?? 13).toString());
              text.textContent = shape.props?.text ?? "";
              g.appendChild(text);
              g.setAttribute("data-shape-id", shape.id);
              el = g;
              break;
            }
            case "image": {
              const img = document.createElementNS(svgNamespace, "image");
              img.setAttribute("x", shape.x.toString());
              img.setAttribute("y", shape.y.toString());
              img.setAttribute("width", (shape.props?.w ?? 400).toString());
              img.setAttribute("height", (shape.props?.h ?? 300).toString());
              const assetId = shape.props?.assetId;
              const asset = assetId ? assets[assetId] : undefined;
              if (asset?.props?.src) {
                img.setAttributeNS("http://www.w3.org/1999/xlink", "href", asset.props.src);
              }
              img.setAttribute("data-shape-id", shape.id);
              el = img;
              break;
            }
            case "line": {
              const line = document.createElementNS(svgNamespace, "line");
              line.setAttribute("x1", shape.x.toString());
              line.setAttribute("y1", shape.y.toString());
              line.setAttribute("x2", (shape.x + (shape.props?.w ?? 100)).toString());
              line.setAttribute("y2", (shape.y + (shape.props?.h ?? 100)).toString());
              line.setAttribute("stroke", strokeColor);
              line.setAttribute("stroke-width", strokeWidth.toString());
              if (strokeDasharray) line.setAttribute("stroke-dasharray", strokeDasharray);
              line.setAttribute("data-shape-id", shape.id);
              el = line;
              break;
            }
            case "arrow": {
              const x1 = shape.x;
              const y1 = shape.y;
              const x2 = shape.x + (shape.props?.w ?? 100);
              const y2 = shape.y + (shape.props?.h ?? 100);
              const angle = Math.atan2(y2 - y1, x2 - x1);
              const arrowLength = 10;
              const x3 = x2 - arrowLength * Math.cos(angle - Math.PI / 6);
              const y3 = y2 - arrowLength * Math.sin(angle - Math.PI / 6);
              const x4 = x2 - arrowLength * Math.cos(angle + Math.PI / 6);
              const y4 = y2 - arrowLength * Math.sin(angle + Math.PI / 6);

              const g = document.createElementNS(svgNamespace, "g");
              const line = document.createElementNS(svgNamespace, "line");
              line.setAttribute("x1", x1.toString());
              line.setAttribute("y1", y1.toString());
              line.setAttribute("x2", x2.toString());
              line.setAttribute("y2", y2.toString());
              line.setAttribute("stroke", strokeColor);
              line.setAttribute("stroke-width", strokeWidth.toString());
              if (strokeDasharray) line.setAttribute("stroke-dasharray", strokeDasharray);
              g.appendChild(line);

              const head = document.createElementNS(svgNamespace, "polygon");
              head.setAttribute("points", `${x2},${y2} ${x3},${y3} ${x4},${y4}`);
              head.setAttribute("fill", strokeColor);
              g.appendChild(head);
              g.setAttribute("data-shape-id", shape.id);
              el = g;
              break;
            }
            case "draw": {
              const points = shape.props?.points || [];
              if (points.length < 2) break;
              let pathData = `M ${shape.x + points[0].x} ${shape.y + points[0].y}`;
              for (let i = 1; i < points.length; i++) {
                pathData += ` L ${shape.x + points[i].x} ${shape.y + points[i].y}`;
              }
              const path = document.createElementNS(svgNamespace, "path");
              path.setAttribute("d", pathData);
              path.setAttribute("stroke", strokeColor);
              path.setAttribute("fill", "none");
              path.setAttribute("stroke-width", strokeWidth.toString());
              if (strokeDasharray) path.setAttribute("stroke-dasharray", strokeDasharray);
              path.setAttribute("stroke-linecap", "round");
              path.setAttribute("stroke-linejoin", "round");
              path.setAttribute("data-shape-id", shape.id);
              el = path;
              break;
            }
          }
          if (el) {
            if (opacity !== 1) {
              el.setAttribute("opacity", opacity.toString());
            }
            svgEl.appendChild(el);
          }
        });

        return svgEl;
      }
    };
  }, [shapes, selectedShapeIds, assets]);

  const [editor, setEditor] = useState<Editor | null>(null);

  useEffect(() => {
    setEditor(mockEditor);
  }, [mockEditor]);

  const [activeTool, setActiveTool] = useState("select");

  const [exporting, setExporting] = useState(false);
  const [exportStep, setExportStep] = useState("");
  const [exportTxHash, setExportTxHash] = useState<string | null>(null);
  const [exportFormatsModalOpen, setExportFormatsModalOpen] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiStep, setAiStep] = useState("");
  const [aiLogs, setAiLogs] = useState<string[]>([]);
  const [aiSettlementId, setAiSettlementId] = useState<string | null>(null);
  const [aiFeedback, setAiFeedback] = useState<{
    score: number;
    suggestions: string[];
  } | null>(null);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const [selectedShapes, setSelectedShapes] = useState<any[]>([]);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // EIP-6963 and window.ethereum provider discovery
  useEffect(() => {
    const handleProvider = (event: any) => {
      setProviders((prev) => {
        if (prev.some((p) => p.info.uuid === event.detail.info.uuid)) return prev;
        return [...prev, event.detail];
      });
    };
    window.addEventListener("eip6963:announceProvider", handleProvider);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    return () => {
      window.removeEventListener("eip6963:announceProvider", handleProvider);
    };
  }, []);

  useEffect(() => {
    const wasConnected = localStorage.getItem("fraction-wallet-connected") === "true";
    if (!wasConnected) return;

    const checkConnected = async () => {
      let provider = activeProvider || (providers.length > 0 ? providers[0].provider : null);
      if (!provider && window.ethereum) {
        provider = window.ethereum;
        if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
          provider = window.ethereum.providers.find((p: any) => p.isMetaMask) || window.ethereum.providers[0];
        }
      }

      if (provider) {
        try {
          const accounts = await provider.request({ method: "eth_accounts" });
          if (accounts && accounts.length > 0) {
            setActiveProvider(provider);
            setAccount(accounts[0]);
            // Update balance
            updateBalance(accounts[0]);
            setView("canvas");
          }
        } catch {}
      }
    };
    checkConnected();
  }, [providers, activeProvider]);

  useEffect(() => {
    if (!activeProvider) return;

    const handleAccounts = (accs: string[]) => {
      if (accs.length > 0) {
        setAccount(accs[0]);
        // Update balance
        updateBalance(accs[0]);
      } else {
        handleLogout();
      }
    };

    const handleChain = () => {
      if (account) {
        updateBalance(account);
      }
    };

    if (typeof activeProvider.on === "function") {
      activeProvider.on("accountsChanged", handleAccounts);
      activeProvider.on("chainChanged", handleChain);
    }
    return () => {
      if (activeProvider && typeof activeProvider.removeListener === "function") {
        activeProvider.removeListener("accountsChanged", handleAccounts);
        activeProvider.removeListener("chainChanged", handleChain);
      }
    };
  }, [activeProvider, account]);

  useEffect(() => {
    if (!editor) return;
    const handleChange = () => {
      setSelectedShapes(editor.getSelectedShapes());
    };
    editor.on("change", handleChange);
    return () => {
      editor.off("change", handleChange);
    };
  }, [editor]);

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => setToast({ message, type });

  const updateBalance = async (addr: string) => {
    try {
      const res = await fetch(`/api/balance/${addr}`);
      if (res.ok) {
        const body = await res.json();
        if (body.balance && body.balance !== "0x") {
          setBalance((Number(BigInt(body.balance)) / 1e6).toFixed(4));
        } else if (body.balance === "0x" || body.balance === "0x0") {
          setBalance("0.0000");
        }
      }
    } catch (e) {
      console.error("Failed to update balance via backend proxy:", e);
    }
  };

  const ensureArc = async (provider?: any) => {
    const targetProvider = provider || activeProvider;
    if (!targetProvider) return;
    const cur = await targetProvider.request({ method: "eth_chainId" });
    if (cur && parseInt(cur, 16) === parseInt(ARC_TESTNET_HEX, 16)) return;
    try {
      await targetProvider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ARC_TESTNET_HEX }],
      });
    } catch (e: any) {
      if (e?.code === 4902 || e?.code === -32603) {
        await targetProvider.request({
          wallet_addEthereumChain: true,
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: ARC_TESTNET_HEX,
              chainName: "Arc Testnet",
              nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
              rpcUrls: [RPC_ENDPOINT],
              blockExplorerUrls: ["https://testnet.arcscan.app"],
            },
          ],
        });
      } else throw e;
    }
  };

  const connectToProvider = async (provider: any) => {
    setConnecting(true);
    setAuthError(null);
    setWalletModalOpen(false);
    try {
      setActiveProvider(provider);
      
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found.");
      }

      const userAccount = accounts[0];
      setAccount(userAccount);
      await updateBalance(userAccount);

      try {
        await ensureArc(provider);
      } catch (chainErr: any) {
        console.warn("Failed to switch network:", chainErr);
        showToast("Connected, but please switch your wallet to Arc Testnet.", "info");
      }

      showToast("Wallet connected successfully!", "success");
      localStorage.setItem("fraction-wallet-connected", "true");
      setTimeout(() => {
        setView("canvas");
        setConnecting(false);
      }, 600);
    } catch (err: any) {
      console.error("Wallet connect error:", err);
      const errMsg = err.message || "Failed to connect";
      setAuthError(errMsg);
      showToast(errMsg, "error");
      setConnecting(false);
    }
  };

  const connectWallet = async () => {
    if (window.location.search.includes("mock=true")) {
      setAccount("0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
      setBalance("120.50");
      setActiveProvider({
        request: async ({ method }: any) => {
          if (method === "eth_chainId") {
            return ARC_TESTNET_HEX;
          }
          if (method === "wallet_switchEthereumChain" || method === "wallet_addEthereumChain") {
            return null;
          }
          if (method === "eth_sendTransaction") {
            return "0xmocktxhash1234567890abcdef";
          }
          if (method === "eth_getTransactionReceipt") {
            return { status: "0x1" };
          }
          if (method === "eth_signTypedData_v4") {
            return "0xmocksignature1234567890abcdef";
          }
          return null;
        }
      });
      setView("canvas");
      localStorage.setItem("fraction-wallet-connected", "true");
      showToast("Mock Developer Wallet Connected!", "info");
      return;
    }

    if (providers.length > 1) {
      setWalletModalOpen(true);
    } else if (providers.length === 1) {
      connectToProvider(providers[0].provider);
    } else if (window.ethereum) {
      let provider = window.ethereum;
      if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
        provider = window.ethereum.providers.find((p: any) => p.isMetaMask) || window.ethereum.providers[0];
      }
      connectToProvider(provider);
    } else {
      showToast("No Web3 provider detected. Please install a wallet extension like MetaMask or Phantom.", "error");
    }
  };

  const handleLogout = () => {
    setAccount(null);
    setActiveProvider(null);
    setView("landing");
    setProfileDropdownOpen(false);

    // Reset session states
    setShapes([]);
    setAssets({});
    setSelectedShapeIds([]);
    setChatMessages([]);
    setCanvasName("Untitled-Design.canvas");

    // Clear localStorage keys
    localStorage.removeItem("fraction-canvas-v2");
    localStorage.removeItem("fraction-canvas-assets-v2");
    localStorage.removeItem("fraction-canvas-name");
    localStorage.setItem("fraction-wallet-connected", "false");
  };

  /* ── x402 Nanopayments EIP-712 Gateway Helper ── */
  const payNanopayment = async (
    endpoint: string,
    method: "GET" | "POST",
    onProgress: (m: string) => void
  ): Promise<string> => {
    if (!account || !activeProvider) {
      throw new Error("Wallet not connected.");
    }
    onProgress("Requesting 402 payment challenge...");
    const r1 = await fetch(endpoint, { method });
    if (r1.status !== 402) {
      throw new Error(`Expected 402, got ${r1.status}`);
    }
    const hdr = r1.headers.get("PAYMENT-REQUIRED");
    if (!hdr) throw new Error("Missing PAYMENT-REQUIRED header");
    const challenge = JSON.parse(b64decode(hdr));
    const accepted = challenge.accepts[0];
    onProgress(`Challenge: ${Number(accepted.amount) / 1e6} USDC`);

    onProgress("Requesting EIP-712 signature...");
    const requiredChainId = parseInt(accepted.network.split(":")[1], 10);
    const requiredChainIdHex = "0x" + requiredChainId.toString(16);
    const curChainId = await activeProvider.request({ method: "eth_chainId" });
    if (curChainId && parseInt(curChainId, 16) !== requiredChainId) {
      onProgress(`Switching wallet network to ${accepted.network} (Arc Testnet)...`);
      try {
        await activeProvider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: requiredChainIdHex }],
        });
      } catch (switchError: any) {
        if (switchError?.code === 4902 || switchError?.code === -32603) {
          await activeProvider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: requiredChainIdHex,
                chainName: "Arc Testnet",
                nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
                rpcUrls: [RPC_ENDPOINT],
                blockExplorerUrls: ["https://testnet.arcscan.app"],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }
    }
    const now = Math.floor(Date.now() / 1000);
    const nonce = randomNonceHex();
    const typedData = {
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        TransferWithAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
        ],
      },
      primaryType: "TransferWithAuthorization",
      domain: {
        name: "GatewayWalletBatched",
        version: "1",
        chainId: parseInt(accepted.network.split(":")[1], 10),
        verifyingContract: accepted.extra.verifyingContract,
      },
      message: {
        from: account,
        to: accepted.payTo,
        value: accepted.amount,
        validAfter: (now - 600).toString(),
        validBefore: (
          now + Math.max(accepted.maxTimeoutSeconds, 7 * 86400 + 600)
        ).toString(),
        nonce,
      },
    };

    const sig = (await activeProvider.request({
      method: "eth_signTypedData_v4",
      params: [account, JSON.stringify(typedData)],
    })) as string;
    onProgress("Signature obtained ✓");

    onProgress("Settling via facilitator...");
    const payload = {
      x402Version: 2,
      payload: {
        signature: sig,
        authorization: typedData.message,
      },
      accepted,
      resource: challenge.resource,
    };

    const r2 = await fetch(endpoint, {
      method,
      headers: { "payment-signature": b64encode(payload) },
    });
    if (!r2.ok) {
      let reason = "";
      try {
        const errJson = await r2.json();
        reason = errJson.reason || errJson.error || errJson.message || "";
      } catch (e) {}
      throw new Error(`Settlement rejected: ${r2.status}${reason ? ` (${reason})` : ""}`);
    }
    const body = await r2.json();
    onProgress(`Settlement UUID: ${body.settlementId}`);

    onProgress("Polling settlement status...");
    let settled = false;
    for (let i = 0; i < 25 && !settled; i++) {
      const pr = await fetch(`/api/settlement/${body.settlementId}`);
      if (pr.ok) {
        const s = await pr.json();
        onProgress(`Status: ${s.status}`);
        if (["received", "batched", "completed", "confirmed"].includes(s.status)) {
          settled = true;
        }
      }
      if (!settled) await new Promise((r) => setTimeout(r, 800));
    }
    if (!settled) throw new Error("Settlement timed out.");
    onProgress("Payment confirmed ✓");
    return body.settlementId as string;
  };

  /* ── Export (0.05 USDC x402 Nanopayment) ── */
  const handleExport = async () => {
    if (!account || !editor) return;
    setExporting(true);
    setExportTxHash(null);
    setExportStep("Authorizing nanopayment of 0.05 USDC...");
    try {
      const settlementId = await payNanopayment("/api/export-svg", "POST", (m) => {
        setExportStep(m);
      });
      setExportTxHash(settlementId);

      showToast("Payment verified! Select your export format.", "success");
      setExportFormatsModalOpen(true);
      updateBalance(account);
    } catch (err: any) {
      showToast(err.message || "Export failed", "error");
    }
    setExporting(false);
  };

  const downloadAsSVG = async () => {
    if (!editor) return;
    try {
      const ids = editor.getCurrentPageShapeIds();
      if (ids.size === 0) throw new Error("Canvas is empty.");
      const svg = await editor.getSvg(Array.from(ids));
      if (!svg) throw new Error("SVG generation failed.");
      
      // Inject filters style to preserve shaders in SVG download
      const shapes = editor.getCurrentPageShapes();
      const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
      styleEl.textContent = shapes
        .filter((s: any) => s.meta?.filter)
        .map((s: any) => `[data-shape-id="${s.id}"] { filter: ${s.meta.filter} !important; }`)
        .join("\n");
      svg.appendChild(styleEl);

      const str = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([str], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fraction-${Date.now()}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("SVG downloaded!", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const downloadAsJSON = () => {
    if (!editor) return;
    try {
      const shapes = editor.getCurrentPageShapes();
      const str = JSON.stringify(shapes, null, 2);
      const blob = new Blob([str], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fraction-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("JSON backup downloaded!", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const downloadAsImage = async (type: "png" | "jpeg") => {
    if (!editor) return;
    try {
      const ids = editor.getCurrentPageShapeIds();
      if (ids.size === 0) throw new Error("Canvas is empty.");
      const svg = await editor.getSvg(Array.from(ids));
      if (!svg) throw new Error("SVG generation failed.");
      
      // Inject filters style to preserve shaders in raster download
      const shapes = editor.getCurrentPageShapes();
      const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
      styleEl.textContent = shapes
        .filter((s: any) => s.meta?.filter)
        .map((s: any) => `[data-shape-id="${s.id}"] { filter: ${s.meta.filter} !important; }`)
        .join("\n");
      svg.appendChild(styleEl);

      const str = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([str], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const width = svg.getAttribute("width") ? parseInt(svg.getAttribute("width"), 10) : 800;
        const height = svg.getAttribute("height") ? parseInt(svg.getAttribute("height"), 10) : 600;
        
        // Add padding
        canvas.width = width * 1.5;
        canvas.height = height * 1.5;
        
        const ctx = canvas.getContext("2d");
        if (ctx) {
          if (type === "jpeg") {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx.drawImage(img, width * 0.25, height * 0.25, width, height);
          
          const imgUrl = canvas.toDataURL(type === "png" ? "image/png" : "image/jpeg", 0.95);
          const a = document.createElement("a");
          a.href = imgUrl;
          a.download = `fraction-${Date.now()}.${type}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
        showToast(`${type.toUpperCase()} downloaded!`, "success");
      };
      img.src = url;
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  /* ── AI Review (KIRO OpenRouter EIP-712 Chat) ── */
  const sendChatMessage = async (overrideMsg?: string) => {
    const inputContent = overrideMsg || chatInput.trim();
    if (!inputContent || !account || !activeProvider) return;

    const userMsg = { role: "user", content: inputContent };
    setChatMessages((prev) => [...prev, userMsg]);
    if (!overrideMsg) setChatInput("");
    setAiLoading(true);
    setAiStep("Authorizing nanopayment of 0.01 USDC...");
    setAiLogs([]);

    const log = (m: string) => {
      setAiLogs((p) => [...p, `[${new Date().toLocaleTimeString()}] ${m}`]);
      setAiStep(m);
    };

    try {
      const settlementId = await payNanopayment("/hello-world", "GET", log);
      setAiSettlementId(settlementId);

      log("Sending request to KIRO...");
      const shapes = editor ? editor.getCurrentPageShapes() : [];
      const updatedHistory = [...chatMessages, userMsg];

      const r3 = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedHistory,
          shapes,
        }),
      });

      if (!r3.ok) throw new Error("Failed to contact KIRO AI agent.");
      const chatData = await r3.json();
      const botResponse = chatData.choices?.[0]?.message;

      if (botResponse) {
        setChatMessages((prev) => [...prev, botResponse]);
        showToast("KIRO replied!", "success");
      } else {
        throw new Error("No response from KIRO.");
      }

      updateBalance(account);
    } catch (err: any) {
      log(`Error: ${err.message}`);
      showToast(err.message, "error");
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Failed to get response: ${err.message}` },
      ]);
    }
    setAiLoading(false);
  };

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl || !editor) return;

      const assetId = `asset:${Date.now()}` as any;
      const shapeId = `shape:${Date.now()}` as any;

      editor.createAssets([
        {
          id: assetId,
          type: "image",
          typeName: "asset",
          props: {
            name: file.name,
            src: dataUrl,
            w: 400,
            h: 300,
            mimeType: file.type,
          },
          meta: {},
        },
      ]);

      editor.createShapes([
        {
          id: shapeId,
          type: "image",
          x: 150,
          y: 150,
          props: {
            w: 400,
            h: 300,
            assetId: assetId,
          },
        },
      ]);
      
      showToast("Image uploaded!", "success");
    };
    reader.readAsDataURL(file);
  };

  const selectTool = (name: string) => {
    setActiveTool(name);
    if (!editor) return;
    if (name === "rectangle") {
      editor.setCurrentTool("geo", { shapeType: "rectangle" });
    } else if (name === "ellipse") {
      editor.setCurrentTool("geo", { shapeType: "ellipse" });
    } else {
      editor.setCurrentTool(name);
    }
  };

  /* ──────────────────── RENDER ──────────────────── */
  const shapesList = editor ? editor.getCurrentPageShapes() : [];
  const dynamicFilterStyles = shapesList
    .filter((s: any) => s.meta?.filter && s.meta.filter !== "none")
    .map((s: any) => `[data-shape-id="${s.id}"] { filter: ${s.meta.filter} !important; }`)
    .join("\n");

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <style dangerouslySetInnerHTML={{ __html: dynamicFilterStyles }} />
      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            style={{
              position: "fixed",
              top: 24,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 9999,
              padding: "14px 24px",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontWeight: 600,
              fontSize: 14,
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
            className={
              toast.type === "success"
                ? "toast-success"
                : toast.type === "error"
                ? "toast-error"
                : "toast-info"
            }
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={18} />
            ) : toast.type === "error" ? (
              <AlertCircle size={18} />
            ) : (
              <Loader2 size={18} className="animate-spin" />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* ════════════════════════════════════════════ */}
        {/*         VIEW 1 — LANDING PAGE       */}
        {/* ════════════════════════════════════════════ */}
        {view === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="neo-container"
            style={{
              width: "100%",
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column",
              overflow: "auto",
            }}
          >
            {/* ── Marquee ── */}
            <div
              style={{
                width: "100%",
                background: "#0a0a0a",
                color: "#facc15",
                padding: "10px 0",
                overflow: "hidden",
                borderBottom: "3px solid #0a0a0a",
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              <div className="neo-marquee-track">
                {[0, 1].map((i) => (
                  <span key={i} style={{ whiteSpace: "nowrap", paddingRight: 80 }}>
                    ⚡ THE INFINITE CANVAS FOR CREATORS &nbsp;// &nbsp;REAL-TIME
                    MICROPAYMENTS ON ARC &nbsp;// &nbsp;FREE CORE TOOLS
                    &nbsp;// &nbsp;AI-POWERED LAYOUT INTELLIGENCE &nbsp;// &nbsp;PAY
                    FRACTIONS OF A CENT &nbsp;// &nbsp;X402 PROTOCOL &nbsp;
                  </span>
                ))}
              </div>
            </div>

            {/* ── Header ── */}
            <header
              style={{
                maxWidth: 1200,
                width: "100%",
                margin: "0 auto",
                padding: "20px 32px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "#0a0a0a",
                  color: "#fff",
                  padding: "10px 16px",
                  border: "3px solid #0a0a0a",
                  boxShadow: "4px 4px 0px #facc15",
                  cursor: "pointer",
                }}
              >
                <Sparkles size={20} color="#facc15" fill="#facc15" />
                <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.03em" }}>
                  FRACTION
                </span>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <a
                  href="https://faucet.circle.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="neo-btn neo-btn-purple"
                  style={{ padding: "8px 16px", fontSize: 13 }}
                >
                  <Coins size={14} /> Get Test USDC
                </a>
                {account ? (
                  <button
                    onClick={() => setView("canvas")}
                    className="neo-btn neo-btn-yellow"
                    style={{
                      padding: "8px 16px",
                      fontSize: 13,
                    }}
                  >
                    <Sparkles size={14} /> Launch Workspace
                  </button>
                ) : (
                  <button
                    onClick={connectWallet}
                    className="neo-btn"
                    style={{
                      padding: "8px 16px",
                      fontSize: 13,
                      background: "#fff",
                    }}
                  >
                    <Wallet size={14} /> Connect Wallet
                  </button>
                )}
              </div>
            </header>

            {/* ══════════ HERO SECTION ══════════ */}
            <section
              className="hero-grid"
              style={{
                maxWidth: 1200,
                width: "100%",
                margin: "0 auto",
                padding: "48px 32px 72px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 60,
                alignItems: "center",
              }}
            >
              {/* Left Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                {/* Badge */}
                <div
                  style={{
                    display: "inline-flex",
                    alignSelf: "flex-start",
                    background: "#a78bfa",
                    padding: "6px 14px",
                    border: "3px solid #0a0a0a",
                    boxShadow: "3px 3px 0px #0a0a0a",
                    fontWeight: 800,
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    transform: "rotate(1deg)",
                  }}
                >
                  No subscriptions • No seat fees • Ever
                </div>

                {/* Headline */}
                <h1
                  style={{
                    margin: 0,
                    fontSize: 56,
                    fontWeight: 900,
                    lineHeight: 1.08,
                    letterSpacing: "-0.035em",
                    color: "#0a0a0a",
                  }}
                >
                  Create freely.
                  <br />
                  <span
                    style={{
                      display: "inline-block",
                      background: "#facc15",
                      padding: "4px 14px",
                      border: "3px solid #0a0a0a",
                      boxShadow: "5px 5px 0px #0a0a0a",
                      marginTop: 8,
                      transform: "rotate(-1.5deg)",
                    }}
                  >
                    Pay by the fraction.
                  </span>
                </h1>

                {/* Subheading */}
                <p
                  style={{
                    margin: 0,
                    fontSize: 17,
                    fontWeight: 500,
                    color: "#3f3f46",
                    lineHeight: 1.7,
                    maxWidth: 480,
                  }}
                >
                  Fraction is an infinite canvas where every creative tool is yours from day one — shapes, text, arrows, freehand. When you need more, our AI agent audits your layout and fixes spacing for a fraction of a cent. Real USDC. No monthly invoices.
                </p>

                {/* CTA Row */}
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  {account ? (
                    <button
                      onClick={() => setView("canvas")}
                      className="neo-btn neo-btn-yellow"
                      style={{ fontSize: 18, padding: "18px 36px" }}
                    >
                      <Sparkles size={22} />
                      Launch Workspace
                    </button>
                  ) : (
                    <button
                      onClick={connectWallet}
                      disabled={connecting}
                      className="neo-btn neo-btn-yellow"
                      style={{ fontSize: 18, padding: "18px 36px" }}
                    >
                      {connecting ? (
                        <>
                          <Loader2 size={22} className="animate-spin" />
                          Connecting Wallet...
                        </>
                      ) : (
                        <>
                          <Wallet size={22} />
                          Connect Wallet
                        </>
                      )}
                    </button>
                  )}
                  <a
                    href="https://faucet.circle.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="neo-btn neo-btn-dark"
                    style={{ fontSize: 15, padding: "18px 28px" }}
                  >
                    Get Free Testnet USDC
                  </a>
                </div>

                {authError && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      padding: "10px 14px",
                      background: "#fef2f2",
                      border: "2px solid #ef4444",
                      fontWeight: 700,
                      fontSize: 13,
                      color: "#b91c1c",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <AlertCircle size={16} />
                    {authError}
                  </motion.div>
                )}

                {/* Info line */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#71717a",
                  }}
                >
                  <Zap size={14} color="#a78bfa" />
                  Connect with MetaMask • Arc Testnet (Chain 5042002)
                </div>
              </div>

              {/* Right Column — Preview Card */}
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    inset: -8,
                    background: "#f472b6",
                    border: "3px solid #0a0a0a",
                    boxShadow: "10px 10px 0px #0a0a0a",
                    transform: "rotate(-2deg)",
                  }}
                />
                <div
                  className="neo-card"
                  style={{
                    position: "relative",
                    padding: 24,
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                  }}
                >
                  {/* Title bar */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: "3px solid #0a0a0a",
                      paddingBottom: 14,
                    }}
                  >
                    <div style={{ display: "flex", gap: 7 }}>
                      {["#ef4444", "#facc15", "#4ade80"].map((c) => (
                        <div
                          key={c}
                          style={{
                            width: 13,
                            height: 13,
                            borderRadius: 99,
                            background: c,
                            border: "2px solid #0a0a0a",
                          }}
                        />
                      ))}
                    </div>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: 10,
                        letterSpacing: "0.12em",
                        color: "#a1a1aa",
                        textTransform: "uppercase",
                      }}
                    >
                      fraction_workspace.tsx
                    </span>
                  </div>

                  {/* Canvas mockup */}
                  <div
                    className="dot-grid"
                    style={{
                      height: 200,
                      border: "3px solid #0a0a0a",
                      position: "relative",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div className="animate-float-slow" style={{ position: "absolute", top: 20, left: 24, width: 48, height: 48, borderRadius: 99, background: "#a78bfa", border: "3px solid #0a0a0a", boxShadow: "3px 3px 0px #0a0a0a" }} />
                    <div className="animate-float-medium" style={{ position: "absolute", bottom: 16, right: 32, width: 56, height: 36, background: "#f87171", border: "3px solid #0a0a0a", boxShadow: "3px 3px 0px #0a0a0a", transform: "rotate(-8deg)" }} />
                    <div className="animate-float-fast" style={{ position: "absolute", top: 28, right: 60, width: 28, height: 28, background: "#38bdf8", border: "3px solid #0a0a0a", boxShadow: "2px 2px 0px #0a0a0a" }} />

                    <motion.div
                      animate={{ scale: [1, 1.03, 1], rotate: [0, 2, 0] }}
                      transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                      style={{
                        background: "#facc15",
                        border: "3px solid #0a0a0a",
                        boxShadow: "4px 4px 0px #0a0a0a",
                        padding: "16px 28px",
                        textAlign: "center",
                        zIndex: 2,
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#71717a", textTransform: "uppercase" }}>
                        One-click Export
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4, letterSpacing: "-0.02em" }}>
                        Canvas → SVG
                      </div>
                      <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "#0a0a0a", color: "#facc15", fontWeight: 800, fontSize: 11, border: "2px solid #0a0a0a" }}>
                        <Coins size={12} /> 0.05 USDC
                      </div>
                    </motion.div>
                  </div>

                  {/* Feature grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {[
                      { label: "Core Tools", value: "FREE", bg: "#dbeafe", icon: <Grid3x3 size={14} /> },
                      { label: "AI Review", value: "$0.01", bg: "#fef08a", icon: <Eye size={14} /> },
                      { label: "Export", value: "$0.05", bg: "#bbf7d0", icon: <Download size={14} /> },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          padding: "10px 12px",
                          background: item.bg,
                          border: "3px solid #0a0a0a",
                          boxShadow: "3px 3px 0px #0a0a0a",
                          fontWeight: 800,
                          fontSize: 11,
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#71717a", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {item.icon} {item.label}
                        </div>
                        <span style={{ fontSize: 16, color: "#0a0a0a" }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ══════════ HOW IT WORKS ══════════ */}
            <section
              id="features"
              className="dot-grid"
              style={{
                borderTop: "3px solid #0a0a0a",
                borderBottom: "3px solid #0a0a0a",
                background: "#fff",
                position: "relative",
              }}
            >
              <div
                style={{
                  maxWidth: 1200,
                  margin: "0 auto",
                  padding: "80px 32px",
                }}
              >
                <div style={{ textAlign: "center", marginBottom: 56 }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "#dbeafe",
                      color: "#1e40af",
                      padding: "6px 12px",
                      border: "2px solid #0a0a0a",
                      fontSize: 12,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 16,
                      transform: "rotate(-0.5deg)",
                    }}
                  >
                    <Zap size={13} /> Workflow
                  </div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 44,
                      fontWeight: 900,
                      letterSpacing: "-0.03em",
                      color: "#0a0a0a",
                    }}
                  >
                    Three steps, zero friction.
                  </h2>
                  <p
                    style={{
                      margin: "12px auto 0",
                      maxWidth: 580,
                      fontSize: 16,
                      fontWeight: 500,
                      color: "#52525b",
                      lineHeight: 1.6,
                    }}
                  >
                    Create freely on our infinite canvas. Pay only for the exact premium features you use, settled in real-time.
                  </p>
                </div>

                <div
                  className="hero-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 32,
                  }}
                >
                  {[
                    {
                      step: "01",
                      title: "Create on the canvas",
                      desc: "Drop rectangles, circles, arrows, and text. Pan and zoom an infinite workspace. Everything here is completely free — no limits, no timers.",
                      color: "#dbeafe",
                      borderCol: "#3b82f6",
                      icon: <Palette size={24} color="#1d4ed8" />,
                      shadow: "8px 8px 0px #1d4ed8",
                    },
                    {
                      step: "02",
                      title: "AI Design Review",
                      desc: "Our layout agent scans your canvas, aligns elements to an 8pt grid, and fixes color contrast violations. Costs 0.01 USDC per execution.",
                      color: "#fef08a",
                      borderCol: "#ca8a04",
                      icon: <Sparkles size={24} color="#a16207" />,
                      shadow: "8px 8px 0px #a16207",
                    },
                    {
                      step: "03",
                      title: "Export Clean SVG",
                      desc: "One click generates a clean, scalable SVG file ready for production handoff. The 0.05 USDC fee is verified on-chain instantly.",
                      color: "#bbf7d0",
                      borderCol: "#16a34a",
                      icon: <Download size={24} color="#15803d" />,
                      shadow: "8px 8px 0px #15803d",
                    },
                  ].map((card) => (
                    <motion.div
                      key={card.step}
                      whileHover={{ y: -8, scale: 1.01, rotate: card.step === "02" ? 0.5 : -0.5 }}
                      style={{
                        background: "#fff",
                        border: "3px solid #0a0a0a",
                        boxShadow: "8px 8px 0px #0a0a0a",
                        padding: 32,
                        display: "flex",
                        flexDirection: "column",
                        gap: 20,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {/* Top bar with Step & Icon */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 900,
                            fontSize: 16,
                            color: "#a1a1aa",
                          }}
                        >
                          /{card.step}
                        </span>
                        <div
                          style={{
                            background: card.color,
                            padding: 10,
                            border: "2px solid #0a0a0a",
                            boxShadow: "3px 3px 0px #0a0a0a",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {card.icon}
                        </div>
                      </div>

                      {/* Content */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: 22,
                            fontWeight: 800,
                            letterSpacing: "-0.02em",
                            color: "#0a0a0a",
                          }}
                        >
                          {card.title}
                        </h3>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 15,
                            fontWeight: 500,
                            color: "#52525b",
                            lineHeight: 1.6,
                          }}
                        >
                          {card.desc}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            {/* ══════════ PRICING ══════════ */}
            <section
              id="pricing"
              style={{
                background: "linear-gradient(to bottom, #0a0a0c 0%, #121216 100%)",
                color: "#fafafa",
                borderBottom: "3px solid #0a0a0a",
                position: "relative",
              }}
            >
              <div
                style={{
                  maxWidth: 1200,
                  margin: "0 auto",
                  padding: "80px 32px",
                }}
              >
                <div style={{ textAlign: "center", marginBottom: 56 }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "#fef08a",
                      color: "#854d0e",
                      padding: "6px 12px",
                      border: "2px solid #facc15",
                      fontSize: 12,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 16,
                    }}
                  >
                    <Coins size={13} /> Transparent Pricing
                  </div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 44,
                      fontWeight: 900,
                      letterSpacing: "-0.03em",
                      color: "#fff",
                    }}
                  >
                    Pay exactly for what you use.
                  </h2>
                  <p
                    style={{
                      margin: "12px auto 0",
                      maxWidth: 500,
                      fontSize: 16,
                      fontWeight: 500,
                      color: "#a1a1aa",
                      lineHeight: 1.6,
                    }}
                  >
                    No subscriptions. No seat fees. All features settled directly on-chain via USDC micropayments.
                  </p>
                </div>

                <div
                  className="hero-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 32,
                    alignItems: "stretch",
                  }}
                >
                  {[
                    {
                      name: "Core Workspace",
                      price: "Free forever",
                      desc: "Complete infinite canvas utility with standard shape editing tools.",
                      features: [
                        "Infinite canvas with pan & zoom",
                        "Shapes, arrows, text tools",
                        "Unlimited projects",
                        "No watermarks",
                      ],
                      bg: "#18181b",
                      border: "3px solid #27272a",
                      accent: "#fafafa",
                      shadow: "8px 8px 0px #27272a",
                      highlight: false,
                    },
                    {
                      name: "AI Agent Review",
                      price: "0.01 USDC",
                      features: [
                        "8pt grid auto-alignment",
                        "Color contrast audit (WCAG)",
                        "Font scale normalization",
                        "Instant layout feedback",
                      ],
                      desc: "Automated agent audits your layout and alignments in real time.",
                      bg: "#facc15",
                      border: "3px solid #0a0a0a",
                      accent: "#0a0a0a",
                      shadow: "8px 8px 0px #facc15",
                      highlight: true,
                    },
                    {
                      name: "Asset Export",
                      price: "0.05 USDC",
                      features: [
                        "Production-ready SVG output",
                        "On-chain receipt verification",
                        "Instant file download",
                        "Batch export (coming soon)",
                      ],
                      desc: "Download production-ready vector assets directly to your computer.",
                      bg: "#18181b",
                      border: "3px solid #27272a",
                      accent: "#fafafa",
                      shadow: "8px 8px 0px #27272a",
                      highlight: false,
                    },
                  ].map((tier) => (
                    <motion.div
                      key={tier.name}
                      whileHover={{ y: -8, scale: 1.02 }}
                      style={{
                        background: tier.bg,
                        color: tier.accent,
                        border: tier.border,
                        boxShadow: tier.shadow,
                        padding: 36,
                        display: "flex",
                        flexDirection: "column",
                        gap: 24,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {tier.highlight && (
                        <div
                          style={{
                            position: "absolute",
                            top: 18,
                            right: -32,
                            background: "#0a0a0a",
                            color: "#facc15",
                            fontSize: 9,
                            fontWeight: 900,
                            padding: "6px 36px",
                            transform: "rotate(45deg)",
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            border: "1.5px solid #facc15",
                          }}
                        >
                          Recommended
                        </div>
                      )}

                      <div>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: 12,
                            textTransform: "uppercase",
                            letterSpacing: "0.12em",
                            color: tier.highlight ? "#0a0a0a" : "#71717a",
                            marginBottom: 4,
                          }}
                        >
                          {tier.name}
                        </div>
                        <div
                          style={{
                            fontSize: 32,
                            fontWeight: 900,
                            letterSpacing: "-0.03em",
                            display: "flex",
                            alignItems: "baseline",
                            gap: 4,
                          }}
                        >
                          {tier.price}
                        </div>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: tier.highlight ? "#3f3f46" : "#a1a1aa",
                            marginTop: 10,
                            lineHeight: 1.5,
                          }}
                        >
                          {tier.desc}
                        </p>
                      </div>

                      <div
                        style={{
                          height: 1,
                          background: tier.highlight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.1)",
                        }}
                      />

                      <ul
                        style={{
                          margin: 0,
                          padding: 0,
                          listStyle: "none",
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                          flex: 1,
                        }}
                      >
                        {tier.features.map((f) => (
                          <li
                            key={f}
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <CheckCircle2
                              size={16}
                              color={tier.highlight ? "#0a0a0a" : "#4ade80"}
                              style={{ flexShrink: 0 }}
                            />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            {/* ══════════ TRUST / TECH STRIP ══════════ */}
            <section
              style={{
                borderBottom: "3px solid #0a0a0a",
                background: "#fff",
                position: "relative",
              }}
            >
              <div
                style={{
                  maxWidth: 1200,
                  margin: "0 auto",
                  padding: "80px 32px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 48,
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "#a78bfa",
                      color: "#3b0764",
                      padding: "6px 12px",
                      border: "2px solid #0a0a0a",
                      fontSize: 12,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 16,
                      transform: "rotate(0.5deg)",
                    }}
                  >
                    <Lock size={13} /> Architecture
                  </div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 36,
                      fontWeight: 900,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Built on open Web3 standards.
                  </h2>
                </div>

                <div
                  className="hero-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 32,
                    width: "100%",
                  }}
                >
                  {[
                    {
                      title: "x402 Micropayments",
                      desc: "Standardized off-chain authorization format linked with on-chain batch settlements.",
                      detail: "Circle's Developer Gateway tracks buyer session balances off-chain, verifying payment signatures dynamically.",
                      bg: "rgba(167,139,250,0.06)",
                      border: "2px dashed #a78bfa",
                      icon: <Zap size={22} color="#a78bfa" />,
                    },
                    {
                      title: "EIP-712 Signatures",
                      desc: "Secure cryptographic signatures matching typed structured data in your wallet.",
                      detail: "Buyers authorize maximum limits with standard, readable transactions that require zero gas fees from the wallet.",
                      bg: "rgba(56,189,248,0.06)",
                      border: "2px dashed #38bdf8",
                      icon: <Lock size={22} color="#38bdf8" />,
                    },
                    {
                      title: "Arc Testnet (L2)",
                      desc: "High-speed layer-2 blockchain ensuring sub-second finality and receipts.",
                      detail: "Payments are reliced and batched to Arc's EVM execution environment, ensuring immutable billing traces.",
                      bg: "rgba(74,222,128,0.06)",
                      border: "2px dashed #4ade80",
                      icon: <Grid3x3 size={22} color="#4ade80" />,
                    },
                  ].map((tech) => (
                    <div
                      key={tech.title}
                      style={{
                        background: tech.bg,
                        border: tech.border,
                        padding: 28,
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            background: "#0a0a0a",
                            padding: 8,
                            borderRadius: 6,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {tech.icon}
                        </div>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: 16,
                            fontWeight: 800,
                            color: "#0a0a0a",
                          }}
                        >
                          {tech.title}
                        </h4>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#3f3f46",
                          lineHeight: 1.5,
                        }}
                      >
                        {tech.desc}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          fontWeight: 500,
                          color: "#71717a",
                          lineHeight: 1.5,
                        }}
                      >
                        {tech.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ══════════ BOTTOM CTA ══════════ */}
            <section
              style={{
                background: "#facc15",
                borderBottom: "3px solid #0a0a0a",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  maxWidth: 700,
                  margin: "0 auto",
                  padding: "56px 32px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 20,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 36, fontWeight: 900, letterSpacing: "-0.03em", color: "#0a0a0a" }}>
                  Ready to create?
                </h2>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#3f3f46", maxWidth: 440, lineHeight: 1.6 }}>
                  Connect your wallet and start building on the infinite canvas. Your first design is on us.
                </p>
                {account ? (
                  <button
                    onClick={() => setView("canvas")}
                    className="neo-btn neo-btn-dark"
                    style={{ fontSize: 18, padding: "18px 40px" }}
                  >
                    <Sparkles size={20} />
                    Launch Workspace
                  </button>
                ) : (
                  <button
                    onClick={connectWallet}
                    disabled={connecting}
                    className="neo-btn neo-btn-dark"
                    style={{ fontSize: 18, padding: "18px 40px" }}
                  >
                    {connecting ? (
                      <>
                        <Loader2 size={22} className="animate-spin" />
                        Connecting Wallet...
                      </>
                    ) : (
                      <>
                        <Wallet size={20} />
                        Connect Wallet
                      </>
                    )}
                  </button>
                )}
              </div>
            </section>

            {/* ── Footer ── */}
            <footer
              style={{
                borderTop: "3px solid #0a0a0a",
                background: "#fff",
                padding: "40px 32px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
                <a href="#features" style={{ color: "#0a0a0a", fontWeight: 800, textDecoration: "none", fontSize: 13 }}>Features</a>
                <a href="#pricing" style={{ color: "#0a0a0a", fontWeight: 800, textDecoration: "none", fontSize: 13 }}>Pricing</a>
                <a href="https://github.com/circlefin/arc-nanopayments" target="_blank" rel="noreferrer" style={{ color: "#0a0a0a", fontWeight: 800, textDecoration: "none", fontSize: 13 }}>Docs</a>
                <a href="https://faucet.circle.com/" target="_blank" rel="noreferrer" style={{ color: "#0a0a0a", fontWeight: 800, textDecoration: "none", fontSize: 13 }}>Faucet</a>
              </div>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#71717a" }}>
                Fraction © 2026 — Powered by Circle Developer Gateways & Arc Protocol
              </div>
            </footer>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════ */}
        {/*         VIEW 2 — CANVAS WORKSPACE           */}
        {/* ════════════════════════════════════════════ */}
        {view === "canvas" && (
          <motion.div
            key="canvas"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="canvas-surface"
            style={{
              width: "100%",
              height: "100vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* ── Top bar ── */}
            <header
              className="canvas-panel"
              style={{
                height: 56,
                padding: "0 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
                zIndex: 100,
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
              }}
            >
              {/* Logo */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    background: "#facc15",
                    padding: 5,
                    borderRadius: 8,
                    display: "flex",
                  }}
                >
                  <Sparkles size={16} color="#000" fill="#000" />
                </div>
                <span style={{ fontWeight: 800, fontSize: 15 }}>
                  Fraction{" "}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 400,
                      color: "#18181b",
                      background: "#e4e4e7",
                      padding: "2px 8px",
                      borderRadius: 4,
                      marginLeft: 6,
                    }}
                  >
                    Workspace
                  </span>
                </span>
              </div>

              {/* Center title */}
              <input
                type="text"
                value={canvasName}
                onChange={(e) => setCanvasName(e.target.value)}
                placeholder="Name your canvas..."
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#18181b",
                  background: "#f4f4f5",
                  padding: "5px 12px",
                  borderRadius: 8,
                  border: "1px solid #e4e4e7",
                  textAlign: "center",
                  width: 200,
                  outline: "none",
                  transition: "all 0.15s",
                }}
                onFocus={(e) => {
                  e.target.style.border = "1px solid #7c3aed";
                  e.target.style.background = "#ffffff";
                }}
                onBlur={(e) => {
                  e.target.style.border = "1px solid #e4e4e7";
                  e.target.style.background = "#f4f4f5";
                }}
              />

              {/* Right: wallet + export */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Profile Widget Container */}
                <div style={{ position: "relative" }}>
                  {/* Profile Trigger Button */}
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 12px",
                      borderRadius: 10,
                      background: profileDropdownOpen ? "#f4f4f5" : "rgba(0,0,0,0.03)",
                      border: "1px solid #e4e4e7",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#18181b",
                      transition: "all 0.15s",
                    }}
                  >
                    {/* Tiny avatar circle with gradient generated from address */}
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: `linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)`,
                        boxShadow: "0 0 4px rgba(124,58,237,0.3)",
                      }}
                    />
                    <span>
                      {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Not Connected"}
                    </span>
                    <span style={{ fontSize: 10, opacity: 0.6 }}>▼</span>
                  </button>

                  {/* Profile Dropdown Card */}
                  {profileDropdownOpen && (
                    <div
                      className="canvas-panel"
                      style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        right: 0,
                        width: 260,
                        borderRadius: 14,
                        padding: 16,
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                        boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                        zIndex: 200,
                      }}
                    >
                      {/* Dropdown Header / Address */}
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#71717a", textTransform: "uppercase", marginBottom: 4 }}>Account</div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ fontFamily: "monospace", fontSize: 12, color: "#18181b", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>
                            {account}
                          </span>
                          <button
                            onClick={() => {
                              if (account) {
                                navigator.clipboard.writeText(account);
                                showToast("Wallet address copied!", "success");
                              }
                            }}
                            title="Copy Wallet Address"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 2,
                              color: "#71717a",
                              display: "flex",
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                          </button>
                        </div>
                      </div>

                      {/* Network status */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "#4ade80",
                            boxShadow: "0 0 6px #4ade80",
                          }}
                        />
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#52525b" }}>
                          Arc Testnet (Connected)
                        </span>
                      </div>

                      {/* Balance section */}
                      <div style={{ background: "#f4f4f5", borderRadius: 8, padding: 12, border: "1px solid #e4e4e7" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#71717a", textTransform: "uppercase", marginBottom: 2 }}>USDC Balance</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Coins size={15} color="#facc15" />
                          <span style={{ fontSize: 18, fontWeight: 800, color: "#18181b" }}>
                            {balance} USDC
                          </span>
                        </div>
                      </div>

                      {/* Faucet Link & Sign out */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <a
                          href="https://faucet.circle.com/"
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            background: "#ffffff",
                            border: "1px solid #e4e4e7",
                            padding: "8px 12px",
                            borderRadius: 8,
                            color: "#18181b",
                            fontSize: 12,
                            fontWeight: 700,
                            textDecoration: "none",
                            textAlign: "center",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#f4f4f5";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "#ffffff";
                          }}
                        >
                          <Coins size={12} /> Get Test USDC Faucet
                        </a>
                        
                        <button
                          onClick={() => {
                            handleLogout();
                            showToast("Logged out successfully!", "info");
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            background: "rgba(239, 68, 68, 0.08)",
                            color: "#ef4444",
                            border: "1px solid rgba(239, 68, 68, 0.2)",
                            padding: "8px 12px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)";
                          }}
                        >
                          <LogOut size={12} /> Disconnect Wallet
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Export button */}
                <button
                  onClick={handleExport}
                  disabled={exporting || !account}
                  style={{
                    height: 36,
                    padding: "0 14px",
                    borderRadius: 8,
                    background: "#facc15",
                    color: "#000",
                    fontWeight: 700,
                    fontSize: 13,
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    boxShadow: "0 0 14px rgba(250,204,21,0.2)",
                    opacity: exporting || !account ? 0.5 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  {exporting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> TX...
                    </>
                  ) : (
                    <>
                      <Download size={14} /> EXPORT ($0.05)
                    </>
                  )}
                </button>
              </div>
            </header>

            {/* ── Canvas body ── */}
            <div
              style={{
                flex: 1,
                display: "flex",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Left tools */}
              <div
                className="canvas-panel"
                style={{
                  position: "absolute",
                  top: 20,
                  left: 20,
                  zIndex: 100,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  padding: 6,
                  borderRadius: 14,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                }}
              >
                {(
                  [
                    ["select", MousePointer, "Select (V)"],
                    ["hand", Hand, "Pan (H)"],
                    null,
                    ["rectangle", Square, "Rectangle (R)"],
                    ["ellipse", CircleIcon, "Circle (O)"],
                    ["arrow", ArrowUpRight, "Arrow (A)"],
                    ["line", Slash, "Line (L)"],
                    ["draw", PenTool, "Pen (P)"],
                    ["text", Type, "Text (T)"],
                    ["note", StickyNote, "Sticky Note (S)"],
                    ["frame", Frame, "Frame (F)"],
                    null,
                    ["eraser", Eraser, "Eraser (E)"],
                    ["laser", Zap, "Laser (L)"],
                  ] as (readonly [string, any, string] | null)[]
                ).map((item, i) => {
                  if (item === null) {
                    return (
                      <div
                        key={i}
                        style={{
                          height: 1,
                          background: "#27272a",
                          margin: "4px 6px",
                        }}
                      />
                    );
                  }
                  const [toolName, Icon, title] = item;
                  return (
                    <button
                      key={toolName}
                      onClick={() => selectTool(toolName)}
                      title={title}
                      className={
                        activeTool === toolName
                          ? "canvas-btn-active"
                          : "canvas-btn-idle"
                      }
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.15s",
                      }}
                    >
                      <Icon size={18} />
                    </button>
                  );
                })}

                {/* Upload Image Tool */}
                <input
                  type="file"
                  accept="image/*"
                  id="image-upload-input"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
                <div
                  style={{
                    height: 1,
                    background: "#27272a",
                    margin: "4px 6px",
                  }}
                />
                <button
                  onClick={() => document.getElementById("image-upload-input")?.click()}
                  title="Upload Image"
                  className="canvas-btn-idle"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s",
                  }}
                >
                  <ImageIcon size={18} />
                </button>
              </div>

              {/* custom canvas */}
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "#09090b",
                }}
              >
                <CustomCanvas
                  shapes={shapes}
                  setShapes={setShapes}
                  assets={assets}
                  selectedShapeIds={selectedShapeIds}
                  setSelectedShapeIds={setSelectedShapeIds}
                  activeTool={activeTool}
                  setActiveTool={setActiveTool}
                  pan={pan}
                  setPan={setPan}
                  zoom={zoom}
                  setZoom={setZoom}
                />
              </div>

              {/* Properties Panel (Figma style) */}
              {selectedShapes.length > 0 && (
                <div
                  className="canvas-panel"
                  style={{
                    position: "absolute",
                    top: 20,
                    right: aiPanelOpen ? 380 : 20,
                    width: 260,
                    zIndex: 90,
                    borderRadius: 14,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                    maxHeight: "calc(100% - 40px)",
                    overflowY: "auto",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e4e4e7", paddingBottom: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#71717a" }}>
                      Properties
                    </h3>
                    <span style={{ fontSize: 10, background: "#facc15", padding: "2px 6px", borderRadius: 4, color: "#18181b", fontWeight: 700 }}>
                      {selectedShapes[0].type}
                    </span>
                  </div>

                  {(() => {
                    const shape = selectedShapes[0];
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {/* Geometry Group */}
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 700, color: "#71717a", display: "block", marginBottom: 6, textTransform: "uppercase" }}>Geometry</label>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <div>
                              <div style={{ fontSize: 9, color: "#71717a", marginBottom: 3 }}>X Position</div>
                              <input
                                type="number"
                                value={Math.round(shape.x)}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  editor?.updateShapes([{ id: shape.id, x: val }]);
                                }}
                                style={{ width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: 6, color: "#fafafa", padding: "6px 8px", fontSize: 12 }}
                              />
                            </div>
                            <div>
                              <div style={{ fontSize: 9, color: "#71717a", marginBottom: 3 }}>Y Position</div>
                              <input
                                type="number"
                                value={Math.round(shape.y)}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  editor?.updateShapes([{ id: shape.id, y: val }]);
                                }}
                                style={{ width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: 6, color: "#fafafa", padding: "6px 8px", fontSize: 12 }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Width & Height Group */}
                        {shape.props && (shape.props.w !== undefined || shape.props.h !== undefined) && (
                          <div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              {shape.props.w !== undefined && (
                                <div>
                                  <div style={{ fontSize: 9, color: "#71717a", marginBottom: 3 }}>Width (W)</div>
                                  <input
                                    type="number"
                                    value={Math.round(shape.props.w)}
                                    onChange={(e) => {
                                      const val = Math.max(1, Number(e.target.value));
                                      editor?.updateShapes([{ id: shape.id, props: { ...shape.props, w: val } }]);
                                    }}
                                    style={{ width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: 6, color: "#fafafa", padding: "6px 8px", fontSize: 12 }}
                                  />
                                </div>
                              )}
                              {shape.props.h !== undefined && (
                                <div>
                                  <div style={{ fontSize: 9, color: "#71717a", marginBottom: 3 }}>Height (H)</div>
                                  <input
                                    type="number"
                                    value={Math.round(shape.props.h)}
                                    onChange={(e) => {
                                      const val = Math.max(1, Number(e.target.value));
                                      editor?.updateShapes([{ id: shape.id, props: { ...shape.props, h: val } }]);
                                    }}
                                    style={{ width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: 6, color: "#fafafa", padding: "6px 8px", fontSize: 12 }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Color Swatch Palette */}
                        {shape.props && shape.props.color !== undefined && (
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 700, color: "#71717a", display: "block", marginBottom: 8, textTransform: "uppercase" }}>Color Palette</label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, background: "#09090b", border: "1px solid #27272a", borderRadius: 8, padding: 10 }}>
                              {["black", "grey", "blue", "light-blue", "green", "light-green", "yellow", "orange", "red", "light-red", "violet", "light-violet", "turquoise"].map((colorName) => {
                                const hex = getCanvasColorValue(colorName);
                                const isSelected = shape.props.color === colorName;
                                return (
                                  <button
                                    key={colorName}
                                    onClick={() => {
                                      editor?.updateShapes([{ id: shape.id, props: { ...shape.props, color: colorName } }]);
                                    }}
                                    title={colorName}
                                    style={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: "50%",
                                      background: hex,
                                      border: "1.5px solid rgba(255,255,255,0.2)",
                                      boxShadow: isSelected ? "0 0 0 2px #a855f7" : "none",
                                      transform: isSelected ? "scale(1.15)" : "none",
                                      cursor: "pointer",
                                      padding: 0,
                                      transition: "all 0.15s",
                                      outline: "none"
                                    }}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Fill Selector */}
                        {shape.props && shape.props.fill !== undefined && (
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 700, color: "#71717a", display: "block", marginBottom: 6, textTransform: "uppercase" }}>Fill Mode</label>
                            <select
                              value={shape.props.fill}
                              onChange={(e) => {
                                editor?.updateShapes([{ id: shape.id, props: { ...shape.props, fill: e.target.value } }]);
                              }}
                              style={{ width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: 6, color: "#fafafa", padding: "6px 8px", fontSize: 12 }}
                            >
                              {["none", "semi", "solid", "pattern"].map((fill) => (
                                <option key={fill} value={fill}>{fill}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Stroke Width Selector */}
                        {shape.props && ["rectangle", "ellipse", "line", "arrow", "draw"].includes(shape.type) && (
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 700, color: "#71717a", display: "block", marginBottom: 6, textTransform: "uppercase" }}>Stroke Width</label>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                              {[
                                { label: "2px", val: 2 },
                                { label: "4px", val: 4 },
                                { label: "8px", val: 8 },
                              ].map((opt) => {
                                const isSelected = (shape.props.strokeWidth ?? 2) === opt.val;
                                return (
                                  <button
                                    key={opt.val}
                                    onClick={() => {
                                      editor?.updateShapes([{ id: shape.id, props: { ...shape.props, strokeWidth: opt.val } }]);
                                    }}
                                    style={{
                                      background: isSelected ? "#a855f7" : "#09090b",
                                      color: isSelected ? "#ffffff" : "#a1a1aa",
                                      border: "1px solid #27272a",
                                      borderRadius: 6,
                                      padding: "6px 0",
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      transition: "all 0.15s",
                                    }}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Border/Stroke Style Selector */}
                        {shape.props && ["rectangle", "ellipse", "line", "arrow", "draw"].includes(shape.type) && (
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 700, color: "#71717a", display: "block", marginBottom: 6, textTransform: "uppercase" }}>Border Style</label>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                              {[
                                { label: "Solid", val: "solid" },
                                { label: "Dashed", val: "dashed" },
                                { label: "Dotted", val: "dotted" },
                              ].map((opt) => {
                                const isSelected = (shape.props.strokeStyle ?? "solid") === opt.val;
                                return (
                                  <button
                                    key={opt.val}
                                    onClick={() => {
                                      editor?.updateShapes([{ id: shape.id, props: { ...shape.props, strokeStyle: opt.val } }]);
                                    }}
                                    style={{
                                      background: isSelected ? "#a855f7" : "#09090b",
                                      color: isSelected ? "#ffffff" : "#a1a1aa",
                                      border: "1px solid #27272a",
                                      borderRadius: 6,
                                      padding: "6px 0",
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      transition: "all 0.15s",
                                    }}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Opacity Slider */}
                        {shape.props && (
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                              <label style={{ fontSize: 10, fontWeight: 700, color: "#71717a", textTransform: "uppercase" }}>Opacity</label>
                              <span style={{ fontSize: 10, color: "#a1a1aa", fontWeight: 700 }}>
                                {Math.round((shape.props.opacity ?? 1) * 100)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0.1"
                              max="1.0"
                              step="0.05"
                              value={shape.props.opacity ?? 1}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                editor?.updateShapes([{ id: shape.id, props: { ...shape.props, opacity: val } }]);
                              }}
                              style={{ width: "100%", accentColor: "#a855f7", background: "#27272a", height: 4, borderRadius: 2, outline: "none", cursor: "pointer" }}
                            />
                          </div>
                        )}

                        {/* Corner Radius Slider (Rectangle only) */}
                        {shape.type === "rectangle" && (
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                              <label style={{ fontSize: 10, fontWeight: 700, color: "#71717a", textTransform: "uppercase" }}>Corner Radius</label>
                              <span style={{ fontSize: 10, color: "#a1a1aa", fontWeight: 700 }}>
                                {shape.props.rx ?? 0}px
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="40"
                              step="1"
                              value={shape.props.rx ?? 0}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                editor?.updateShapes([{ id: shape.id, props: { ...shape.props, rx: val } }]);
                              }}
                              style={{ width: "100%", accentColor: "#a855f7", background: "#27272a", height: 4, borderRadius: 2, outline: "none", cursor: "pointer" }}
                            />
                          </div>
                        )}

                        {/* Text Editor */}
                        {shape.props && shape.props.text !== undefined && (
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 700, color: "#71717a", display: "block", marginBottom: 6, textTransform: "uppercase" }}>Text</label>
                            <textarea
                              value={shape.props.text}
                              onChange={(e) => {
                                editor?.updateShapes([{ id: shape.id, props: { ...shape.props, text: e.target.value } }]);
                              }}
                              rows={3}
                              style={{ width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: 6, color: "#fafafa", padding: "6px 8px", fontSize: 12, resize: "vertical", fontFamily: "sans-serif" }}
                            />
                          </div>
                        )}

                        {/* Font Size Dropdown */}
                        {shape.props && ["text", "note"].includes(shape.type) && (
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 700, color: "#71717a", display: "block", marginBottom: 6, textTransform: "uppercase" }}>Font Size</label>
                            <select
                              value={shape.props.fontSize ?? (shape.type === "text" ? 16 : 13)}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                editor?.updateShapes([{ id: shape.id, props: { ...shape.props, fontSize: val } }]);
                              }}
                              style={{ width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: 6, color: "#fafafa", padding: "6px 8px", fontSize: 12 }}
                            >
                              {[12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48].map((size) => (
                                <option key={size} value={size}>{size}px</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Font Family Selector */}
                        {shape.props && shape.props.font !== undefined && (
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 700, color: "#71717a", display: "block", marginBottom: 6, textTransform: "uppercase" }}>Font</label>
                            <select
                              value={shape.props.font}
                              onChange={(e) => {
                                editor?.updateShapes([{ id: shape.id, props: { ...shape.props, font: e.target.value } }]);
                              }}
                              style={{ width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: 6, color: "#fafafa", padding: "6px 8px", fontSize: 12 }}
                            >
                              {["sans", "serif", "mono", "draw"].map((font) => (
                                <option key={font} value={font}>{font}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Shaders / CSS Filters Selector */}
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 700, color: "#71717a", display: "block", marginBottom: 6, textTransform: "uppercase" }}>Shaders / Visual Effects</label>
                          <select
                            value={shape.meta?.filter || "none"}
                            onChange={(e) => {
                              editor?.updateShapes([{ id: shape.id, meta: { ...shape.meta, filter: e.target.value } }]);
                            }}
                            style={{ width: "100%", background: "#09090b", border: "1px solid #27272a", borderRadius: 6, color: "#fafafa", padding: "6px 8px", fontSize: 12 }}
                          >
                            <option value="none">None</option>
                            <option value="grayscale(100%)">Grayscale</option>
                            <option value="sepia(100%)">Sepia</option>
                            <option value="invert(100%)">Invert</option>
                            <option value="blur(4px)">Soft Blur</option>
                            <option value="blur(10px)">Heavy Blur</option>
                            <option value="hue-rotate(90deg)">Hue Shift</option>
                            <option value="drop-shadow(0 0 10px rgba(250,204,21,0.8))">Neon Glow Yellow</option>
                            <option value="drop-shadow(0 0 10px rgba(168,85,247,0.8))">Neon Glow Purple</option>
                            <option value="drop-shadow(0 0 10px rgba(239,68,68,0.8))">Neon Glow Red</option>
                            <option value="contrast(150%) brightness(120%)">Vibrant Light</option>
                          </select>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Right panel — KIRO AI Agent */}
              <AnimatePresence>
                {aiPanelOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: 300, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 300, scale: 0.95 }}
                    className="canvas-panel"
                    style={{
                      position: "absolute",
                      top: 20,
                      right: 20,
                      bottom: 20,
                      width: 340,
                      zIndex: 100,
                      borderRadius: 14,
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        padding: "14px 18px",
                        borderBottom: "1px solid #e4e4e7",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "rgba(0,0,0,0.03)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <img src="/kiro.png" style={{ width: 24, height: 24, borderRadius: "50%", border: "1.5px solid #a78bfa" }} alt="KIRO" />
                        <span style={{ fontWeight: 800, fontSize: 13 }}>KIRO AI Agent</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "monospace", color: "#a78bfa", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)", padding: "2px 8px", borderRadius: 4 }}>
                          llama-3
                        </span>
                        <button
                          onClick={() => setAiPanelOpen(false)}
                          style={{ background: "none", border: "none", color: "#71717a", cursor: "pointer", fontSize: 14, fontWeight: 700 }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Chat Messages */}
                    <div style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
                      {chatMessages.length === 0 ? (
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, textAlign: "center", padding: 24 }}>
                          <MessageSquare size={32} color="#a78bfa" style={{ opacity: 0.5 }} />
                          <div>
                            <h4 style={{ margin: "0 0 6px 0", fontSize: 14, fontWeight: 800 }}>Chat with KIRO</h4>
                            <p style={{ margin: 0, fontSize: 12, color: "#a1a1aa", lineHeight: 1.5 }}>
                              I can review alignments, contrast, colors, and help you structure your canvas. Each prompt triggers a 0.01 USDC micro-settlement.
                            </p>
                          </div>
                          <button
                            onClick={() => sendChatMessage("Audit my layout alignments")}
                            disabled={aiLoading}
                            style={{
                              background: "#f4f4f5",
                              color: "#18181b",
                              border: "1px solid #e4e4e7",
                              padding: "8px 16px",
                              fontSize: 12,
                              fontWeight: 700,
                              borderRadius: 8,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            🔍 Quick Layout Audit
                          </button>
                        </div>
                      ) : (
                        chatMessages.map((msg, i) => (
                          <div
                            key={i}
                            style={{
                              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                              maxWidth: "85%",
                              background: msg.role === "user" ? "#facc15" : "#f4f4f5",
                              color: msg.role === "user" ? "#0a0a0a" : "#18181b",
                              padding: "10px 14px",
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: msg.role === "user" ? 700 : 500,
                              lineHeight: 1.5,
                              wordBreak: "break-word",
                            }}
                          >
                            {msg.role === "user" ? (
                              msg.content
                            ) : (
                              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                            )}
                          </div>
                        ))
                      )}

                      {/* Web3 Log Status trace */}
                      {aiLogs.length > 0 && (
                        <div style={{ fontFamily: "monospace", fontSize: 9, color: "#71717a", background: "#f4f4f5", padding: 10, borderRadius: 8, border: "1px solid #e4e4e7", marginTop: 10 }}>
                          <div style={{ fontWeight: 700, borderBottom: "1px solid #e4e4e7", paddingBottom: 4, marginBottom: 4 }}>WEB3 TRANSACTION TRACE</div>
                          {aiLogs.map((logLine, idx) => (
                            <div key={idx} style={{ color: "#18181b", lineHeight: 1.4 }}>{logLine}</div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Chat Input */}
                    <div style={{ padding: 14, borderTop: "1px solid #e4e4e7", background: "rgba(0,0,0,0.02)" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          type="text"
                          placeholder="Type message to KIRO..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !aiLoading) sendChatMessage();
                          }}
                          disabled={aiLoading}
                          style={{
                            flex: 1,
                            background: "#ffffff",
                            border: "1px solid #e4e4e7",
                            borderRadius: 8,
                            color: "#18181b",
                            padding: "8px 12px",
                            fontSize: 12,
                          }}
                        />
                        <button
                          onClick={() => sendChatMessage()}
                          disabled={aiLoading || !chatInput.trim()}
                          style={{
                            background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)",
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            padding: "0 14px",
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: "pointer",
                            opacity: aiLoading || !chatInput.trim() ? 0.5 : 1,
                          }}
                        >
                          Send
                        </button>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, fontSize: 10, color: "#71717a" }}>
                        <span>Charge per prompt:</span>
                        <span style={{ color: "#facc15", fontWeight: 700 }}>0.01 USDC</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Floating KIRO Chat Button */}
              {!aiPanelOpen && (
                <motion.button
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={() => setAiPanelOpen(true)}
                  style={{
                    position: "absolute",
                    bottom: 24,
                    right: 24,
                    width: 58,
                    height: 58,
                    borderRadius: 9999,
                    background: "#facc15",
                    border: "3px solid #0a0a0a",
                    boxShadow: "4px 4px 0px #0a0a0a",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    cursor: "pointer",
                    zIndex: 1000,
                    overflow: "hidden",
                    padding: 0,
                  }}
                  title="Chat with KIRO"
                >
                  <img src="/kiro.png" style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="KIRO" />
                </motion.button>
              )}
            </div>

            {/* Export overlay */}
            <AnimatePresence>
              {exporting && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,0.8)",
                    zIndex: 9998,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <div
                    className="canvas-panel"
                    style={{
                      padding: 28,
                      borderRadius: 16,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 16,
                      maxWidth: 360,
                      textAlign: "center",
                      boxShadow: "0 16px 48px rgba(0,0,0,0.15)",
                    }}
                  >
                    <Loader2
                      size={36}
                      color="#facc15"
                      className="animate-spin"
                    />
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontWeight: 800,
                          fontSize: 16,
                          color: "#18181b",
                        }}
                      >
                        Verifying Transaction
                      </h3>
                      <p
                        style={{
                          margin: "8px 0 0",
                          fontSize: 13,
                          color: "#a1a1aa",
                        }}
                      >
                        {exportStep}
                      </p>
                    </div>
                    {exportTxHash && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#facc15",
                          fontFamily: "monospace",
                          background: "#18181b",
                          padding: "6px 12px",
                          borderRadius: 6,
                          border: "1px solid #27272a",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        Tx: {exportTxHash.slice(0, 12)}...{exportTxHash.slice(-8)}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Wallet Selection Modal (EIP-6963) ── */}
      <AnimatePresence>
        {walletModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.85)",
              zIndex: 9999,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backdropFilter: "blur(4px)",
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              style={{
                background: "#fff",
                border: "3px solid #0a0a0a",
                boxShadow: "10px 10px 0px #0a0a0a",
                width: "90%",
                maxWidth: 400,
                padding: 32,
                display: "flex",
                flexDirection: "column",
                gap: 24,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#0a0a0a", letterSpacing: "-0.02em" }}>
                  Select Wallet
                </h3>
                <button
                  onClick={() => setWalletModalOpen(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 20,
                    fontWeight: 800,
                    cursor: "pointer",
                    color: "#a1a1aa",
                  }}
                >
                  ✕
                </button>
              </div>

              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#52525b", lineHeight: 1.5 }}>
                Choose which of your installed browser wallets you'd like to use.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {providers.map((p) => (
                  <button
                    key={p.info.uuid}
                    onClick={() => connectToProvider(p.provider)}
                    style={{
                      background: "#fff",
                      color: "#0a0a0a",
                      border: "3px solid #0a0a0a",
                      boxShadow: "4px 4px 0px #0a0a0a",
                      padding: 16,
                      fontWeight: 800,
                      fontSize: 15,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      textAlign: "left",
                    }}
                  >
                    <img src={p.info.icon} alt={p.info.name} style={{ width: 24, height: 24 }} />
                    <span style={{ color: "#0a0a0a" }}>{p.info.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Export Formats Selection Modal ── */}
      <AnimatePresence>
        {exportFormatsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.85)",
              zIndex: 9999,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backdropFilter: "blur(4px)",
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              style={{
                background: "#fff",
                border: "3px solid #0a0a0a",
                boxShadow: "10px 10px 0px #0a0a0a",
                width: "90%",
                maxWidth: 420,
                padding: 32,
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#0a0a0a", letterSpacing: "-0.02em" }}>
                  Export Formats
                </h3>
                <button
                  onClick={() => setExportFormatsModalOpen(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 20,
                    fontWeight: 800,
                    cursor: "pointer",
                    color: "#a1a1aa",
                  }}
                >
                  ✕
                </button>
              </div>

              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#52525b", lineHeight: 1.5 }}>
                Your export has been successfully paid on-chain! Select a format to download your canvas design:
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* SVG */}
                <button
                  onClick={downloadAsSVG}
                  style={{
                    background: "#fff",
                    color: "#0a0a0a",
                    border: "2px solid #0a0a0a",
                    boxShadow: "3px 3px 0px #0a0a0a",
                    padding: "12px 16px",
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>Download Vector (SVG)</span>
                  <span style={{ fontSize: 10, background: "#f3f4f6", padding: "2px 6px", borderRadius: 4, color: "#4b5563" }}>Scalable</span>
                </button>

                {/* PNG */}
                <button
                  onClick={() => downloadAsImage("png")}
                  style={{
                    background: "#fff",
                    color: "#0a0a0a",
                    border: "2px solid #0a0a0a",
                    boxShadow: "3px 3px 0px #0a0a0a",
                    padding: "12px 16px",
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>Download Image (PNG)</span>
                  <span style={{ fontSize: 10, background: "#f3f4f6", padding: "2px 6px", borderRadius: 4, color: "#4b5563" }}>Transparent</span>
                </button>

                {/* JPEG */}
                <button
                  onClick={() => downloadAsImage("jpeg")}
                  style={{
                    background: "#fff",
                    color: "#0a0a0a",
                    border: "2px solid #0a0a0a",
                    boxShadow: "3px 3px 0px #0a0a0a",
                    padding: "12px 16px",
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>Download Image (JPEG)</span>
                  <span style={{ fontSize: 10, background: "#f3f4f6", padding: "2px 6px", borderRadius: 4, color: "#4b5563" }}>Solid BG</span>
                </button>

                {/* JSON */}
                <button
                  onClick={downloadAsJSON}
                  style={{
                    background: "#fff",
                    color: "#0a0a0a",
                    border: "2px solid #0a0a0a",
                    boxShadow: "3px 3px 0px #0a0a0a",
                    padding: "12px 16px",
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>Download Backup (JSON)</span>
                  <span style={{ fontSize: 10, background: "#f3f4f6", padding: "2px 6px", borderRadius: 4, color: "#4b5563" }}>Editable</span>
                </button>
              </div>

              <button
                onClick={() => setExportFormatsModalOpen(false)}
                style={{
                  background: "#0a0a0a",
                  color: "#fff",
                  border: "none",
                  padding: "12px 24px",
                  fontWeight: 900,
                  fontSize: 14,
                  cursor: "pointer",
                  textAlign: "center",
                  marginTop: 10,
                  borderRadius: 4,
                }}
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
