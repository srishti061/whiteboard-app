import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import rough from "roughjs/bundled/rough.esm";

const generator = rough.generator();
const TOOLBAR_H = 54;
const CURSOR_COLORS = [
  "#7c6dfa", "#f87171", "#34d399", "#fbbf24",
  "#60a5fa", "#f472b6", "#a3e635", "#fb923c",
];

const Canvas = ({ canvasRef, ctx, color, setElements, elements, tool, socket, user, setHistory }) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [cursors, setCursors]     = useState({});
  const colorIndexRef             = useRef({});
  const nextColorRef              = useRef(0);
  const isDrawingRef              = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const W = window.innerWidth;
    const H = window.innerHeight - TOOLBAR_H;

    canvas.width        = W * 2;
    canvas.height       = H * 2;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;

    const context = canvas.getContext("2d");
    context.scale(2, 2);
    context.lineCap     = "round";
    context.strokeStyle = color;
    context.lineWidth   = 5;
    context.fillStyle   = "white";
    context.fillRect(0, 0, W, H);

    ctx.current = context;
  }, []);

  useEffect(() => {
    if (ctx.current) ctx.current.strokeStyle = color;
  }, [color]);

  useEffect(() => {
    socket.on("canvasImage", (data) => {
      const img  = new Image();
      img.src    = data;
      img.onload = () => {
        if (!ctx.current) return;
        const canvas = canvasRef.current;
        const W = canvas.width  / 2;
        const H = canvas.height / 2;
        ctx.current.fillStyle = "white";
        ctx.current.fillRect(0, 0, W, H);
        ctx.current.drawImage(img, 0, 0, W, H);
      };
    });

    socket.on("clear", () => {
      if (!ctx.current) return;
      const canvas = canvasRef.current;
      ctx.current.fillStyle = "white";
      ctx.current.fillRect(0, 0, canvas.width / 2, canvas.height / 2);
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

  // ── Local redraw only — NO socket emit here ───────────────────────────────
  useLayoutEffect(() => {
    if (!ctx.current) return;

    const canvas      = canvasRef.current;
    const roughCanvas = rough.canvas(canvas);
    const W = canvas.width  / 2;
    const H = canvas.height / 2;

    ctx.current.fillStyle = "white";
    ctx.current.fillRect(0, 0, W, H);

    elements.forEach((ele) => {
      if (ele.element === "rect") {
        roughCanvas.draw(
          generator.rectangle(ele.offsetX, ele.offsetY, ele.width, ele.height, {
            stroke: ele.stroke, roughness: 0, strokeWidth: 5,
          })
        );
      } else if (ele.element === "line") {
        roughCanvas.draw(
          generator.line(ele.offsetX, ele.offsetY, ele.width, ele.height, {
            stroke: ele.stroke, roughness: 0, strokeWidth: 5,
          })
        );
      } else if (ele.element === "pencil") {
        roughCanvas.linearPath(ele.path, {
          stroke: ele.stroke, roughness: 0, strokeWidth: 5,
        });
      }
    });

    // Only broadcast while actively drawing
    if (isDrawingRef.current && elements.length > 0) {
      socket.emit("drawing", canvas.toDataURL());
    }
  }, [elements]);

  const handleMouseDown = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;
    isDrawingRef.current = true;
    if (tool === "pencil") {
      setElements((prev) => [
        ...prev,
        { offsetX, offsetY, path: [[offsetX, offsetY]], stroke: color, element: tool },
      ]);
    } else {
      setElements((prev) => [
        ...prev,
        { offsetX, offsetY, stroke: color, element: tool },
      ]);
    }
    setIsDrawing(true);
  };

  const handleMouseMove = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;
    socket.emit("cursor-move", {
      x: offsetX,
      y: offsetY,
      username: user?.name || "Guest",
    });

    if (!isDrawing) return;

    if (tool === "rect") {
      setElements((prev) =>
        prev.map((ele, i) =>
          i === prev.length - 1
            ? { ...ele, width: offsetX - ele.offsetX, height: offsetY - ele.offsetY }
            : ele
        )
      );
    } else if (tool === "line") {
      setElements((prev) =>
        prev.map((ele, i) =>
          i === prev.length - 1
            ? { ...ele, width: offsetX, height: offsetY }
            : ele
        )
      );
    } else if (tool === "pencil") {
      setElements((prev) =>
        prev.map((ele, i) =>
          i === prev.length - 1
            ? { ...ele, path: [...ele.path, [offsetX, offsetY]] }
            : ele
        )
      );
    }
  };

  const handleMouseUp = () => {
    isDrawingRef.current = false;
    setIsDrawing(false);
    if (elements.length > 0) {
      socket.emit("drawing", canvasRef.current.toDataURL());
      socket.emit("save-snapshot", canvasRef.current.toDataURL());
    }
  };

  const handleMouseLeave = () => {
    socket.emit("cursor-leave");
  };

  return (
    <div
      style={{
        position: "relative",
        flex: 1,
        width: "100%",
        height: `calc(100vh - ${TOOLBAR_H}px)`,
        overflow: "hidden",
        cursor: "crosshair",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />

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
            background: c, color: "white",
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
  );
};

export default Canvas;