import React, { useState, ChangeEvent } from "react";
import { uploadData } from "@aws-amplify/storage";
import ExcelJS from "exceljs";
import {
  Button,
  Container,
  Typography,
  Box,
  Input,
  LinearProgress,
  Alert,
  Paper,
} from "@mui/material";

interface Mismatch {
  row: number;
  description?: string;
  technical?: string;
  vendor?: string;
  error?: string;
}

// Helper function for extracting cell text.
const getCellText = (cellValue: any): string => {
  if (cellValue === null || cellValue === undefined) return "";
  if (typeof cellValue === "object") {
    if (
      "result" in cellValue &&
      cellValue.result !== undefined &&
      cellValue.result !== null
    ) {
      return String(cellValue.result).trim();
    }
    if ("text" in cellValue && cellValue.text) {
      return String(cellValue.text).trim();
    }
    return "";
  }
  return String(cellValue).trim();
};

const DocumentUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string>("");
  // Mismatches are processed for the Excel export only.
  const [, setMismatches] = useState<Mismatch[]>([]);

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
    setUploading(true);

    try {
      // Upload the original file to S3.
      const result = await uploadData({
        path: `document-uploads/${file.name}`,
        data: file,
      });
      setUploadResult(result);
      console.log("Original file upload successful:", result);

      // Only process Excel files.
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

            // Load the workbook using ExcelJS.
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer as ArrayBuffer);
            const worksheet = workbook.worksheets[0];

            // Process Excel rows starting from row 3.
            const newMismatches: Mismatch[] = [];
            const ignoreValues = ["", "N/A", "0", "No"];

            worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
              if (rowNumber < 3) return; // Skip header rows

              // Read values from specific columns.
              const descriptionVal = row.getCell("B").value;
              const technicalVal = row.getCell("D").value;
              const vendorVal = row.getCell("E").value;

              const description = getCellText(descriptionVal);
              const technical = getCellText(technicalVal);
              const vendor = getCellText(vendorVal);

              if (ignoreValues.includes(technical)) return;

              if (
                technical === "Vendor to furnish" ||
                technical === "Designer to Furnish"
              ) {
                // Record mismatch if vendor data is empty.
                if (!vendor) {
                  newMismatches.push({
                    row: rowNumber,
                    description,
                    technical,
                    vendor,
                    error: "Vendor data is empty",
                  });
                }
              } else {
                // Otherwise, flag if vendor data is missing or doesn't match.
                if (!vendor || technical !== vendor) {
                  let errorMsg = "";
                  if (!vendor) errorMsg += "Vendor data is empty. ";
                  if (vendor && technical !== vendor)
                    errorMsg += "Values do not match.";
                  newMismatches.push({
                    row: rowNumber,
                    description,
                    technical,
                    vendor,
                    error: errorMsg.trim(),
                  });
                }
              }
            });

            // Generate and download report if mismatches are found.
            if (newMismatches.length > 0) {
              const reportWorkbook = new ExcelJS.Workbook();
              const reportWorksheet = reportWorkbook.addWorksheet("Mismatch Report");

              // Create a styled header row.
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
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "FFADD8E6" },
                };
              });

              // Add mismatch rows.
              newMismatches.forEach((m) => {
                reportWorksheet.addRow([
                  m.row,
                  m.description,
                  m.technical,
                  m.vendor,
                  m.error,
                ]);
              });

              // Set column widths.
              reportWorksheet.columns = [
                { width: 8 },
                { width: 25 },
                { width: 35 },
                { width: 25 },
                { width: 40 },
              ];

              // Trigger download of the generated Excel report.
              const buffer = await reportWorkbook.xlsx.writeBuffer();
              const blob = new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              });
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

            // Save mismatches (for generating the report).
            setMismatches(newMismatches);
          } catch (err: any) {
            setError("Error processing Excel file: " + err.message);
          }
        };

        reader.onerror = (evt) => {
          const errObj = evt.target?.error;
          setError(
            "Error reading file: " +
              (errObj ? errObj.message : "Unknown error")
          );
        };

        reader.readAsArrayBuffer(file);
      } else {
        setError("Unsupported file format. Please upload an Excel file.");
      }
    } catch (err: any) {
      setError("Error uploading file: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    // Remove the forced full-height styling by eliminating minHeight:"100vh".
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        // Removed minHeight to let the container height adjust to the content.
        mt: 4, // Optional spacing for vertical margins
        mb: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 3,
            borderRadius: 2,
            border: "1px solid #e0e0e0",
          }}
        >
          <Typography
            variant="h5"
            align="center"
            gutterBottom
            sx={{ fontWeight: "bold", color: "#1e88e5" }}
          >
            Technical Datasheet Mismatch Checker
          </Typography>
          <Box
            display="flex"
            flexDirection="row"
            justifyContent="center"
            alignItems="center"
            gap={2}
            sx={{ mb: 2 }}
          >
            <Input
              type="file"
              inputProps={{ accept: ".xlsx,.xls" }}
              onChange={handleChange}
              disableUnderline
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleUpload}
              disabled={uploading}
            >
              Upload
            </Button>
          </Box>
          {uploading && <LinearProgress sx={{ my: 2 }} />}
          {error && (
            <Alert severity="error" sx={{ my: 2 }}>
              {error}
            </Alert>
          )}
          {uploadResult && (
            <Alert severity="success" sx={{ my: 2 }}>
              File uploaded successfully!
            </Alert>
          )}
        </Paper>
        {/* The Sign Out button (or any additional components) can be placed outside this Paper */}
      </Container>
    </Box>
  );
};

export default DocumentUploader;