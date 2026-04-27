import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import apiService from "../services/api";
import UploadPost from "../components/posts/UploadPost";
import PostCard from "../components/posts/PostCard";
import {
  Container,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Paper,
} from "@mui/material";
import {
  ArrowBack,
  CloudUpload,
  MusicNote,
  Refresh,
} from "@mui/icons-material";

function MyPostsPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    } else {
      fetchMyPosts();
    }
  }, [isAuthenticated, navigate]);

  const fetchMyPosts = async () => {
    if (!user?.token) return;

    setLoading(true);
    setError("");

    try {
      const response = await apiService.getMyPosts(user.token, 20);
      setPosts(response.data.posts || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch posts");
      console.error("Fetch posts error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    fetchMyPosts();
  };

  const handleDelete = (postId) => {
    setPosts(posts.filter((p) => p.postId !== postId));
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 3,
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate("/profile")}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
            My Posts
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchMyPosts}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<CloudUpload />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Upload
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Posts List */}
        {posts.length === 0 ? (
          <Paper elevation={3} sx={{ p: 6, textAlign: "center" }}>
            <MusicNote sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No posts yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Upload your first sheet music to get started!
            </Typography>
            <Button
              variant="contained"
              startIcon={<CloudUpload />}
              onClick={() => setUploadDialogOpen(true)}
            >
              Upload Sheet Music
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {posts.map((post) => (
              <Grid item xs={12} key={post.postId}>
                <PostCard post={post} onDelete={handleDelete} />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Upload Dialog */}
      <UploadPost
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </Container>
  );
}

export default MyPostsPage;
