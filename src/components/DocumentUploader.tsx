import React, { useState, ChangeEvent } from 'react';
import { uploadData } from '@aws-amplify/storage';
import ExcelJS from 'exceljs';


interface Mismatch {
  row: number;
  description?: string;
  technical?: string;
  vendor?: string;
  error?: string;
}

// Helper function to extract a cell's text value.
// If the cell contains a formula, its value is typically an object with a "result" property.
const getCellText = (cellValue: any): string => {
  if (cellValue === null || cellValue === undefined) return "";
  if (typeof cellValue === 'object') {
    // If the cell has a computed result, return that.
    if ('result' in cellValue && cellValue.result !== undefined && cellValue.result !== null) {
      return String(cellValue.result).trim();
    }
    // Fallback: sometimes ExcelJS may provide a .text property.
    if ('text' in cellValue && cellValue.text) {
      return String(cellValue.text).trim();
    }
    return "";
  }
  return String(cellValue).trim();
};

const DocumentUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string>("");

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("No file selected.");
      return;
    }
    setError("");

    try {
      // Upload the original file to S3.
      const result = await uploadData({
        path: `document-uploads/${file.name}`,
        data: file,
      });
      setUploadResult(result);
      console.log("Original file upload successful:", result);

      // Process only Excel files.
      if (
        file.type.includes("excel") ||
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls")
      ) {
        const reader = new FileReader();

        reader.onload = async (evt) => {
          try {
            const arrayBuffer = evt.target?.result;
            if (!arrayBuffer) {
              setError("Failed to read file data.");
              return;
            }

            // Load the workbook from the arrayBuffer using ExcelJS.
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer as ArrayBuffer);

            // Assume the first worksheet contains the data.
            const worksheet = workbook.worksheets[0];

            // We'll iterate over rows starting from row 3.
            const mismatches: Mismatch[] = [];
            const ignoreValues = ["", "N/A", "0", "No"];

            worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
              if (rowNumber < 3) return; // Skip header rows.

              // Read cells by column letter.
              const descriptionVal = row.getCell('B').value;
              const technicalVal = row.getCell('D').value;
              const vendorVal = row.getCell('E').value;

              const description = getCellText(descriptionVal);
              const technical = getCellText(technicalVal);
              const vendor = getCellText(vendorVal);

              // Skip the row if technical requirement is one of the ignore values.
              if (ignoreValues.includes(technical)) return;

              if (technical === "Vendor to furnish") {
                // If vendor data is empty, record mismatch.
                if (!vendor) {
                  mismatches.push({
                    row: rowNumber,
                    description,
                    technical,
                    vendor,
                    error: "Vendor data is empty",
                  });
                }
              } else {
                // Otherwise, flag if vendor data is empty or does not match.
                if (!vendor || technical !== vendor) {
                  let errorMsg = "";
                  if (!vendor) errorMsg += "Vendor data is empty. ";
                  if (vendor && technical !== vendor) errorMsg += "Values do not match.";
                  mismatches.push({
                    row: rowNumber,
                    description,
                    technical,
                    vendor,
                    error: errorMsg.trim(),
                  });
                }
              }
            });

            // If mismatches exist, create a new workbook for the mismatch report using ExcelJS.
            if (mismatches.length > 0) {
              const reportWorkbook = new ExcelJS.Workbook();
              const reportWorksheet = reportWorkbook.addWorksheet("Mismatch Report");

              // Add and style the header row.
              const headerRow = reportWorksheet.addRow([
                "Row",
                "Description",
                "Technical Requirement",
                "Vendor Data",
                "Error",
              ]);
              headerRow.eachCell((cell) => {
                cell.font = { bold: true };
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFADD8E6' } // Light blue background.
                };
              });

              // Add each mismatch data row.
              mismatches.forEach((m) => {
                reportWorksheet.addRow([
                  m.row,
                  m.description,
                  m.technical,
                  m.vendor,
                  m.error,
                ]);
              });

              // Adjust column widths.
              reportWorksheet.columns = [
                { width: 8 },   // Row number
                { width: 25 },  // Description
                { width: 35 },  // Technical Requirement
                { width: 25 },  // Vendor Data
                { width: 40 }   // Error
              ];

              // Write the report workbook to a buffer and trigger download.
              const buffer = await reportWorkbook.xlsx.writeBuffer();
              const blob = new Blob(
                [buffer],
                { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
              );
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${file.name}-MismatchReport.xlsx`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            } else {
              console.log("No mismatches found.");
            }
          } catch (err: any) {
            setError("Error processing Excel file: " + err.message);
          }
        };

        reader.onerror = (evt) => {
          const errObj = evt.target?.error;
          setError("Error reading file: " + (errObj ? errObj.message : "Unknown error"));
        };

        reader.readAsArrayBuffer(file);
      } else {
        setError("Unsupported file format. Please upload an Excel file.");
      }
    } catch (err: any) {
      setError("Error uploading file: " + err.message);
    }
  };

  return (
    <div>
      <h2>Technical Datasheet Mismatch Checker</h2>
      <input type="file" accept=".xlsx,.xls" onChange={handleChange} />
      <button onClick={handleUpload}>Upload</button>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      {uploadResult && <p>Original file uploaded details: {JSON.stringify(uploadResult)}</p>}
    </div>
  );
};

export default DocumentUploader;
