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
  Paper,
  Backdrop,
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
  Close,
} from "@mui/icons-material";

function PostCard({ post, onDelete }) {
  const { user } = useAuth();
  const [currentPost, setCurrentPost] = useState(post);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState({});
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState(false);

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

  const handleDownload = async (e, type) => {
    e.stopPropagation();
    setDownloading({ ...downloading, [type]: true });
    setError("");

    try {
      const response = await apiService.getDownloadUrl(
        user.token,
        post.postId,
        type,
      );
      const { downloadUrl, fileName } = response.data;

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
      setIsExpanded(false);
      setFullScreenImage(false); // Siguranță
      if (onDelete) {
        onDelete(post.postId);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete post");
      setDeleting(false);
    }
  };

  // NOU: Am adăugat parametrul `inModal` pentru a ști când să transformăm click-ul în zoom
  const renderMedia = (height = 300, inModal = false) => (
    <>
      {previewUrl && (
        <CardMedia
          component="img"
          height={height}
          image={previewUrl}
          alt={currentPost.title}
          loading="lazy"
          // Dacă e în modalul deschis, permitem click-ul pentru zoom
          onClick={inModal ? () => setFullScreenImage(true) : undefined}
          sx={{
            objectFit: "cover",
            backgroundColor: "#f5f5f5",
            cursor: inModal ? "zoom-in" : "default", // Cursor lupă
          }}
        />
      )}
      {currentPost.postType === "text" && (
        <Box
          sx={{
            height,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
            color: "text.secondary",
          }}
        >
          <TextFields
            sx={{ fontSize: height > 300 ? 120 : 80, opacity: 0.5, mb: 1 }}
          />
          <Typography
            variant="overline"
            sx={{ opacity: 0.6, letterSpacing: 2 }}
          >
            Article / Text
          </Typography>
        </Box>
      )}
      {currentPost.postType === "video" && (
        <Box
          sx={{
            height,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
            color: "white",
          }}
        >
          <VideoLibrary
            sx={{ fontSize: height > 300 ? 120 : 80, opacity: 0.8, mb: 1 }}
          />
          <Typography
            variant="overline"
            sx={{ opacity: 0.8, letterSpacing: 2 }}
          >
            Video Clip
          </Typography>
        </Box>
      )}
    </>
  );

  return (
    <>
      {/* CARDUL NORMAL DIN GRILĂ */}
      <Card
        onClick={() => setIsExpanded(true)}
        sx={{
          overflow: "hidden",
          borderRadius: 2,
          cursor: "pointer",
          transition: "transform 0.2s, box-shadow 0.2s",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: 4,
          },
        }}
      >
        {renderMedia(300, false)}

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
                {currentPost.title}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                gutterBottom
                sx={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {currentPost.description || "No description"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Created: {new Date(currentPost.createdAt).toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {currentPost.postType === "score" && (
                <Chip
                  label={currentPost.status}
                  color={getStatusColor(currentPost.status)}
                  size="small"
                />
              )}
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteDialogOpen(true);
                }}
              >
                <Delete />
              </IconButton>
            </Box>
          </Box>

          <Chip
            icon={getPostTypeIcon(currentPost.postType)}
            label={currentPost.postType}
            size="small"
            sx={{ mr: 1 }}
          />

          {currentPost.status === "processing" && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Processing... (10-15 minutes)
              </Typography>
            </Box>
          )}

          {currentPost.postType === "score" &&
            currentPost.status === "completed" && (
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
                  onClick={(e) => handleDownload(e, "musicxml")}
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
                  onClick={(e) => handleDownload(e, "midi")}
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
                  onClick={(e) => handleDownload(e, "mp3")}
                  disabled={downloading.mp3}
                >
                  MP3
                </Button>
              </Box>
            )}
        </CardContent>
      </Card>

      {/* DIALOGUL INSTAGRAM STYLE (POSTAREA MĂRITĂ) */}
      <Dialog
        open={isExpanded}
        onClose={() => setIsExpanded(false)}
        maxWidth="md"
        fullWidth
        scroll="paper"
        BackdropProps={{
          sx: {
            backdropFilter: "blur(8px)",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
          },
        }}
        PaperProps={{
          sx: { borderRadius: 3, overflow: "hidden" },
        }}
      >
        <IconButton
          onClick={() => setIsExpanded(false)}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: "white",
            backgroundColor: "rgba(0,0,0,0.4)",
            "&:hover": { backgroundColor: "rgba(0,0,0,0.7)" },
            zIndex: 10,
          }}
        >
          <Close />
        </IconButton>

        {/* NOU: Aici i-am spus să activeze zoom-ul! */}
        {renderMedia(450, true)}

        <DialogContent sx={{ p: 4 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              mb: 3,
            }}
          >
            <Box>
              <Typography variant="h4" gutterBottom>
                {currentPost.title}
              </Typography>
              <Box
                sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}
              >
                <Chip
                  icon={getPostTypeIcon(currentPost.postType)}
                  label={currentPost.postType}
                  size="small"
                />
                {currentPost.postType === "score" && (
                  <Chip
                    label={currentPost.status}
                    color={getStatusColor(currentPost.status)}
                    size="small"
                  />
                )}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 1 }}
                >
                  {new Date(currentPost.createdAt).toLocaleString()}
                </Typography>
              </Box>
            </Box>
            <IconButton color="error" onClick={() => setDeleteDialogOpen(true)}>
              <Delete />
            </IconButton>
          </Box>

          <Typography variant="body1" sx={{ mb: 4, whiteSpace: "pre-wrap" }}>
            {currentPost.description || "No description provided."}
          </Typography>

          {currentPost.postType === "text" && currentPost.content && (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                bgcolor: "grey.50",
                borderLeft: "4px solid",
                borderColor: "primary.main",
                mb: 4,
              }}
            >
              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                {currentPost.content}
              </Typography>
            </Paper>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {currentPost.postType === "score" &&
            currentPost.status === "completed" && (
              <>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 2, color: "text.secondary" }}
                >
                  Download Processing Results:
                </Typography>
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  <Button
                    size="large"
                    variant="contained"
                    startIcon={
                      downloading.musicxml ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <PictureAsPdf />
                      )
                    }
                    onClick={(e) => handleDownload(e, "musicxml")}
                    disabled={downloading.musicxml}
                  >
                    MusicXML
                  </Button>
                  <Button
                    size="large"
                    variant="outlined"
                    startIcon={
                      downloading.midi ? (
                        <CircularProgress size={20} />
                      ) : (
                        <MusicNote />
                      )
                    }
                    onClick={(e) => handleDownload(e, "midi")}
                    disabled={downloading.midi}
                  >
                    MIDI
                  </Button>
                  <Button
                    size="large"
                    variant="outlined"
                    startIcon={
                      downloading.mp3 ? (
                        <CircularProgress size={20} />
                      ) : (
                        <AudioFile />
                      )
                    }
                    onClick={(e) => handleDownload(e, "mp3")}
                    disabled={downloading.mp3}
                  >
                    MP3
                  </Button>
                </Box>
              </>
            )}
        </DialogContent>
      </Dialog>

      {/* NOU: LIGHTBOX PENTRU IMAGINEA MĂRITĂ (FULLSIZE) */}
      <Backdrop
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.tooltip + 100, // Foarte mare ca să stea peste Modalul anterior
          backgroundColor: "rgba(0, 0, 0, 0.95)",
          backdropFilter: "blur(5px)",
        }}
        open={fullScreenImage}
        onClick={() => setFullScreenImage(false)} // Se închide la orice click
      >
        {previewUrl && (
          <img
            src={previewUrl}
            alt={currentPost.title}
            style={{
              maxWidth: "95vw", // Îi dăm voie să ocupe aprope tot ecranul
              maxHeight: "95vh",
              objectFit: "contain",
              cursor: "zoom-out",
            }}
          />
        )}
      </Backdrop>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        zIndex={1400}
      >
        <DialogTitle>Delete Post?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "
            <strong>{currentPost.title}</strong>"? This action cannot be undone.
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
