import React from 'react';
import DocumentUploader from './components/DocumentUploader';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Box, Button } from '@mui/material';

const App: React.FC = () => {
  const { signOut } = useAuthenticator();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
      }}
    >
      {/* Wrap the DocumentUploader in a relative container */}
      <Box sx={{ position: "relative", display: "inline-block" }}>
        <DocumentUploader />
        {/* Sign out button positioned a little below the UI, at the bottom-right */}
        <Box
          sx={{
            position: "absolute",
            bottom: 260,  // Adjust this value to control how far below the UI the button appears
            right: 25,
          }}
        >
          <Button variant="outlined" onClick={signOut}>
            Sign out
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default App;