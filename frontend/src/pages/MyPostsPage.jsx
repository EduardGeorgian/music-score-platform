import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiConfig } from '../config/cognito';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Grid
} from '@mui/material';
import {
  ArrowBack,
  CloudUpload,
  MusicNote
} from '@mui/icons-material';

function MyPostsPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      fetchMyPosts();
    }
  }, [isAuthenticated, navigate]);

  const fetchMyPosts = async () => {
    if (!user?.token) return;

    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/posts/my?limit=20`,
        {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        }
      );
      
      setPosts(response.data.posts || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch posts');
      console.error('Fetch posts error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'warning';
      case 'pending': return 'info';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/profile')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
            My Posts
          </Typography>
          <Button
            variant="contained"
            startIcon={<CloudUpload />}
            disabled
          >
            Upload (Coming Soon)
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Posts List */}
        {posts.length === 0 ? (
          <Paper elevation={3} sx={{ p: 6, textAlign: 'center' }}>
            <MusicNote sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No posts yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Upload your first sheet music to get started!
            </Typography>
            <Button variant="contained" disabled>
              Upload Sheet Music (Coming Soon)
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {posts.map((post) => (
              <Grid item xs={12} key={post.postId}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {post.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {post.description || 'No description'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Created: {new Date(post.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Chip
                        label={post.status}
                        color={getStatusColor(post.status)}
                        sx={{ ml: 2 }}
                      />
                    </Box>

                    {post.status === 'completed' && (
                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <Button size="small" variant="outlined" disabled>
                          Download MusicXML
                        </Button>
                        <Button size="small" variant="outlined" disabled>
                          Download MIDI
                        </Button>
                        <Button size="small" variant="outlined" disabled>
                          Download MP3
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
}

export default MyPostsPage;