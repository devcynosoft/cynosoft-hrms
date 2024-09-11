const calculateTimeDifference = (timestamp, checkoutTime = null) => {
  if(timestamp?.endsWith('Z')){
    timestamp = timestamp.slice(0, -1)
  }
  let currentTime;
  if (checkoutTime) {
    currentTime = new Date(checkoutTime);
  } else {
    currentTime = new Date();
  }

  // Ensure timestamp is a valid Date object
  let checkinTime = new Date(timestamp);

  // Check if both Date objects are valid
  if (isNaN(checkinTime.getTime()) || isNaN(currentTime.getTime())) {
    return "Invalid Date";
  }

  const timeZoneOffset = checkinTime.getTimezoneOffset(); // Offset in minutes
  checkinTime = new Date(checkinTime.getTime() - timeZoneOffset * 60000);

  // Calculate the difference in milliseconds
  const diffMs = currentTime - checkinTime;

  // Check if difference is negative (i.e., currentTime is before checkinTime)
  // if (diffMs < 0) {
  //   return "Negative Difference";
  // }

  // Convert milliseconds to seconds
  const diffSec = Math.floor(diffMs / 1000);

  // Calculate hours, minutes, and seconds
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  // Format hours, minutes, and seconds to be always two digits
  const formattedHours = String(hours).padStart(2, "0");
  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(seconds).padStart(2, "0");

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
};

export default calculateTimeDifference;
