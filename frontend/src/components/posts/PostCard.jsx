import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import apiService from "../../services/api";
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Button,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Download,
  Delete,
  MusicNote,
  PictureAsPdf,
  AudioFile,
} from "@mui/icons-material";

function PostCard({ post, onDelete }) {
  const { user } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState({});
  const [error, setError] = useState("");

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "success";
      case "processing":
        return "warning";
      case "pending":
        return "info";
      case "failed":
        return "error";
      default:
        return "default";
    }
  };

  const handleDownload = async (type) => {
    setDownloading({ ...downloading, [type]: true });
    setError("");

    try {
      const response = await apiService.getDownloadUrl(
        user.token,
        post.postId,
        type,
      );
      const { downloadUrl, fileName } = response.data;

      // Create temporary link and trigger download
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(err.response?.data?.error || `Failed to download ${type}`);
    } finally {
      setDownloading({ ...downloading, [type]: false });
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError("");

    try {
      await apiService.deletePost(user.token, post.postId);
      setDeleteDialogOpen(false);
      if (onDelete) {
        onDelete(post.postId);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete post");
      setDeleting(false);
    }
  };

  return (
    <>
      <Card>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              mb: 2,
            }}
          >
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" gutterBottom>
                {post.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {post.description || "No description"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Created: {new Date(post.createdAt).toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip
                label={post.status}
                color={getStatusColor(post.status)}
                size="small"
              />
              <IconButton
                size="small"
                color="error"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Delete />
              </IconButton>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {post.status === "processing" && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Processing... (10-15 minutes)
              </Typography>
            </Box>
          )}

          {post.status === "completed" && (
            <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={
                  downloading.musicxml ? (
                    <CircularProgress size={16} />
                  ) : (
                    <PictureAsPdf />
                  )
                }
                onClick={() => handleDownload("musicxml")}
                disabled={downloading.musicxml}
              >
                MusicXML
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={
                  downloading.midi ? (
                    <CircularProgress size={16} />
                  ) : (
                    <MusicNote />
                  )
                }
                onClick={() => handleDownload("midi")}
                disabled={downloading.midi}
              >
                MIDI
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={
                  downloading.mp3 ? (
                    <CircularProgress size={16} />
                  ) : (
                    <AudioFile />
                  )
                }
                onClick={() => handleDownload("mp3")}
                disabled={downloading.mp3}
              >
                MP3
              </Button>
            </Box>
          )}

          {post.status === "failed" && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Processing failed. Please try uploading again.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Post?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "<strong>{post.title}</strong>"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" disabled={deleting}>
            {deleting ? <CircularProgress size={24} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default PostCard;
