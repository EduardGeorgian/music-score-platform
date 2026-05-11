import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import apiService from "../../services/api";
import {
  Card,
  CardMedia,
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
  TextFields,
  Image,
  VideoLibrary,
} from "@mui/icons-material";

function PostCard({ post, onDelete }) {
  const { user } = useAuth();
  const [currentPost, setCurrentPost] = useState(post);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState({});
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    let isMounted = true;

    if (previewUrl) return; // Dacă deja avem preview, nu încercăm să-l luăm din nou
    if (currentPost.postType === "score" || currentPost.postType === "image") {
      const fetchPreview = async () => {
        try {
          const response = await apiService.getDownloadUrl(
            user.token,
            currentPost.postId,
            "preview",
          );
          if (isMounted) {
            setPreviewUrl(response.data.downloadUrl);
          }
        } catch (err) {
          console.error("Nu s-a putut încărca preview-ul", err);
        }
      };

      fetchPreview();
    }

    return () => {
      isMounted = false;
    };
  }, [currentPost.postId, currentPost.postType, user.token]);

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

  const getPostTypeIcon = (type) => {
    switch (type) {
      case "score":
        return <MusicNote />;
      case "text":
        return <TextFields />;
      case "image":
        return <Image />;
      case "video":
        return <VideoLibrary />;
      default:
        return <MusicNote />;
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
      <Card sx={{ overflow: "hidden", borderRadius: 2 }}>
        <CardContent>
          {previewUrl && (
            <CardMedia
              component="img"
              height="300" // Poți schimba în funcție de cât de înaltă vrei poza
              image={previewUrl}
              alt={currentPost.title}
              loading="lazy"
              sx={{
                objectFit: "cover", // Taie frumos marginile dacă poza e ciudată
                backgroundColor: "#f5f5f5",
              }}
            />
          )}
          {currentPost.postType === "text" && (
            <Box
              sx={{
                height: 300, // Aceeași înălțime ca pozele!
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                // Un gradient subtil și modern (poți schimba culorile dacă vrei)
                background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
                color: "text.secondary",
              }}
            >
              <TextFields sx={{ fontSize: 80, opacity: 0.5, mb: 1 }} />
              <Typography
                variant="overline"
                sx={{ opacity: 0.6, letterSpacing: 2 }}
              >
                Article / Text
              </Typography>
            </Box>
          )}

          {/* (Opțional) Același lucru și pentru VIDEO, dacă vrei să arate uniform */}
          {currentPost.postType === "video" && (
            <Box
              sx={{
                height: 300,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)", // Gradient albastru închis pentru video
                color: "white",
              }}
            >
              <VideoLibrary sx={{ fontSize: 80, opacity: 0.8, mb: 1 }} />
              <Typography
                variant="overline"
                sx={{ opacity: 0.8, letterSpacing: 2 }}
              >
                Video Clip
              </Typography>
            </Box>
          )}
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
              {post.postType === "score" && ( // Only show status for score posts
                <Chip
                  label={post.status}
                  color={getStatusColor(post.status)}
                  size="small"
                />
              )}
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
          <Chip
            icon={getPostTypeIcon(post.postType)}
            label={post.postType}
            size="small"
            sx={{ mr: 1 }}
          />

          {/* Text Content (for text posts) */}
          {post.postType === "text" && post.content && (
            <Typography variant="body1" sx={{ mt: 2, whiteSpace: "pre-wrap" }}>
              {post.content}
            </Typography>
          )}

          {post.status === "processing" && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Processing... (10-15 minutes)
              </Typography>
            </Box>
          )}

          {post.postType === "score" && post.status === "completed" && (
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
