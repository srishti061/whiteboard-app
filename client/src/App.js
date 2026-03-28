import React, { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import io from "socket.io-client";
import ClientRoom from "./ClientRoom";
import JoinCreateRoom from "./JoinCreateRoom";
import Room from "./Room";
import Sidebar from "./Sidebar";
import Login from "./Login";
import "./style.css";

const server = "https://whiteboard-app-ic5d.onrender.com";
const connectionOptions = {
  "force new connection": true,
  reconnectionAttempts: "Infinity",
  timeout: 10000,
  transports: ["websocket"],
};

const socket = io(server, connectionOptions);

const App = () => {
  const [userNo, setUserNo] = useState(0);
  const [users, setUsers]   = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!localStorage.getItem("token")
  );

  // ── Restore room session on refresh ──────────────────────────────────────
  const savedRoom  = sessionStorage.getItem("roomUser");
  const parsedRoom = savedRoom ? JSON.parse(savedRoom) : null;

  const [user, setUser]             = useState(parsedRoom || {});
  const [roomJoined, setRoomJoined] = useState(!!parsedRoom);

  // ── Theme ─────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  // ── UUID generator ────────────────────────────────────────────────────────
  const uuid = () => {
    const S4 = () =>
      (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    return `${S4()}${S4()}-${S4()}-${S4()}-${S4()}-${S4()}${S4()}${S4()}`;
  };

  // ── Socket: join room ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomJoined) return;
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login first");
      setRoomJoined(false);
      return;
    }
    socket.emit("user-joined", { ...user, userName: user.name, token });
  }, [roomJoined]);

  // ── Socket: error handling ────────────────────────────────────────────────
  useEffect(() => {
    socket.on("error", (msg) => {
      alert(msg);
      if (msg === "Unauthorized") {
        localStorage.removeItem("token");
        setIsLoggedIn(false);
      }
      setRoomJoined(false);
      sessionStorage.removeItem("roomUser");
    });
    return () => socket.off("error");
  }, []);

  const handleSetRoomJoined = (val) => {
    if (!val) sessionStorage.removeItem("roomUser");
    setRoomJoined(val);
  };

  return (
    <div className="home">
      <ToastContainer />

      {!isLoggedIn ? (
        <Login setUser={setIsLoggedIn} theme={theme} toggleTheme={toggleTheme} />

      ) : !roomJoined ? (
        <JoinCreateRoom
          uuid={uuid}
          setRoomJoined={handleSetRoomJoined}
          setUser={setUser}
          theme={theme}
          toggleTheme={toggleTheme}
        />

      ) : (
        <>
          <Sidebar users={users} user={user} socket={socket} />

          {user.presenter ? (
            <Room
              userNo={userNo}
              user={user}
              socket={socket}
              setUsers={setUsers}
              setUserNo={setUserNo}
              theme={theme}
              toggleTheme={toggleTheme}
            />
          ) : (
            <ClientRoom
              userNo={userNo}
              user={user}
              socket={socket}
              setUsers={setUsers}
              setUserNo={setUserNo}
              theme={theme}
              toggleTheme={toggleTheme}
            />
          )}
        </>
      )}
    </div>
  );
};

export default App;