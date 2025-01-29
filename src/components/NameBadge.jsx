'use client'
import React, { useState, useEffect } from "react";

const getRandomColor = () => {
  const colors = ["green", "orange", "red", "blue"];
  return colors[Math.floor(Math.random() * colors.length)];
};

const NameBadge = ({ name, fontSize, height, width }) => {
  const [bgColor, setBgColor] = useState("");

  useEffect(() => {
    setBgColor(getRandomColor());
  }, []);

  return (
    <div
      style={{
        backgroundColor: bgColor,
        borderRadius: "50%",
        width: `${width}px`,
        height: `${height}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: `${fontSize}px`,
        fontWeight: "bold",
      }}
    >
      {name?.charAt(0)?.toUpperCase()}
    </div>
  );
};

export default NameBadge;
