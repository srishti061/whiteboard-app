import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import Canvas from "./Canvas";

const Room = ({ userNo, socket, setUsers, setUserNo }) => {
  const canvasRef = useRef(null);
  const ctx       = useRef(null);
  const [color, setColor]       = useState("#000000");
  const [elements, setElements] = useState([]);
  const [history, setHistory]   = useState([]);
  const [tool, setTool]         = useState("pencil");

  useEffect(() => { socket.on("message", (d) => toast.info(d.message)); }, []);
  useEffect(() => {
    socket.on("users", (d) => { setUsers(d); setUserNo(d.length); });
  }, []);

  const clearCanvas = () => {
    const canvas  = canvasRef.current;
    const context = canvas.getContext("2d");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    setElements([]);
  };

  const undo = () => {
    setHistory((p) => [...p, elements[elements.length - 1]]);
    setElements((p) => p.filter((_, i) => i !== elements.length - 1));
  };

  const redo = () => {
    setElements((p) => [...p, history[history.length - 1]]);
    setHistory((p) => p.filter((_, i) => i !== history.length - 1));
  };

  const tools = [
    { id: "pencil", icon: "✏", label: "Pencil" },
    { id: "line",   icon: "╱", label: "Line"   },
    { id: "rect",   icon: "▭", label: "Rect"   },
  ];

  return (
    <div className="drawing-page">

      {/* ── Toolbar ── */}
      <div className="toolbar">

        <div className="color-pill">
          <span>Color</span>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          <div className="color-swatch" style={{ background: color }} />
        </div>

        <div className="tb-sep" />

        {tools.map((t) => (
          <button key={t.id} className={`tb-btn ${tool === t.id ? "on" : ""}`}
            onClick={() => setTool(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}

        <div className="tb-sep" />

        <button className="tb-btn" disabled={elements.length === 0} onClick={undo}>
          ↩ Undo
        </button>
        <button className="tb-btn" disabled={history.length < 1} onClick={redo}>
          ↪ Redo
        </button>

        <div className="tb-sep" />

        <button className="tb-btn kill" onClick={clearCanvas}>✕ Clear</button>

        <div className="online-pill">
          <div className="online-dot" />
          {userNo} online
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className="canvas-wrapper">
        <Canvas canvasRef={canvasRef} ctx={ctx} color={color}
          setElements={setElements} elements={elements} tool={tool} socket={socket} />
      </div>
    </div>
  );
};

export default Room;