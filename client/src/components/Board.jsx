import React, { useState, useRef, useEffect } from "react";
import { ChromePicker } from "react-color";
import UndoRounded from "@mui/icons-material/UndoRounded";
import RedoRounded from "@mui/icons-material/RedoRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import ColorLensRounded from "@mui/icons-material/ColorLensRounded";
import DeleteSweepRounded from "@mui/icons-material/DeleteSweepRounded";
import PanToolAltRounded from "@mui/icons-material/PanToolAltRounded";
import Crop169Rounded from "@mui/icons-material/Crop169Rounded";
import CircleRounded from "@mui/icons-material/CircleRounded";
import TrendingFlatRounded from "@mui/icons-material/TrendingFlatRounded";
import AutoFixOffRounded from "@mui/icons-material/AutoFixOffRounded";
import { Tooltip } from "@mui/material";

const Whiteboard = () => {
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#000000");
  const [showColorPicker, setShowColorPicker] = useState(false);

  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const isDrawing = useRef(false);

  const undoStack = useRef([]);
  const redoStack = useRef([]);

  const lastPos = useRef({ x: 0, y: 0 });

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctxRef.current = ctx;
  }, []);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if (e.ctrlKey && (e.key === "y" || (e.shiftKey && e.key === "Z"))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const saveState = (clearRedo = true) => {
    undoStack.current.push(canvasRef.current.toDataURL());
    if (clearRedo) redoStack.current = [];
  };

  const restoreImage = (data) => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    const img = new Image();
    img.src = data;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
  };

  const undo = () => {
    if (!undoStack.current.length) return;
    const last = undoStack.current.pop();
    redoStack.current.push(canvasRef.current.toDataURL());
    restoreImage(last);
  };

  const redo = () => {
    if (!redoStack.current.length) return;
    const last = redoStack.current.pop();
    undoStack.current.push(canvasRef.current.toDataURL());
    restoreImage(last);
  };

  const startDrawing = ({ clientX, clientY }) => {
    saveState();
    isDrawing.current = true;
    lastPos.current = { x: clientX, y: clientY };
  };

  const draw = ({ clientX, clientY }) => {
    if (!isDrawing.current) return;
    const ctx = ctxRef.current;

    if (tool === "pen") {
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(clientX, clientY);
      ctx.stroke();
      lastPos.current = { x: clientX, y: clientY };
    }

    if (tool === "eraser") {
      ctx.strokeStyle = "white";
      ctx.lineWidth = 30;
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(clientX, clientY);
      ctx.stroke();
      lastPos.current = { x: clientX, y: clientY };
      ctx.lineWidth = 3;
    }
  };

  const stopDrawing = ({ clientX, clientY }) => {
    if (!isDrawing.current) return;
    const ctx = ctxRef.current;

    if (tool === "rect") {
      ctx.strokeStyle = color;
      const x1 = lastPos.current.x;
      const y1 = lastPos.current.y;
      ctx.strokeRect(x1, y1, clientX - x1, clientY - y1);
    }

    if (tool === "circle") {
      ctx.strokeStyle = color;
      const dx = clientX - lastPos.current.x;
      const dy = clientY - lastPos.current.y;
      const r = Math.sqrt(dx * dx + dy * dy);
      ctx.beginPath();
      ctx.arc(lastPos.current.x, lastPos.current.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (tool === "arrow") {
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(clientX, clientY);
      ctx.stroke();
    }

    isDrawing.current = false;
    saveState(false);
  };

  const clearBoard = () => {
    saveState();
    const canvas = canvasRef.current;
    ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <>
      <div className="fixed top-4 left-4 bg-white p-3 rounded-xl shadow-xl flex gap-2 items-center z-50">
        <Tooltip title="Pen">
          <button onClick={() => setTool("pen")} className="p-2"><EditRounded /></button>
        </Tooltip>
        <Tooltip title="Eraser">
          <button onClick={() => setTool("eraser")} className="p-2"><AutoFixOffRounded /></button>
        </Tooltip>
        <Tooltip title="Rectangle">
          <button onClick={() => setTool("rect")} className="p-2"><Crop169Rounded /></button>
        </Tooltip>
        <Tooltip title="Circle">
          <button onClick={() => setTool("circle")} className="p-2"><CircleRounded /></button>
        </Tooltip>
        <Tooltip title="Arrow">
          <button onClick={() => setTool("arrow")} className="p-2"><TrendingFlatRounded /></button>
        </Tooltip>
        <Tooltip title="Move">
          <button onClick={() => setTool("move")} className="p-2"><PanToolAltRounded /></button>
        </Tooltip>
        <Tooltip title="Color">
          <button onClick={() => setShowColorPicker(!showColorPicker)} className="p-2"><ColorLensRounded /></button>
        </Tooltip>
        <Tooltip title="Undo">
          <button onClick={undo} className="p-2"><UndoRounded /></button>
        </Tooltip>
        <Tooltip title="Redo">
          <button onClick={redo} className="p-2"><RedoRounded /></button>
        </Tooltip>
        <Tooltip title="Clear">
          <button onClick={clearBoard} className="p-2"><DeleteSweepRounded /></button>
        </Tooltip>
      </div>

      {showColorPicker && (
        <div className="fixed top-20 left-4 bg-white p-3 shadow-xl rounded-xl z-50">
          <ChromePicker color={color} onChange={(c) => setColor(c.hex)} />
        </div>
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
