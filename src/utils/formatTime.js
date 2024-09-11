const FormatTime = (checkinTime) => {
    // Create a Date object from the checkin time
    let currDate = new Date(checkinTime);
    const timeZoneOffset = currDate.getTimezoneOffset(); // Offset in minutes
    currDate = new Date(currDate.getTime() - timeZoneOffset * 60000);
  
    // Format the time to local time in 12-hour format with AM/PM
    const formattedTime = currDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  
    return formattedTime;
  };
  
  export default FormatTime;
  