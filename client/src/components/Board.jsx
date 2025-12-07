import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:3000";
const socket = io(SERVER_URL);

const uid = (p = "") => p + Math.random().toString(36).slice(2, 10);

export default function Board({ roomId = "room1" }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const [shapes, setShapes] = useState([]);
  const [current, setCurrent] = useState(null);
  const drawingRef = useRef(false);

  const [tool, setTool] = useState("select");

  const [strokeColor, setStrokeColor] = useState("#111827");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [showPicker, setShowPicker] = useState(false);

  const [dragInfo, setDragInfo] = useState(null);

  // ⭐ NEW: Text input state
  const [textInput, setTextInput] = useState(null);

  const PALETTE = ["#111827", "#ef4444", "#16a34a", "#2563eb", "#f59e0b", "#6b7280"];


  /* ---------------------- SOCKET ---------------------- */
  useEffect(() => {
    socket.emit("join_room", roomId);

    socket.on("load_shapes", (loaded) => setShapes(Array.isArray(loaded) ? loaded : []));
    socket.on("shape:create", (shape) => setShapes((s) => [...s, shape]));
    socket.on("shape:update", (shape) =>
      setShapes((s) => s.map((x) => (x.id === shape.id ? shape : x)))
    );
    socket.on("shape:delete", (id) =>
      setShapes((s) => s.filter((x) => x.id !== id))
    );
    socket.on("board:clear", () => setShapes([]));

    return () => {
      socket.off("load_shapes");
      socket.off("shape:create");
      socket.off("shape:update");
      socket.off("shape:delete");
      socket.off("board:clear");
    };
  }, [roomId]);


  /* ---------------------- CANVAS SETUP ---------------------- */
  useEffect(() => {
    const c = canvasRef.current;
    c.width = window.innerWidth;
    c.height = window.innerHeight;

    const ctx = c.getContext("2d");
    ctx.lineCap = "round";
    ctxRef.current = ctx;

    const handleResize = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
      renderAll();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => renderAll(), [shapes, current]);


  /* ---------------------- RENDER ---------------------- */
  function renderAll() {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    shapes.forEach((s) => drawShape(ctx, s));
    if (current) drawShape(ctx, current);
  }


  /* ---------------------- DRAW SHAPES ---------------------- */
  function drawShape(ctx, s) {
    ctx.save();
    ctx.strokeStyle = s.color || "#000";
    ctx.fillStyle = s.color || "#000";
    ctx.lineWidth = s.strokeWidth || 2;

    if (s.type === "freehand") {
      ctx.beginPath();
      s.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }

    if (s.type === "rect") {
      ctx.strokeRect(s.x, s.y, s.w, s.h);

      if (s.text) {
        ctx.font = `${s.fontSize || 16}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = s.textColor || s.color;
        ctx.fillText(s.text, s.x + s.w / 2, s.y + s.h / 2, Math.abs(s.w) * 0.9);
      }
    }

    if (s.type === "circle") {
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.r, s.r, 0, 0, Math.PI * 2);
      ctx.stroke();

      if (s.text) {
        ctx.font = `${s.fontSize || 16}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(s.text, s.x, s.y, s.r * 1.6);
      }
    }

    if (s.type === "line") {
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }

    if (s.type === "arrow") {
      drawArrow(ctx, s.x, s.y, s.x2, s.y2);
    }

    if (s.type === "text") {
      ctx.font = `${s.fontSize || 20}px Arial`;
      ctx.fillStyle = s.color;
      ctx.fillText(s.text, s.x, s.y);
    }

    ctx.restore();
  }


  function drawArrow(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const angle = Math.atan2(y2 - y1, x2 - x1);
    const size = 8;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }


  /* ---------------------- HELPERS ---------------------- */
  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function isInsideRect(s, p) {
    return p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h;
  }
  function isInsideCircle(s, p) {
    return Math.hypot(p.x - s.x, p.y - s.y) <= s.r;
  }
  function isInsideText(s, p) {
    return p.x >= s.x - 50 && p.x <= s.x + 50 && p.y >= s.y - 20 && p.y <= s.y + 20;
  }


  /* ---------------------- MOUSE DOWN ---------------------- */
  function handleMouseDown(e) {
    const p = getPos(e);

    /* ----- ERASER ----- */
    if (tool === "erase") {
      for (let i = shapes.length - 1; i >= 0; i--) {
        const s = shapes[i];
        if (
          (s.type === "rect" && isInsideRect(s, p)) ||
          (s.type === "circle" && isInsideCircle(s, p)) ||
          (s.type === "text" && isInsideText(s, p))
        ) {
          socket.emit("shape:delete", { roomId, id: s.id });
          setShapes((x) => x.filter((xx) => xx.id !== s.id));
          return;
        }
      }
      return;
    }

    /* ----- SELECT (DRAG) ----- */
    if (tool === "select") {
      for (let i = shapes.length - 1; i >= 0; i--) {
        const s = shapes[i];

        if (
          (s.type === "rect" && isInsideRect(s, p)) ||
          (s.type === "circle" && isInsideCircle(s, p)) ||
          (s.type === "text" && isInsideText(s, p))
        ) {
          setDragInfo({
            id: s.id,
            offsetX: p.x - s.x,
            offsetY: p.y - s.y,
          });
          return;
        }
      }
      return;
    }

    /* ----- TEXT TOOL — NO PROMPT, DIRECT INPUT BOX ----- */
    if (tool === "text") {
      setTextInput({
        x: p.x,
        y: p.y,
        value: "",
      });
      return;
    }

    /* ----- DRAWING TOOLS ----- */
    drawingRef.current = true;

    if (tool === "freehand") {
      setCurrent({
        id: uid("f_"),
        type: "freehand",
        points: [{ x: p.x, y: p.y }],
        color: strokeColor,
        strokeWidth,
      });
    }

    if (tool === "rect") {
      setCurrent({
        id: uid("r_"),
        type: "rect",
        x: p.x,
        y: p.y,
        w: 0,
        h: 0,
        color: strokeColor,
        strokeWidth,
      });
    }

    if (tool === "circle") {
      setCurrent({
        id: uid("c_"),
        type: "circle",
        x: p.x,
        y: p.y,
        r: 0,
        color: strokeColor,
        strokeWidth,
      });
    }

    if (tool === "line" || tool === "arrow") {
      setCurrent({
        id: uid("l_"),
        type: tool,
        x: p.x,
        y: p.y,
        x2: p.x,
        y2: p.y,
        color: strokeColor,
        strokeWidth,
      });
    }
  }


  /* ---------------------- MOUSE MOVE ---------------------- */
  function handleMouseMove(e) {
    const p = getPos(e);

    /* ----- DRAG ----- */
    if (dragInfo) {
      setShapes((prev) =>
        prev.map((s) => {
          if (s.id !== dragInfo.id) return s;
          const updated = {
            ...s,
            x: p.x - dragInfo.offsetX,
            y: p.y - dragInfo.offsetY,
          };
          socket.emit("shape:update", { roomId, shape: updated });
          return updated;
        })
      );
      return;
    }

    /* ----- DRAWING ----- */
    if (!drawingRef.current || !current) return;

    if (current.type === "freehand") {
      setCurrent((prev) => ({
        ...prev,
        points: [...prev.points, { x: p.x, y: p.y }],
      }));
    }

    if (current.type === "rect") {
      setCurrent((prev) => ({ ...prev, w: p.x - prev.x, h: p.y - prev.y }));
    }

    if (current.type === "circle") {
      const dx = p.x - current.x;
      const dy = p.y - current.y;
      setCurrent((prev) => ({ ...prev, r: Math.sqrt(dx * dx + dy * dy) }));
    }

    if (current.type === "line" || current.type === "arrow") {
      setCurrent((prev) => ({ ...prev, x2: p.x, y2: p.y }));
    }
  }


  /* ---------------------- MOUSE UP ---------------------- */
  function handleMouseUp() {
    if (dragInfo) {
      setDragInfo(null);
      return;
    }

    if (!drawingRef.current || !current) return;

    drawingRef.current = false;

    const finalized = { ...current };
    setShapes((x) => [...x, finalized]);
    socket.emit("shape:create", { roomId, shape: finalized });
    setCurrent(null);
  }


  /* ---------------------- DOUBLE CLICK: EDIT TEXT ---------------------- */
  function handleDoubleClick(e) {
    const p = getPos(e);

    for (let i = shapes.length - 1; i >= 0; i--) {
      const s = shapes[i];

      if (
        (s.type === "rect" && isInsideRect(s, p)) ||
        (s.type === "circle" && isInsideCircle(s, p)) ||
        (s.type === "text" && isInsideText(s, p))
      ) {
        const newText = prompt("Edit text:", s.text || "");
        const updated = { ...s, text: newText };

        setShapes((x) => x.map((xx) => (xx.id === updated.id ? updated : xx)));
        socket.emit("shape:update", { roomId, shape: updated });
        return;
      }
    }
  }


  /* ---------------------- CLEAR ---------------------- */
  function clearBoard() {
    setShapes([]);
    socket.emit("board:clear", roomId);
  }


  /* ---------------------- UI ---------------------- */
  function pickTool(t) {
    setTool(t);
    setShowPicker(false);
  }


  /* ---------------------- RETURN UI ---------------------- */
  return (
    <div className="w-screen h-screen relative">

      {/* ⭐ TEXT INPUT BOX OVER CANVAS */}
      {textInput && (
        <input
          autoFocus
          style={{
            position: "absolute",
            top: textInput.y,
            left: textInput.x,
            fontSize: "20px",
            padding: "2px",
            border: "1px solid #ccc",
            background: "white",
            zIndex: 100
          }}
          value={textInput.value}
          onChange={(e) =>
            setTextInput({ ...textInput, value: e.target.value })
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const text = textInput.value.trim();
              if (text) {
                const shape = {
                  id: uid("t_"),
                  type: "text",
                  x: textInput.x,
                  y: textInput.y,
                  text,
                  color: strokeColor,
                  fontSize: 20,
                };

                setShapes((x) => [...x, shape]);
                socket.emit("shape:create", { roomId, shape });
              }
              setTextInput(null);
            }
          }}
        />
      )}

      {/* Toolbar */}
      <div className="fixed top-4 left-4 z-50">
        <div className="flex items-center gap-2 bg-white/95 shadow-lg rounded-lg p-2">

          {/* SHAPES MENU */}
          <div className="relative">
            <button
              onClick={() => setShowPicker((s) => !s)}
              className="px-3 py-1 rounded-md bg-gray-100 border hover:bg-gray-200"
            >
              Shapes ▾
            </button>

            {showPicker && (
              <div className="absolute mt-2 p-2 bg-white border rounded shadow w-40">
                <button onClick={() => pickTool("freehand")} className="w-full px-2 py-1 hover:bg-gray-100 flex">✏️ Freehand</button>
                <button onClick={() => pickTool("rect")} className="w-full px-2 py-1 hover:bg-gray-100">▭ Rectangle</button>
                <button onClick={() => pickTool("circle")} className="w-full px-2 py-1 hover:bg-gray-100">◯ Circle</button>
                <button onClick={() => pickTool("line")} className="w-full px-2 py-1 hover:bg-gray-100">— Line</button>
                <button onClick={() => pickTool("arrow")} className="w-full px-2 py-1 hover:bg-gray-100">➜ Arrow</button>
                <button onClick={() => pickTool("text")} className="w-full px-2 py-1 hover:bg-gray-100">🔤 Text</button>
                <button onClick={() => pickTool("select")} className="w-full px-2 py-1 hover:bg-gray-100">🖐 Move</button>
                <button onClick={() => pickTool("erase")} className="w-full px-2 py-1 hover:bg-red-100">🧽 Eraser</button>
              </div>
            )}
          </div>

          {/* COLORS */}
          <div className="flex gap-2 items-center">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setStrokeColor(c)}
                className={`w-7 h-7 rounded-full border ${strokeColor === c ? "ring-2 ring-offset-1 ring-indigo-400" : ""
                  }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* WIDTH */}
          <input
            type="range"
            min="1"
            max="12"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
          />

          {/* CLEAR */}
          <button onClick={clearBoard} className="px-2 py-1 bg-red-100 rounded border">
            Clear
          </button>

          <div className="px-2">Tool: {tool}</div>
        </div>
      </div>

      {/* CANVAS */}
      <canvas
        ref={canvasRef}
        className="w-full h-full bg-white"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      ></canvas>
    </div>
  );
}
