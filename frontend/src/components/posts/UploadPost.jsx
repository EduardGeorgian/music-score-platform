import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import apiService from "../../services/api";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  LinearProgress,
  Typography,
  Alert,
  IconButton,
  Paper,
} from "@mui/material";
import { Close, CloudUpload, Image as ImageIcon } from "@mui/icons-material";

function UploadPost({ open, onClose, onSuccess, postData }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0); // 0: select, 1: uploading, 2: processing
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [postId, setPostId] = useState(null);
  const [canDismiss, setCanDismiss] = useState(false);
  const [processingInBackground, setProcessingInBackground] = useState(false);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/") && postData?.postType === "score") {
      setError("Please select an image file for sheet music");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);
    setError("");

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null); // No preview for videos
    }
  };

  const handleSubmit = async () => {
    // Folosim datele venite din fereastra anterioară (CreatePostDialog)
    if (!selectedFile) {
      setError("Please select a file to upload");
      return;
    }

    setStep(1);
    setError("");

    try {
      // Step 1: Create post and get presigned URL (folosind detaliile din postData)
      const createResponse = await apiService.createPost(user.token, {
        title: postData.title,
        description: postData.description,
        postType: postData.postType,
        contentType: selectedFile.type,
        fileName: selectedFile.name,
      });

      const { postId: newPostId, uploadUrl } = createResponse.data;
      setPostId(newPostId);

      // Step 2: Upload image to S3
      await apiService.uploadToS3(uploadUrl, selectedFile, setUploadProgress);

      // Step 3: Start polling for completion (Doar pentru scores)
      if (postData.postType === "score") {
        setStep(2);
        pollPostStatus(newPostId);
      } else {
        // Pentru Image sau Video simple, oprim aici, nu e nevoie de procesare AI
        handleSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed");
      setStep(0);
      console.error("Upload error:", err);
    }
  };

  const pollPostStatus = async (id) => {
    setCanDismiss(true);

    const maxAttempts = 180; // ~30 minutes
    let attempts = 0;

    const poll = setInterval(async () => {
      try {
        const response = await apiService.getPost(id);
        const { status } = response.data;

        if (status === "completed") {
          clearInterval(poll);
          if (!processingInBackground) {
            handleSuccess();
          } else {
            console.log("Post processing completed!");
          }
        } else if (status === "failed") {
          clearInterval(poll);
          if (!processingInBackground) {
            setError("Processing failed");
            setStep(0);
          }
        }

        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(poll);
        }
      } catch (err) {
        clearInterval(poll);
      }
    }, 10000);

    window.postPollingInterval = poll;
  };

  const handleSuccess = () => {
    setStep(0);
    setSelectedFile(null);
    setPreview(null);
    setUploadProgress(0);
    setPostId(null);

    if (onSuccess) {
      onSuccess(postId);
    }

    onClose();
  };

  const handleClose = (event, reason) => {
    if (
      (step === 1 || step === 2) &&
      (reason === "backdropClick" || reason === "escapeKeyDown")
    ) {
      return;
    }

    if (step === 1 && !reason) {
      return;
    }

    setStep(0);
    setSelectedFile(null);
    setPreview(null);
    setUploadProgress(0);
    setError("");
    setPostId(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6">
            {/* Arată titlul în funcție de tipul ales în prima fereastră */}
            Upload {postData?.postType === "video" ? "Video" : "File"} for "
            {postData?.title}"
          </Typography>
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

        {/* Step 0: Select Image ONLY */}
        {step === 0 && (
          <>
            <Button
              variant="outlined"
              component="label"
              fullWidth
              startIcon={<CloudUpload />}
              sx={{ mb: 2, py: 2 }}
            >
              {selectedFile ? "Change File" : "Select File"}
              <input
                type="file"
                hidden
                accept={postData?.postType === "video" ? "video/*" : "image/*"}
                onChange={handleFileSelect}
              />
            </Button>

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
            {/* Notă: Pentru clipuri video nu am pus preview ca să nu complic codul, va arăta doar numele fișierului */}
            {selectedFile && !preview && (
              <Typography
                variant="caption"
                display="block"
                sx={{ mt: 1, textAlign: "center" }}
              >
                {selectedFile?.name} ({(selectedFile?.size / 1024).toFixed(1)}{" "}
                KB)
              </Typography>
            )}
          </>
        )}

        {/* Step 1: Uploading */}
        {step === 1 && (
          <Box sx={{ textAlign: "center", py: 3 }}>
            <CloudUpload sx={{ fontSize: 60, color: "primary.main", mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Uploading File...
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

        {/* Step 2: Processing (Doar pt scores) */}
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
              disabled={!selectedFile}
            >
              Upload {postData?.postType === "score" ? "& Process" : ""}
            </Button>
          </>
        )}

        {step === 1 && (
          <Typography variant="caption" color="text.secondary" sx={{ px: 2 }}>
            Uploading... Please wait
          </Typography>
        )}

        {step === 2 && (
          <>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ px: 2, flexGrow: 1 }}
            >
              Processing will continue in background...
            </Typography>
            <Button
              variant="contained"
              onClick={() => {
                setProcessingInBackground(true);
                handleClose();
              }}
              disabled={!canDismiss}
            >
              Continue Browsing
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default UploadPost;
