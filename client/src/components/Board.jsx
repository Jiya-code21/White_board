// React se hooks import kiye
import { useEffect, useRef, useState } from "react";
// socket.io client import kiya
import { io } from "socket.io-client";

// server se connect kiya
const socket = io("http://localhost:3000");

export default function Board() {
  // canvas ko pakadne ke liye ref
  const canvasRef = useRef(null);
  // context store karne ke liye ref
  const ctxRef = useRef(null);

  // drawing start/stop ke liye
  const [isDrawing, setIsDrawing] = useState(false);

  // color aur size ke states
  const [color, setColor] = useState("black");
  const [size, setSize] = useState(3);

  // page load hote hi canvas setup hoga
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext("2d");
    ctx.lineWidth = size; // brush ki width
    ctx.lineCap = "round";
    ctx.strokeStyle = color;

    ctxRef.current = ctx;

    // dusre user ka drawing receive karna
    socket.on("draw", (data) => {
      ctx.lineWidth = data.size;
      ctx.strokeStyle = data.color;

      ctx.lineTo(data.x, data.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(data.x, data.y);
    });

    // clear signal receive karna
    socket.on("clear", () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
  }, []);

  // user mouse dabaye toh drawing start
  const startDrawing = () => {
    setIsDrawing(true);
  };

  // mouse chhotay toh drawing stop
  const stopDrawing = () => {
    setIsDrawing(false);
    ctxRef.current.beginPath(); // naye stroke ke liye reset
  };

  // actual drawing function
  const draw = (e) => {
    if (!isDrawing) return;

    let x = e.clientX;
    let y = e.clientY;

    ctxRef.current.lineWidth = size;
    ctxRef.current.strokeStyle = color;

    // apne canvas par line draw karna
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);

    // server ko data bhejna
    socket.emit("draw", {
      x,
      y,
      color,
      size,
    });
  };

  // canvas saaf karne ka function
  const clearBoard = () => {
    const canvas = canvasRef.current;
    ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);

    socket.emit("clear");
  };

  return (
    <>
      {/* color change input */}
      <div style={{ position: "fixed", top: 10, left: 10, zIndex: 20 }}>
        <input 
          type="color" 
          value={color} 
          onChange={(e) => setColor(e.target.value)} 
        />

        {/* brush size input */}
        <input
          type="range"
          min="1"
          max="20"
          value={size}
          onChange={(e) => setSize(e.target.value)}
        />

        {/* clear button */}
        <button onClick={clearBoard}>Clear</button>
      </div>

      {/* main drawing canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseMove={draw}
        style={{
          background: "white",
          display: "block",
          cursor: "crosshair",
        }}
      ></canvas>
    </>
  );
}
