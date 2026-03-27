import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

const TOOLBAR_H = 54;
const CURSOR_COLORS = [
  "#7c6dfa", "#f87171", "#34d399", "#fbbf24",
  "#60a5fa", "#f472b6", "#a3e635", "#fb923c",
];

const ClientRoom = ({ userNo, user, socket, setUsers, setUserNo, theme, toggleTheme }) => {
  const imgRef        = useRef(null);
  const colorIndexRef = useRef({});
  const nextColorRef  = useRef(0);
  const [cursors, setCursors] = useState({}); 

  const downloadCanvas = () => {
  const img  = imgRef.current;
  if (!img || !img.src || img.src === window.location.href) return;
  const link = document.createElement("a");
  link.download = `whiteboard-${Date.now()}.png`;
  link.href     = img.src;
  link.click();
};

  useEffect(() => {
    socket.on("message", (d) => toast.info(d.message));
  }, []);

  useEffect(() => {
    socket.on("users", (d) => { setUsers(d); setUserNo(d.length); });
  }, []);

  useEffect(() => {
    socket.on("canvasImage", (data) => {
      if (imgRef.current) imgRef.current.src = data;
    });
    socket.on("clear", () => {
      if (imgRef.current) imgRef.current.src = "";
    });
    socket.on("cursor-move", ({ socketId, x, y, username }) => {
      if (!colorIndexRef.current[socketId]) {
        colorIndexRef.current[socketId] =
          CURSOR_COLORS[nextColorRef.current % CURSOR_COLORS.length];
        nextColorRef.current++;
      }
      setCursors((prev) => ({
        ...prev,
        [socketId]: { x, y, username, color: colorIndexRef.current[socketId] },
      }));
    });
    socket.on("cursor-leave", ({ socketId }) => {
      setCursors((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    });
    return () => {
      socket.off("canvasImage");
      socket.off("clear");
      socket.off("cursor-move");
      socket.off("cursor-leave");
    };
  }, []);

  return (
    <div className="drawing-page">

      <div className="toolbar">
        <span className="tb-btn" style={{ cursor: "default", opacity: 0.5 }}>
          👁 View only
        </span>

        <div className="tb-sep" /> 

        <div className="tb-sep" />

<button className="tb-btn" onClick={downloadCanvas}>
  ↓ Download
</button>

        {/* ✅ Fix 1: use tb-theme-toggle, not theme-toggle, so it stays in toolbar flow */}
        <button className="tb-theme-toggle" onClick={toggleTheme} title="Toggle theme">
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        <div className="online-pill">
          <div className="online-dot" />
          {userNo} online
        </div>
      </div>

      {/* ✅ Fix 2: canvas background uses CSS variable, not hardcoded "white" */}
      <div
        style={{
          flex: 1,
          width: "100%",
          height: `calc(100vh - ${TOOLBAR_H}px)`,
          overflow: "hidden",
          position: "relative",
          background: "var(--bg-2)",
        }}
      >
        <img
          ref={imgRef}
          src=""
          alt="whiteboard"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "fill",
            display: "block",
          }}
        />

        {Object.entries(cursors).map(([id, { x, y, username, color: c }]) => (
          <div
            key={id}
            style={{
              position: "absolute", left: x, top: y,
              pointerEvents: "none", zIndex: 50,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" style={{ display: "block" }}>
              <path
                d="M2 2L2 16L6 12L9 18L11 17L8 11L14 11Z"
                fill={c} stroke="white" strokeWidth="1"
              />
            </svg>
            <div style={{
              background: c, color: "#fff",
              fontSize: "11px", fontWeight: "600",
              padding: "2px 7px", borderRadius: "4px",
              marginTop: "2px", whiteSpace: "nowrap",
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            }}>
              {username}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClientRoom;