import axios from "axios";
import { apiConfig } from "../config/cognito";

// Create axios instance
const api = axios.create({
  baseURL: apiConfig.baseURL,
});

// API Service
export const apiService = {
  // Posts
  createPost: async (token, data) => {
    return api.post("/posts", data, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getMyPosts: async (token, limit = 20) => {
    return api.get(`/posts/myPosts?limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getPost: async (postId) => {
    return api.get(`/posts/${postId}`);
  },

  deletePost: async (token, postId) => {
    return api.delete(`/posts/${postId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getDownloadUrl: async (token, postId, type) => {
    return api.get(`/posts/${postId}/download?type=${type}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  // Upload to S3 presigned URL
  uploadToS3: async (presignedUrl, file, onProgress) => {
    return axios.put(presignedUrl, file, {
      headers: {
        "Content-Type": file.type,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(percentCompleted);
        }
      },
    });
  },
};

export default apiService;
