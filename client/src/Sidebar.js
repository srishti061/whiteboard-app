import React, { useRef } from "react";
import { Socket } from "socket.io-client";

const Sidebar = ({ users, user, socket }) => {
  const sideBarRef = useRef(null);  // Create a reference for the sidebar element

  const openSideBar = () => {
    sideBarRef.current.style.left = 0;
  };
  const closeSideBar = () => {
    sideBarRef.current.style.left = -100 + "%";
  };
  return (
    <>
      <button
        className="btn btn-dark btn-sm"
        onClick={openSideBar}
        style={{ position: "absolute", top: "5%", left: "5%" }}   //users button styling
      >
        Users
      </button>
      <div
        className="position-fixed pt-2 h-100 bg-dark"
        ref={sideBarRef}
        style={{
          width: "150px",
          left: "-100%",    //initial style of side bar to be hidden 
          transition: "0.5s linear",  //transistion for smooth operation
          zIndex: "9999",
        }}
      >
        <button
          className="btn btn-block border-0 form-control rounded-0 btn-light"
          onClick={closeSideBar}
        >
          Close
        </button>
        <div className="w-100 mt-5">
          {users.map((usr, index) => (
            <p key={index} className="text-white text-center py-2">
              {usr.username}
              {usr.id === socket.id && " - (You)"}
            </p>
          ))}
        </div>
      </div>
    </>
  );
};

export default Sidebar;

//when we click users button -->open side bar event triggers that change the sidebarRef left style to 0 make it for view in scrren then transition
//ocours ...