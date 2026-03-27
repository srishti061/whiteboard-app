import React, { useRef } from "react";

const Sidebar = ({ users, user, socket }) => {
  const ref = useRef(null);

  const open  = () => { ref.current.style.left = "0"; };
  const close = () => { ref.current.style.left = "-260px"; };

  return (
    <>
      <button className="users-btn" onClick={open}>
        👥 Users
        <span className="users-btn-count">{users.length}</span>
      </button>

      <div className="sidebar" ref={ref}>
        <div className="sidebar-head">
          <span className="sidebar-head-title">Participants</span>
          <button className="sidebar-close" onClick={close}>✕</button>
        </div>

        <div className="sidebar-count">{users.length} in room</div>

        <div className="sidebar-list">
          {users.map((usr, i) => {
            const isYou      = usr.id === socket.id;
            // ✅ handle both field names just in case
            const displayName = usr.username || usr.name || "Unknown";
            const initials    = displayName
              .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

            return (
              <div key={i} className="sidebar-user">
                <div className="s-avatar">{initials}</div>
                <span className="s-name">{displayName}</span>
                <div style={{ display: "flex", gap: "4px", marginLeft: "auto" }}>
                  {usr.presenter && (
                    <span
                      className="s-you"
                      style={{
                        background:   "rgba(52,211,153,0.15)",
                        color:        "var(--green)",
                        borderColor:  "rgba(52,211,153,0.35)",
                      }}
                    >
                      Host
                    </span>
                  )}
                  {isYou && <span className="s-you">You</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default Sidebar;