import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import download from "downloadjs";
import moment from "moment";

export async function generateAttendancePdf(data) {
  // Create a new PDF Document
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  const logoUrl = "/assets/images/logo-light.png";
  const logoImageBytes = await fetch(logoUrl).then((res) => res.arrayBuffer());
  const logoImage = await pdfDoc.embedPng(logoImageBytes);

  const pageWidth = 595;
  const pageHeight = 841; // A4 size
  const rowHeight = 20; // Each row's height

  // Margins
  const topMargin = 160; // Space for the title and logo
  const bottomMargin = 100; // Space for the signature
  const availableHeight = pageHeight - topMargin - bottomMargin;

  const maxRowsPerPage = Math.floor(availableHeight / rowHeight); // Maximum rows per page

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - topMargin;

  // Time to Seconds Conversion
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

  const earlyOutCount = data?.filter((item) => {
    return item?.early_out;
  }).length;

  // Function to add headers and title
  const addHeader = (page, y) => {
    // Add logo
    const logoWidth = 177; // Width of the logo
    const logoHeight = 44; // Height of the logo
    page.drawImage(logoImage, {
      x: 10,
      y: pageHeight - logoHeight - 10,
      width: logoWidth,
      height: logoHeight,
    });

    // Title
    page.drawText("Attendance Report", {
      x: 25,
      y: pageHeight - 100,
      size: 20,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });

    page.drawText(`Name: ${data?.[0]?.employees?.name}`, {
      x: 25,
      y: pageHeight - 130,
      size: 12,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });

    // Display total hours and early outs
    page.drawText(`Hours Count: ${totalHours}`, {
      x: pageWidth - 150, // Adjust x value to align to the right
      y: pageHeight - 80,
      size: 12,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });

    page.drawText(`Early Out: ${earlyOutCount}`, {
      x: pageWidth - 150, // Adjust x value to align to the right
      y: pageHeight - 100,
      size: 12,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });

    // Set up the headers
    const headers = ["Date", "Check-in", "Check-out", "Total Hours"];
    const headerXPositions = [50, 170, 290, 410];
    headers.forEach((header, index) => {
      page.drawText(header, {
        x: headerXPositions[index],
        y: y, // Adjust Y position for the headers
        size: 14,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      });
    });
  };

  const addSignature = (page) => {
    // Add the signature area at the bottom of the page
    page.drawText(`Signature Here :`, {
      x: 10,
      y: 30, // Bottom margin for the signature
      size: 14,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });
  };

  // Add headers on the first page
  addHeader(currentPage, currentY);

  // Function to add a new page and headers when needed
  const addNewPage = () => {
    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    currentY = pageHeight - topMargin;
    addHeader(currentPage, currentY);
  };

  // Add the data rows
  data?.forEach((item, rowIndex) => {
    if (rowIndex > 0 && rowIndex % maxRowsPerPage === 0) {
      addSignature(currentPage); // Add signature to the previous page before creating a new one
      addNewPage(); // Create a new page when the data exceeds one page
    }

    const rowY = currentY - ((rowIndex % maxRowsPerPage) + 1) * rowHeight;

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
    const valueXPositions = [50, 170, 290, 410];

    values.forEach((value, index) => {
      currentPage.drawText(value, {
        x: valueXPositions[index],
        y: rowY,
        size: 10,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      });
    });
  });

  // Add signature to the last page
  addSignature(currentPage);

  // Serialize the PDF document to bytes
  const pdfBytes = await pdfDoc.save();

  // Download the PDF
  download(pdfBytes, "attendance_report.pdf", "application/pdf");
}
