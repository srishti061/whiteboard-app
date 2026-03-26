import React, { useState } from "react";

const JoinCreateRoom = ({ uuid, setRoomJoined, setUser }) => {
  const [roomId, setRoomId] = useState(uuid());
  const [name, setName] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [joinName, setJoinName] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return alert("Please enter your name");
    setUser({ name, roomId, presenter: true });
    setRoomJoined(true);
  };

  const handleJoin = () => {
    if (!joinName.trim()) return alert("Please enter your name");
    if (!joinRoomId.trim()) return alert("Please enter a Room ID");
    setUser({ name: joinName, roomId: joinRoomId, presenter: false });
    setRoomJoined(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    alert("Room ID copied!");
  };

  return (
    <div className="rooms-page">
      <div className="rooms-header">
        <h1>Realtime Whiteboard</h1>
        <p>Create a new room or join an existing one</p>
      </div>

      <div className="rooms-grid">
        {/* Create */}
        <div className="room-card">
          <div className="room-card-head">
            <div className="room-card-icon">✏️</div>
            <span className="room-card-title">Create Room</span>
          </div>

          <div className="room-field">
            <label>Your Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="room-field">
            <label>Room ID</label>
            <div className="room-id-row">
              <input type="text" value={roomId} readOnly />
              <button onClick={() => setRoomId(uuid())}>New</button>
              <button onClick={handleCopy}>Copy</button>
            </div>
          </div>

          <button className="room-submit" onClick={handleCreate}>
            Create Room
          </button>
        </div>

        {/* Join */}
        <div className="room-card">
          <div className="room-card-head">
            <div className="room-card-icon">🔗</div>
            <span className="room-card-title">Join Room</span>
          </div>

          <div className="room-field">
            <label>Your Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
            />
          </div>

          <div className="room-field">
            <label>Room ID</label>
            <input
              type="text"
              placeholder="Paste room ID here"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
            />
          </div>

          <button className="room-submit" onClick={handleJoin}>
            Join Room
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinCreateRoom;
