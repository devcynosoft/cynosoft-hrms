import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import download from "downloadjs";
import moment from "moment";

export async function generateAttendancePdf(data) {
  // Create a new PDF Document
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  const page = pdfDoc.addPage([600, 400]);
  const { width, height } = page.getSize();

  // Title
  page.drawText("Attendance Report", {
    x: 50,
    y: height - 50,
    size: 20,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  const timeToSeconds = (time) => {
    const [hours, minutes, seconds] = time.split(":").map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  };

  // Function to convert total seconds back to HH:mm:ss format
  const secondsToTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [
      String(hours).padStart(2, "0"),
      String(minutes).padStart(2, "0"),
      String(seconds).padStart(2, "0"),
    ].join(":");
  };

  // Filter entries with non-null 'hour' and sum their seconds
  const totalSeconds = data
    ?.filter((item) => item?.total_hour !== null)
    ?.reduce((acc, item) => acc + timeToSeconds(item?.total_hour), 0);
  const totalHours = secondsToTime(totalSeconds);


  page.drawText(`Hours Count: ${totalHours}`, {
    x: width - 200, // Adjust x value to align to the right
    y: height - 50,
    size: 14,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  // Set up the headers
  const headers = ["Date", "Check-in", "Check-out", "Total Hours"];
  const startY = height - 100;

  headers.forEach((header, index) => {
    page.drawText(header, {
      x: 50 + index * 120,
      y: startY,
      size: 14,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });
  });

  // Add the data
  data?.forEach((item, rowIndex) => {
    const rowY = startY - (rowIndex + 1) * 20;

    // Format the date from checkin_time
    const date = item?.checkin_time
      ? moment(item?.checkin_time).format("YYYY-MM-DD")
      : "N/A";
    const checkin = item?.checkin_time
      ? moment.utc(item?.checkin_time).local().format("hh:mm:ss A")
      : "N/A";
    const checkout = item?.checkout_time
      ? moment.utc(item?.checkout_time).local().format("hh:mm:ss A")
      : "N/A";
    const totalHour = item?.total_hour ? item?.total_hour : "N/A";

    const values = [date, checkin, checkout, totalHour];

    values.forEach((value, index) => {
      page.drawText(value, {
        x: 50 + index * 120,
        y: rowY,
        size: 10,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      });
    });
  });

  // Serialize the PDF document to bytes
  const pdfBytes = await pdfDoc.save();

  // Download the PDF
  download(pdfBytes, "attendance_report.pdf", "application/pdf");
}
