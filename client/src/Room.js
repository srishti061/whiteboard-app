import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import Canvas from "./Canvas";

const Room = ({ userNo, user, socket, setUsers, setUserNo, theme, toggleTheme }) => {
  const canvasRef = useRef(null);
  const ctx       = useRef(null);

  const [color, setColor]       = useState("#000000");
  const [elements, setElements] = useState([]);
  const [history, setHistory]   = useState([]);
  const [tool, setTool]         = useState("pencil");

// With this:
useEffect(() => {
  socket.on("error", (msg) => {
    toast.error(msg);
    socket.disconnect();
  });
  return () => socket.off("error");
}, []);

  useEffect(() => {
  socket.on("users", (d) => { setUsers(d); setUserNo(d.length); });
  return () => socket.off("users"); // 👈 add this
}, []);

  const clearCanvas = () => {
    setElements([]);
    setHistory([]);
    socket.emit("clear");
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

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    const link   = document.createElement("a");
    link.download = `whiteboard-${Date.now()}.png`;
    link.href     = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="drawing-page">
      <div className="toolbar">

        <div className="color-pill">
          <span>Color</span>
          <div
            className="color-swatch"
            style={{ background: color, cursor: "pointer" }}
            onClick={() => document.getElementById("colorPicker").click()}
          />
          <input
            type="color"
            id="colorPicker"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ display: "none" }}
          />
        </div>

        <div className="tb-sep" />

        {tools.map((t) => (
          <button
            key={t.id}
            className={`tb-btn ${tool === t.id ? "on" : ""}`}
            onClick={() => setTool(t.id)}
          >
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
        <button className="tb-btn" onClick={downloadCanvas}>↓ Download</button>

        <div className="tb-sep" />

        <button className="tb-theme-toggle" onClick={toggleTheme} title="Toggle theme">
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        <div className="online-pill">
          <div className="online-dot" />
          {userNo} online
        </div>
      </div>

      <div className="canvas-wrapper">
        <Canvas
          canvasRef={canvasRef}
          ctx={ctx}
          color={color}
          setElements={setElements}
          elements={elements}
          tool={tool}
          socket={socket}
          user={user}
          setHistory={setHistory}
        />
      </div>
    </div>
  );
};

export default Room;