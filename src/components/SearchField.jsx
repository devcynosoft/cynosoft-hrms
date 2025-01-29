import Image from "next/image";
import React from "react";
import useIsMobile from "@/utils/useIsMobile";

const SearchField = ({ value, onChange, placeholder }) => {
  const isMobile = useIsMobile();
  return (
    <div style={{ position: "relative" }} className="search-field">
      <Image
        src="/assets/images/icon-search.svg"
        width={20}
        height={20}
        style={{
          position: "absolute",
          right: isMobile ? "-7px" : "12px",
          top: "9px",
        }}
        alt="search-icon"
      />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          borderRadius: "20px",
          height: "39px",
          padding: "5px 41px 5px 12px",
          width: "206px",
          outlineColor: "#00000021",
          border: "1px solid #00000021",
        }}
      />
    </div>
  );
};

export default SearchField;
