import moment from "moment";

const CalculateDaysDifference = (startDate, endDate) => {
  const start = moment(startDate);
  const end = moment(endDate);
  let workingDays = 0;
  while (start <= end) {
    // Check if the day is not Saturday (6) or Sunday (0)
    if (start.day() !== 0 && start.day() !== 6) {
      workingDays++;
    }
    start.add(1, "days");
  }

  return workingDays;
};

export default CalculateDaysDifference
