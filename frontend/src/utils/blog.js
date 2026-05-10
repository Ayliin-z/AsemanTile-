// frontend/src/utils/blog.js
import apiClient from './apiClient';

const BASE_URL = '/api/blog';

export const getBlogPosts = async (onlyHomepage = false) => {
  try {
    const url = onlyHomepage ? `${BASE_URL}/homepage` : BASE_URL;
    const response = await apiClient.get(url);
    if (!response.ok) {
      throw new Error('Failed to fetch blog posts');
    }
    const data = await response.json();
    // The backend returns the array directly for homepage and with { posts: ... } for other cases? 
    // Based on the provided code, '/api/blog' returns an array of posts.
    // '/api/blog/homepage' also returns an array.
    return Array.isArray(data) ? data : (data.posts || []);
  } catch (error) {
    console.error('getBlogPosts error:', error);
    return [];
  }
};

export const getBlogPostBySlug = async (slug) => {
  try {
    const response = await apiClient.get(`${BASE_URL}/slug/${slug}`);
    if (!response.ok) {
      throw new Error('Failed to fetch blog post');
    }
    return await response.json();
  } catch (error) {
    console.error('getBlogPostBySlug error:', error);
    return null;
  }
};

export const addBlogPost = async (postData) => {
  try {
    const response = await apiClient.post(BASE_URL, postData);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to add blog post');
    }
    return await response.json();
  } catch (error) {
    console.error('addBlogPost error:', error);
    throw error; // Re-throw to handle in the component
  }
};

export const updateBlogPost = async (id, postData) => {
  try {
    const response = await apiClient.put(`${BASE_URL}/${id}`, postData);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update blog post');
    }
    return await response.json();
  } catch (error) {
    console.error('updateBlogPost error:', error);
    throw error;
  }
};

export const deleteBlogPost = async (id) => {
  try {
    const response = await apiClient.delete(`${BASE_URL}/${id}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to delete blog post');
    }
    return await response.json();
  } catch (error) {
    console.error('deleteBlogPost error:', error);
    throw error;
  }
};

export const toggleHomepageDisplay = async (id, showOnHomepage) => {
  try {
    const response = await apiClient.patch(`${BASE_URL}/${id}/toggle-homepage`, {
      show_on_homepage: showOnHomepage
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update homepage display');
    }
    return await response.json();
  } catch (error) {
    console.error('toggleHomepageDisplay error:', error);
    throw error;
  }
};