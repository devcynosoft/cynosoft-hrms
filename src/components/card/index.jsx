import React from "react";
import styles from "./card.module.css";
import FormatTime from "@/utils/formatTime";
import calculateTimeDifference from "@/utils/timeDifference";
import Card from "react-bootstrap/Card";

const CardComponent = ({ data, empData }) => {
  return (
    <Card
      style={{
        width: "16rem",
        boxShadow:
          "0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)",
      }}
    >
      <Card.Body>
        <Card.Title className={styles.empName}>
          {empData?.name ? empData?.name : data?.checkin_time?.split("T")[0]}
        </Card.Title>
        <Card.Text>{`Check In: ${
          data?.checkin_time ? FormatTime(data?.checkin_time) : "-"
        }`}</Card.Text>
        <Card.Text>
          {" "}
          {`Time Count: ${
            data?.total_hour
              ? data?.total_hour
              : data?.checkin_time
              ? calculateTimeDifference(data?.checkin_time)
              : "-"
          }`}
        </Card.Text>
        <Card.Text>
          {" "}
          {`Check Out: ${
            data?.checkout_time ? FormatTime(data?.checkout_time) : "-"
          }`}
        </Card.Text>
      </Card.Body>
    </Card>
  );
};

export default CardComponent;
