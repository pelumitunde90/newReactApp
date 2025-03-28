import React from "react";
import DocumentUploader from "./components/DocumentUploader";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { Box, Button } from "@mui/material";

const App: React.FC = () => {
  const { signOut } = useAuthenticator();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        p: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: 800, // Optional: limits the width for better readability on large screens
          gap: 2,      // Adds consistent spacing between items
        }}
      >
        {/* Technical datasheet mismatch checker UI */}
        <DocumentUploader />

        {/* Sign-out button: placed directly below the UI */}
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="outlined" onClick={signOut}>
            Sign out
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default App;
