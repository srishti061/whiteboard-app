import React, { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";  //to display notifications.
import io from "socket.io-client";   // to handle WebSocket connections.
import ClientRoom from "./ClientRoom";
import JoinCreateRoom from "./JoinCreateRoom";
import Room from "./Room";                         //importing components
import Sidebar from "./Sidebar";

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
      socket.emit("user-joined", user);   //whenever new user joins the user-joined event will get triggered.
    }
  }, [roomJoined]);

  return (
    <div className="home">
      <ToastContainer />
      {roomJoined ? (       // Conditional rendering based on whether a room has been joined:
        <>
          <Sidebar users={users} user={user} socket={socket} />
          {user.presenter ? (    //conditional rendering based on whether the user is a presenter
            <Room
              userNo={userNo}
              user={user}
              socket={socket}                //for presenter
              setUsers={setUsers}
              setUserNo={setUserNo}
            />
          ) : (
            <ClientRoom
              userNo={userNo}
              user={user}                 //for client
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