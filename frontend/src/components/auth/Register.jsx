import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Paper,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";

function Register() {
  const [step, setStep] = useState(0); // 0: Register, 1: Confirm
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { register, confirmRegistration } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await register(email, password, name);
      setSuccess("Account created! Check your email for verification code.");
      setStep(1); // Move to confirmation step
    } catch (err) {
      setError(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await confirmRegistration(email, confirmationCode);
      setSuccess("Account confirmed! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.message || "Failed to confirm account");
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            🎵 Register
          </Typography>

          <Stepper activeStep={step} sx={{ mb: 4 }}>
            <Step>
              <StepLabel>Create Account</StepLabel>
            </Step>
            <Step>
              <StepLabel>Verify Email</StepLabel>
            </Step>
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {step === 0 ? (
            <form onSubmit={handleRegister}>
              <TextField
                fullWidth
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                margin="normal"
                required
                autoFocus
              />

              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                required
              />

              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
                helperText="Minimum 8 characters, include uppercase, lowercase, and numbers"
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 3, mb: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : "Register"}
              </Button>

              <Box sx={{ textAlign: "center" }}>
                <Typography variant="body2">
                  Already have an account?{" "}
                  <Link to="/login" style={{ textDecoration: "none" }}>
                    Login here
                  </Link>
                </Typography>
              </Box>
            </form>
          ) : (
            <form onSubmit={handleConfirm}>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Enter the verification code sent to <strong>{email}</strong>
              </Typography>

              <TextField
                fullWidth
                label="Verification Code"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                margin="normal"
                required
                autoFocus
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 3, mb: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : "Confirm Account"}
              </Button>

              <Button
                fullWidth
                variant="text"
                onClick={() => setStep(0)}
                disabled={loading}
              >
                Back to Registration
              </Button>
            </form>
          )}
        </Paper>
      </Box>
    </Container>
  );
}

export default Register;
