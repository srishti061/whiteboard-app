import React, { useEffect, useLayoutEffect, useState } from "react";
import rough from "roughjs/bundled/rough.esm";

const generator = rough.generator();
const TOOLBAR_HEIGHT = 54;

const Canvas = ({ canvasRef, ctx, color, setElements, elements, tool, socket }) => {
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const W = window.innerWidth;
    const H = window.innerHeight - TOOLBAR_HEIGHT;

    canvas.width  = W * 2;
    canvas.height = H * 2;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;

    const context = canvas.getContext("2d");
    context.scale(2, 2);
    context.lineCap     = "round";
    context.strokeStyle = color;
    context.lineWidth   = 5;
    context.fillStyle   = "white";
    context.fillRect(0, 0, W, H);

    ctx.current = context;   // ← assigned here
  }, []);

  useEffect(() => {
    if (ctx.current) ctx.current.strokeStyle = color;
  }, [color]);

  // Guard: skip until ctx is ready
  useLayoutEffect(() => {
    if (!ctx.current) return;

    const canvas    = canvasRef.current;
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

    socket.emit("drawing", canvas.toDataURL());
  }, [elements]);

  const handleMouseDown = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;
    if (tool === "pencil") {
      setElements((prev) => [
        ...prev,
        { offsetX, offsetY, path: [[offsetX, offsetY]], stroke: color, element: tool },
      ]);
    } else {
      setElements((prev) => [...prev, { offsetX, offsetY, stroke: color, element: tool }]);
    }
    setIsDrawing(true);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = e.nativeEvent;

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
          i === prev.length - 1 ? { ...ele, width: offsetX, height: offsetY } : ele
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

  const handleMouseUp = () => setIsDrawing(false);

  return (
    <div
      style={{
        flex: 1,
        width: "100%",
        height: `calc(100vh - ${TOOLBAR_HEIGHT}px)`,
        overflow: "hidden",
        cursor: "crosshair",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
};

export default Canvas;