import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Container, Box, Typography, Button, Paper, Grid } from "@mui/material";
import { MusicNote, CloudUpload, Download } from "@mui/icons-material";

function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Box sx={{ textAlign: "center", mb: 6 }}>
          <Typography variant="h2" component="h1" gutterBottom>
            🎵 Music Score Platform
          </Typography>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            Convert Sheet Music to Digital Formats
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Upload photos of sheet music and get MusicXML, MIDI, and MP3 files
            automatically
          </Typography>

          <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
            {isAuthenticated ? (
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate("/profile")}
              >
                Go to Profile
              </Button>
            ) : (
              <>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate("/login")}
                >
                  Login
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate("/register")}
                >
                  Register
                </Button>
              </>
            )}
          </Box>
        </Box>

        <Grid container spacing={4} sx={{ mt: 4 }}>
          <Grid item xs={12} md={4}>
            <Paper
              elevation={3}
              sx={{ p: 3, textAlign: "center", height: "100%" }}
            >
              <CloudUpload
                sx={{ fontSize: 60, color: "primary.main", mb: 2 }}
              />
              <Typography variant="h6" gutterBottom>
                Upload Sheet Music
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Take a photo or upload a scan of your sheet music
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper
              elevation={3}
              sx={{ p: 3, textAlign: "center", height: "100%" }}
            >
              <MusicNote sx={{ fontSize: 60, color: "primary.main", mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Automatic Processing
              </Typography>
              <Typography variant="body2" color="text.secondary">
                AI-powered OMR converts your music to digital format
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper
              elevation={3}
              sx={{ p: 3, textAlign: "center", height: "100%" }}
            >
              <Download sx={{ fontSize: 60, color: "primary.main", mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Download & Share
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Get MusicXML, MIDI, and MP3 files ready to use
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

export default LandingPage;
