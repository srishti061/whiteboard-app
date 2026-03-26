import React, { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";  //to display notifications.
import io from "socket.io-client";   // to handle WebSocket connections.
import ClientRoom from "./ClientRoom";
import JoinCreateRoom from "./JoinCreateRoom";
import Room from "./Room";                         //importing components
import Sidebar from "./Sidebar";
import Login from "./Login";

import "./style.css";

const server = "http://localhost:5000";    //websocket connection
const connectionOptions = {
  "force new connection": true,
  reconnectionAttempts: "Infinity",
  timeout: 10000,
  transports: ["websocket"],
};

const socket = io(server, connectionOptions);  //initializes a socket connection with the specified server and options

const App = () => {
  const [userNo, setUserNo] = useState(0);   //track of the number of users.
  const [roomJoined, setRoomJoined] = useState(false);  //to determine if a room has been joined. 
  const [user, setUser] = useState({});  // to store user information.
  const [users, setUsers] = useState([]);   //store the list of users.
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem("token"));



  const uuid = () => {    //uuid(unique identifier)-function to generate unique id for for room IDs.
    var S4 = () => {
      return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return (
      S4() +
      S4() +
      "-" +
      S4() +
      "-" +
      S4() +
      "-" +
      S4() +
      "-" +
      S4() +
      S4() +
      S4()
    );
  };

  useEffect(() => {
  if (roomJoined) {
    const token = localStorage.getItem("token"); 

    if (!token) {
      alert("Please login first");
      setRoomJoined(false);
      return;
    }

    socket.emit("user-joined", {
      ...user,
      token,
    });
  }
}, [roomJoined]);

// 👉 ADD THIS NEW useEffect RIGHT BELOW
useEffect(() => {
  socket.on("error", (msg) => {
    alert(msg);

    // 👇 ADD THIS
    if (msg === "Unauthorized") {
      localStorage.removeItem("token");
      setIsLoggedIn(false);
    }

    setRoomJoined(false);
  });

  return () => {
    socket.off("error");
  };
}, []); 


  return (
  <div className="home">
    <ToastContainer />

    {!isLoggedIn ? (
      <Login setUser={setIsLoggedIn} />
    ) : roomJoined ? (
      <>
        <Sidebar users={users} user={user} socket={socket} />
        {user.presenter ? (
          <Room
            userNo={userNo}
            user={user}
            socket={socket}
            setUsers={setUsers}
            setUserNo={setUserNo}
          />
        ) : (
          <ClientRoom
            userNo={userNo}
            user={user}
            socket={socket}
            setUsers={setUsers}
            setUserNo={setUserNo}
          />
        )}
      </>
    ) : (
      <JoinCreateRoom
        uuid={uuid}
        setRoomJoined={setRoomJoined}
        setUser={setUser}
      />
    )}
  </div>
);
};
export default App;