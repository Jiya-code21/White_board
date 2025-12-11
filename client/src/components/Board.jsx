import React, { useState, useRef, useEffect } from "react";
import { ChromePicker } from "react-color";
import UndoRounded from "@mui/icons-material/UndoRounded";
import RedoRounded from "@mui/icons-material/RedoRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import ColorLensRounded from "@mui/icons-material/ColorLensRounded";
import DeleteSweepRounded from "@mui/icons-material/DeleteSweepRounded";
import Crop169Rounded from "@mui/icons-material/Crop169Rounded";
import CircleRounded from "@mui/icons-material/CircleRounded";
import TrendingFlatRounded from "@mui/icons-material/TrendingFlatRounded";
import AutoFixOffRounded from "@mui/icons-material/AutoFixOffRounded";
import TextFieldsRounded from "@mui/icons-material/TextFieldsRounded"; // ⭐ ADDED
import { Tooltip } from "@mui/material";

const Whiteboard = () => {
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(3);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const [showTextInput, setShowTextInput] = useState(false);
  const [textPos, setTextPos] = useState({ x: 0, y: 0 });
  const [inputText, setInputText] = useState("");

  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const isDrawing = useRef(false);

  const undoStack = useRef([]);
  const redoStack = useRef([]);

  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctxRef.current = ctx;
  }, []);

  const saveState = () => {
    undoStack.current.push(canvasRef.current.toDataURL());
    redoStack.current = [];
  };

  const restoreImage = (data) => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    const img = new Image();
    img.src = data;
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };

  const undo = () => {
    if (!undoStack.current.length) return;
    redoStack.current.push(canvasRef.current.toDataURL());
    restoreImage(undoStack.current.pop());
  };

  const redo = () => {
    if (!redoStack.current.length) return;
    undoStack.current.push(canvasRef.current.toDataURL());
    restoreImage(redoStack.current.pop());
  };

  const startDrawing = ({ clientX, clientY }) => {
    if (tool === "text") {
      setTextPos({ x: clientX, y: clientY });
      setShowTextInput(true);
      return;
    }

    saveState();
    isDrawing.current = true;
    lastPos.current = { x: clientX, y: clientY };
  };

  const draw = ({ clientX, clientY }) => {
    if (!isDrawing.current) return;

    const ctx = ctxRef.current;

    if (tool === "pen") {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(clientX, clientY);
      ctx.stroke();
      lastPos.current = { x: clientX, y: clientY };
    }

    if (tool === "eraser") {
      ctx.strokeStyle = "white";
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(clientX, clientY);
      ctx.stroke();
      lastPos.current = { x: clientX, y: clientY };
    }
  };

  const stopDrawing = ({ clientX, clientY }) => {
    if (!isDrawing.current) return;

    const ctx = ctxRef.current;
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;

    if (tool === "rect") {
      ctx.strokeRect(
        lastPos.current.x,
        lastPos.current.y,
        clientX - lastPos.current.x,
        clientY - lastPos.current.y
      );
    }

    if (tool === "circle") {
      const dx = clientX - lastPos.current.x;
      const dy = clientY - lastPos.current.y;
      const r = Math.sqrt(dx * dx + dy * dy);
      ctx.beginPath();
      ctx.arc(lastPos.current.x, lastPos.current.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (tool === "arrow") {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(clientX, clientY);
      ctx.stroke();
    }

    isDrawing.current = false;
  };

  const placeText = () => {
    if (!inputText.trim()) {
      setShowTextInput(false);
      return;
    }

    saveState();
    const ctx = ctxRef.current;
    ctx.fillStyle = color;
    ctx.font = `${lineWidth * 6}px Arial`;
    ctx.fillText(inputText, textPos.x, textPos.y);

    setInputText("");
    setShowTextInput(false);
  };

  return (
    <>
      <div className="fixed top-4 left-4 bg-white p-3 rounded-xl shadow-xl flex gap-2 items-center z-50">

        {/* WIDTH SELECTOR */}
        <select
          value={lineWidth}
          onChange={(e) => setLineWidth(Number(e.target.value))}
          className="border p-1 rounded-lg"
        >
          <option value={2}>2 px</option>
          <option value={5}>5 px</option>
          <option value={10}>10 px</option>
          <option value={20}>20 px</option>
          <option value={30}>30 px</option>
        </select>

        {/* COLOR PICKER */}
        <Tooltip title="Color">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-2 rounded-lg"
          >
            <ColorLensRounded style={{ color }} />
          </button>
        </Tooltip>

        {showColorPicker && (
          <div className="absolute top-20 left-4 z-50">
            <ChromePicker color={color} onChange={(c) => setColor(c.hex)} />
          </div>
        )}

        {/* PEN */}
        <Tooltip title="Pen">
          <button
            onClick={() => setTool("pen")}
            className={`p-2 rounded-lg ${tool === "pen" ? "border-2 border-indigo-500" : ""
              }`}
          >
            <EditRounded />
          </button>
        </Tooltip>

        {/* ERASER */}
        <Tooltip title="Eraser">
          <button
            onClick={() => setTool("eraser")}
            className={`p-2 rounded-lg ${tool === "eraser" ? "border-2 border-indigo-500" : ""
              }`}
          >
            <AutoFixOffRounded />
          </button>
        </Tooltip>

        {/* RECTANGLE */}
        <Tooltip title="Rectangle">
          <button
            onClick={() => setTool("rect")}
            className={`p-2 rounded-lg ${tool === "rect" ? "border-2 border-indigo-500" : ""
              }`}
          >
            <Crop169Rounded />
          </button>
        </Tooltip>

        {/* CIRCLE */}
        <Tooltip title="Circle">
          <button
            onClick={() => setTool("circle")}
            className={`p-2 rounded-lg ${tool === "circle" ? "border-2 border-indigo-500" : ""
              }`}
          >
            <CircleRounded />
          </button>
        </Tooltip>

        {/* ARROW */}
        <Tooltip title="Arrow">
          <button
            onClick={() => setTool("arrow")}
            className={`p-2 rounded-lg ${tool === "arrow" ? "border-2 border-indigo-500" : ""
              }`}
          >
            <TrendingFlatRounded />
          </button>
        </Tooltip>

        {/* ⭐ TEXT TOOL BUTTON ADDED */}
        <Tooltip title="Text">
          <button
            onClick={() => setTool("text")}
            className={`p-2 rounded-lg ${tool === "text" ? "border-2 border-indigo-500" : ""}`}
          >
            <TextFieldsRounded />
          </button>
        </Tooltip>

        {/* UNDO */}
        <Tooltip title="Undo">
          <button onClick={undo}>
            <UndoRounded />
          </button>
        </Tooltip>

        {/* REDO */}
        <Tooltip title="Redo">
          <button onClick={redo}>
            <RedoRounded />
          </button>
        </Tooltip>

        {/* CLEAR */}
        <Tooltip title="Clear">
          <button
            onClick={() =>
              ctxRef.current.clearRect(
                0,
                0,
                canvasRef.current.width,
                canvasRef.current.height
              )
            }
          >
            <DeleteSweepRounded />
          </button>
        </Tooltip>
      </div>

      {/* TEXT INPUT BOX */}
      {showTextInput && (
        <input
          autoFocus
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && placeText()}
          className="absolute z-50 border p-1 rounded bg-white"
          style={{ left: textPos.x, top: textPos.y }}
          placeholder="Type text & press Enter"
        />
      )}

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        className="w-full h-full absolute top-0 left-0 bg-white"
      />
    </>
  );
};

export default Whiteboard;
