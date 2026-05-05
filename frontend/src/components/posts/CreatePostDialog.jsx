import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
} from "@mui/material";
import {
  MusicNote,
  TextFields,
  Image as ImageIcon,
  VideoLibrary,
} from "@mui/icons-material";

function CreatePostDialog({ open, onClose, onPostTypeSelected }) {
  const [postType, setPostType] = useState("score");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) {
      return;
    }

    onPostTypeSelected({
      postType,
      title: title.trim(),
      description: description.trim(),
      content: content.trim(),
    });

    // Reset
    setTitle("");
    setDescription("");
    setContent("");
    setPostType("score");
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setContent("");
    setPostType("score");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Post</DialogTitle>

      <DialogContent>
        {/* Post Type Selector */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Post Type
          </Typography>
          <ToggleButtonGroup
            value={postType}
            exclusive
            onChange={(e, value) => value && setPostType(value)}
            fullWidth
            sx={{ mb: 2 }}
          >
            <ToggleButton value="score">
              <MusicNote sx={{ mr: 1 }} />
              Score
            </ToggleButton>
            <ToggleButton value="text">
              <TextFields sx={{ mr: 1 }} />
              Text
            </ToggleButton>
            <ToggleButton value="image">
              <ImageIcon sx={{ mr: 1 }} />
              Image
            </ToggleButton>
            <ToggleButton value="video">
              <VideoLibrary sx={{ mr: 1 }} />
              Video
            </ToggleButton>
          </ToggleButtonGroup>

          <Paper
            variant="outlined"
            sx={{ p: 2, bgcolor: "background.default" }}
          >
            <Typography variant="caption" color="text.secondary">
              {postType === "score" &&
                "🎵 Upload sheet music for automatic OMR processing (MusicXML, MIDI, MP3)"}
              {postType === "text" &&
                "📝 Share your thoughts, ideas, or musical insights"}
              {postType === "image" && "🖼️ Share a photo without processing"}
              {postType === "video" && "🎬 Share a video clip"}
            </Typography>
          </Paper>
        </Box>

        {/* Title */}
        <TextField
          fullWidth
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          margin="normal"
          required
          placeholder={
            postType === "score"
              ? "e.g., Beethoven Symphony No. 5"
              : postType === "text"
                ? "e.g., My thoughts on jazz harmony"
                : postType === "image"
                  ? "e.g., My new guitar"
                  : "e.g., Live performance"
          }
        />

        {/* Description */}
        <TextField
          fullWidth
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          margin="normal"
          multiline
          rows={2}
          placeholder="Add details..."
        />

        {/* Content (for text posts) */}
        {postType === "text" && (
          <TextField
            fullWidth
            label="Content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            margin="normal"
            multiline
            rows={6}
            placeholder="Write your post content here..."
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!title.trim()}
        >
          {postType === "text" ? "Post" : "Continue"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CreatePostDialog;
