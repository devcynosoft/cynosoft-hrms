import React from "react";
import Image from "next/image";
import styles from "./header.module.css";
import NameBadge from "../NameBadge";

const HeaderComponent = ({ empData }) => {
  return (
    <div className={`d-flex justify-content-end ${styles.header}`}>
      <div className="d-none d-md-block">
        <div className="d-flex align-items-center">
          <span className="me-2">
            {empData?.name ? empData?.name.split(" ")[0] : ""}
          </span>
          {empData?.pic ? (
            <Image
              src={empData?.pic}
              alt="Vercel Logo"
              width={33}
              height={33}
              priority
              className="hrms-profileImage"
            />
          ) : (
            <NameBadge
              name={empData?.name}
              fontSize={15}
              height={27}
              width={27}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default HeaderComponent;
