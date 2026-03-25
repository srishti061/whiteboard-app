import React, { useEffect, useLayoutEffect, useState } from "react";
import rough from "roughjs/bundled/rough.esm";

const generator = rough.generator();  //instance of the rough.js library, which we can use to create shapes.
const Canvas = ({
  canvasRef,
  ctx,
  color,
  setElements,
  elements,
  tool,
  socket,
}) => {
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.height = window.innerHeight * 2;
    canvas.width = window.innerWidth * 2;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    const context = canvas.getContext("2d");   //This context (context) is an object that provides methods and properties to draw on the canvas

    context.strokeWidth = 5;
    context.scale(2, 2);
    context.lineCap = "round";
    context.strokeStyle = color;  //setting default context settings
    context.lineWidth = 5;
    ctx.current = context;
  }, []);

  useEffect(() => {
    ctx.current.strokeStyle = color;  //it will change only when new color is picked
  }, [color]);

  const handleMouseDown = (e) => {     //function is called when the user presses the mouse button down on the canvas
    const { offsetX, offsetY } = e.nativeEvent;  //we get coordinates where user has put his mouse

    if (tool === "pencil") {
      setElements((prevElements) => [
        ...prevElements,
        {
          offsetX,
          offsetY,
          path: [[offsetX, offsetY]],   //updates the elements state to add a new drawing path starting at the mouse position.
          stroke: color,
          element: tool,
        },
      ]);
    } else {
      setElements((prevElements) => [
        ...prevElements,
        { offsetX, offsetY, stroke: color, element: tool },
      ]);
    }

    setIsDrawing(true);
  };

  useLayoutEffect(() => {
    const roughCanvas = rough.canvas(canvasRef.current);  //rough.js instance that allows drawing rough-style shapes on the canvas.
    //.“updates the elements state to add a new drawing path starting at the mouse position
    if (elements.length > 0) {
      ctx.current.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
    }
    elements.forEach((ele, i) => {
      if (ele.element === "rect") {
        roughCanvas.draw(
          generator.rectangle(ele.offsetX, ele.offsetY, ele.width, ele.height, {
            stroke: ele.stroke,
            roughness: 0,
            strokeWidth: 5,
          })
        );
      } else if (ele.element === "line") {
        roughCanvas.draw(
          generator.line(ele.offsetX, ele.offsetY, ele.width, ele.height, {
            stroke: ele.stroke,
            roughness: 0,
            strokeWidth: 5,
          })
        );
      } else if (ele.element === "pencil") {
        roughCanvas.linearPath(ele.path, {
          stroke: ele.stroke,
          roughness: 0,
          strokeWidth: 5,
        });
      }
    });
    const canvasImage = canvasRef.current.toDataURL();   //  is used to convert the content of a canvas element into a data URL. This data URL is a Base64-encoded string representing the image in a specified format (default is PNG). 
    // This is useful for saving, sharing, or sending the canvas content over a network.
    socket.emit("drawing", canvasImage);  // sends this image to the server via a WebSocket connection.
  }, [elements]);



  const handleMouseMove = (e) => {    //function handles the mouse move events when the user is drawing on the canvas.
    if (!isDrawing) {
      return;
    }
    const { offsetX, offsetY } = e.nativeEvent;   //Get Mouse Position  

    if (tool === "rect") {                      //checks which tool is currently selected (tool) and updates the elements state accordingly.
      setElements((prevElements) =>
        prevElements.map((ele, index) =>
          index === elements.length - 1
            ? {
              offsetX: ele.offsetX,
              offsetY: ele.offsetY,
              width: offsetX - ele.offsetX,
              height: offsetY - ele.offsetY,
              stroke: ele.stroke,
              element: ele.element,
            }
            : ele
        )
      );
    } else if (tool === "line") {
      setElements((prevElements) =>
        prevElements.map((ele, index) =>
          index === elements.length - 1
            ? {
              offsetX: ele.offsetX,
              offsetY: ele.offsetY,
              width: offsetX,
              height: offsetY,
              stroke: ele.stroke,
              element: ele.element,
            }
            : ele
        )
      );
    } else if (tool === "pencil") {
      setElements((prevElements) =>
        prevElements.map((ele, index) =>
          index === elements.length - 1
            ? {
              offsetX: ele.offsetX,
              offsetY: ele.offsetY,
              path: [...ele.path, [offsetX, offsetY]],
              stroke: ele.stroke,
              element: ele.element,
            }
            : ele
        )
      );
    }
  };
  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  return (
    <div
      className="col-md-8 overflow-hidden border border-dark px-0 mx-auto mt-3"
      style={{ height: "500px" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <canvas ref={canvasRef} />
    </div>
  );
};

export default Canvas;