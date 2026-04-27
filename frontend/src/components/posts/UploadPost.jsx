import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import apiService from "../../services/api";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  LinearProgress,
  Typography,
  Alert,
  IconButton,
  Paper,
} from "@mui/material";
import {
  Close,
  CloudUpload,
  Image as ImageIcon,
  CheckCircle,
} from "@mui/icons-material";

function UploadPost({ open, onClose, onSuccess }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0); // 0: select, 1: uploading, 2: processing
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [postId, setPostId] = useState(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);
    setError("");

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile || !title.trim()) {
      setError("Please select an image and enter a title");
      return;
    }

    setStep(1);
    setError("");

    try {
      // Step 1: Create post and get presigned URL
      const createResponse = await apiService.createPost(user.token, {
        title: title.trim(),
        description: description.trim(),
      });

      const { postId: newPostId, uploadUrl } = createResponse.data;
      setPostId(newPostId);

      // Step 2: Upload image to S3
      await apiService.uploadToS3(uploadUrl, selectedFile, setUploadProgress);

      // Step 3: Start polling for completion
      setStep(2);
      pollPostStatus(newPostId);
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed");
      setStep(0);
      console.error("Upload error:", err);
    }
  };

  const pollPostStatus = async (id) => {
    const maxAttempts = 120; // 10 minutes (10 second intervals)
    let attempts = 0;

    const poll = setInterval(async () => {
      try {
        const response = await apiService.getPost(id);
        const { status } = response.data;

        if (status === "completed") {
          clearInterval(poll);
          handleSuccess();
        } else if (status === "failed") {
          clearInterval(poll);
          setError("Processing failed. Please try again.");
          setStep(0);
        }

        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(poll);
          setError(
            "Processing is taking longer than expected. Check back later.",
          );
          setStep(0);
        }
      } catch (err) {
        clearInterval(poll);
        setError("Failed to check status");
        setStep(0);
      }
    }, 10000); // Poll every 10 seconds
  };

  const handleSuccess = () => {
    setStep(0);
    setSelectedFile(null);
    setPreview(null);
    setTitle("");
    setDescription("");
    setUploadProgress(0);
    setPostId(null);

    if (onSuccess) {
      onSuccess(postId);
    }

    onClose();
  };

  // TODO: Add cancel upload functionality (requires backend support to cancel processing and delete S3 object)
  // TODO: Add background upload and processing to avoid blocking UI

  const handleClose = () => {
    if (step === 1 || step === 2) {
      // Don't allow closing during upload/processing
      return;
    }

    setStep(0);
    setSelectedFile(null);
    setPreview(null);
    setTitle("");
    setDescription("");
    setUploadProgress(0);
    setError("");
    setPostId(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={step === 1 || step === 2}
    >
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6">Upload Sheet Music</Typography>
          {step === 0 && (
            <IconButton onClick={handleClose} size="small">
              <Close />
            </IconButton>
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Step 0: Select Image & Details */}
        {step === 0 && (
          <>
            {/* File Input */}
            <Button
              variant="outlined"
              component="label"
              fullWidth
              startIcon={<CloudUpload />}
              sx={{ mb: 2, py: 2 }}
            >
              {selectedFile ? "Change Image" : "Select Image"}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleFileSelect}
              />
            </Button>

            {/* Preview */}
            {preview && (
              <Paper
                elevation={3}
                sx={{
                  p: 2,
                  mb: 2,
                  textAlign: "center",
                  backgroundColor: "#f5f5f5",
                }}
              >
                <img
                  src={preview}
                  alt="Preview"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "300px",
                    objectFit: "contain",
                  }}
                />
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  {selectedFile?.name} ({(selectedFile?.size / 1024).toFixed(1)}{" "}
                  KB)
                </Typography>
              </Paper>
            )}

            {/* Title */}
            <TextField
              fullWidth
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              margin="normal"
              required
              placeholder="e.g., Beethoven Symphony No. 5"
            />

            {/* Description */}
            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              margin="normal"
              multiline
              rows={3}
              placeholder="Optional: Add details about this score..."
            />
          </>
        )}

        {/* Step 1: Uploading */}
        {step === 1 && (
          <Box sx={{ textAlign: "center", py: 3 }}>
            <CloudUpload sx={{ fontSize: 60, color: "primary.main", mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Uploading Image...
            </Typography>
            <LinearProgress
              variant="determinate"
              value={uploadProgress}
              sx={{ mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              {uploadProgress}% completed
            </Typography>
          </Box>
        )}

        {/* Step 2: Processing */}
        {step === 2 && (
          <Box sx={{ textAlign: "center", py: 3 }}>
            <ImageIcon sx={{ fontSize: 60, color: "primary.main", mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Processing Sheet Music...
            </Typography>
            <LinearProgress sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary" gutterBottom>
              This may take 10-15 minutes
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Converting to MusicXML, MIDI, and MP3...
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {step === 0 && (
          <>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!selectedFile || !title.trim()}
            >
              Upload & Process
            </Button>
          </>
        )}
        {(step === 1 || step === 2) && (
          <Typography variant="caption" color="text.secondary" sx={{ px: 2 }}>
            Please don't close this window...
          </Typography>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default UploadPost;
