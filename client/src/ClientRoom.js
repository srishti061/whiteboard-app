import React, { useEffect, useRef } from "react";
import { toast } from "react-toastify";

const ClientRoom = ({ userNo, socket, setUsers, setUserNo }) => {
  const imgRef = useRef(null);

  useEffect(() => {
    socket.on("message", (data) => {
      toast.info(data.message);
    });
  }, []);

  useEffect(() => {
    socket.on("users", (data) => {
      setUsers(data);
      setUserNo(data.length);
    });
  }, []);

  useEffect(() => {
    socket.on("canvasImage", (data) => {
      imgRef.current.src = data;
    });
  }, []);

  return (
    <div className="drawing-area">
      {/* Toolbar */}
      <div className="toolbar">
        <span className="toolbar-title">Drawing App</span>
        <div className="online-badge">
          <div className="online-dot" />
          {userNo} online
        </div>
      </div>

      {/* Canvas viewer */}
      <div className="canvas-wrapper">
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            overflow: "hidden",
            width: "800px",
            height: "500px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          }}
        >
          <img
            ref={imgRef}
            src=""
            alt="whiteboard"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>
      </div>
    </div>
  );
};

export default ClientRoom;