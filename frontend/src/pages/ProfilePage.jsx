import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { apiConfig } from "../config/cognito";
import {
  Container,
  Box,
  Paper,
  Typography,
  Button,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import { AccountCircle, Email, MusicNote, Logout } from "@mui/icons-material";

function ProfilePage() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [profileCreated, setProfileCreated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    } else {
      createProfileIfNeeded();
    }
  }, [isAuthenticated, navigate]);

  const createProfileIfNeeded = async () => {
    if (!user?.token) return;

    setLoading(true);
    try {
      // Call create profile endpoint
      await axios.post(
        `${apiConfig.baseURL}/users/profile`,
        {
          name: user.signInDetails?.loginId || "User",
        },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      );
      setProfileCreated(true);
    } catch (err) {
      // If profile already exists, that's fine
      if (err.response?.status === 409 || err.response?.status === 200) {
        setProfileCreated(true);
      } else {
        setError("Failed to create profile");
        console.error("Profile creation error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper elevation={3} sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
            <Avatar
              sx={{ width: 80, height: 80, mr: 3, bgcolor: "primary.main" }}
            >
              <AccountCircle sx={{ fontSize: 60 }} />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h4" component="h1">
                My Profile
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Welcome to Music Score Platform
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Logout />}
              onClick={handleLogout}
            >
              Logout
            </Button>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* User Info */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <Email sx={{ mr: 1, color: "text.secondary" }} />
                    <Typography variant="body1">
                      <strong>Email:</strong>{" "}
                      {user?.signInDetails?.loginId || "N/A"}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <AccountCircle sx={{ mr: 1, color: "text.secondary" }} />
                    <Typography variant="body1">
                      <strong>User ID:</strong> {user?.userId || "N/A"}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card
                variant="outlined"
                sx={{ bgcolor: "primary.light", color: "primary.contrastText" }}
              >
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <MusicNote sx={{ mr: 2, fontSize: 40 }} />
                    <Box>
                      <Typography variant="h6">
                        Ready to Upload Music!
                      </Typography>
                      <Typography variant="body2">
                        Your profile is set up. Start uploading sheet music to
                        convert to digital formats.
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📊 Quick Stats
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-around",
                    mt: 2,
                  }}
                >
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h4" color="primary">
                      0
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Posts
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h4" color="success.main">
                      0
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Completed
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h4" color="warning.main">
                      0
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Processing
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Quick Actions */}
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate("/my-posts")}
            >
              My Posts
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate("/feed")}
              disabled
            >
              Feed (Coming Soon)
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default ProfilePage;
