import React from "react";

const ButtonLoader = () => {
  return (
    <div
      style={{ height: "20px", width: "20px" }}
      class="spinner-border text-light"
      role="status"
    >
      <span class="visually-hidden">Loading...</span>
    </div>
  );
};

export default ButtonLoader;
