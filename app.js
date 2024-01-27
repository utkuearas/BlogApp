require('dotenv').config();
const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const { authenticateToken, login, register } = require('./auth');
const cookieParser = require('cookie-parser');
const { viewPosts, viewAPost, viewAPostComments, viewMyPosts ,viewMyComments, viewByCategory, searchPosts} = require('./utils');
const { createPost, updatePost, deletePost } = require('./posts');
const { commentToPost, updateComment, deleteComment } = require('./comments');
const { changePassword, updateProfile, deleteAccount } = require('./account');
const { show_category_rates, show_blogger_rates, show_histogram } = require('./elastic');
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false}));

app.get('/posts/viewAll', authenticateToken, viewPosts);
app.get('/posts/view', authenticateToken, viewAPost)
app.get('/posts/viewPostComments', authenticateToken, viewAPostComments);
app.get('/posts/myPosts', authenticateToken, viewMyPosts);
app.get('/comments/myComments', authenticateToken, viewMyComments);
app.get('/posts/viewByCategory', authenticateToken, viewByCategory);
app.get('/posts/search', authenticateToken, searchPosts);
app.post('/login', login);
app.post('/register', register);
app.post('/posts/create', authenticateToken, createPost);
app.post('/comments/create', authenticateToken, commentToPost);
app.put('/posts/update', authenticateToken, updatePost);
app.put('/comments/update', authenticateToken, updateComment);
app.put('/account/changePassword', authenticateToken, changePassword);
app.put('/account/update', authenticateToken, updateProfile);
app.delete('/posts/delete', authenticateToken, deletePost);
app.delete('/comments/delete', authenticateToken, deleteComment);
app.delete('/account/delete', authenticateToken, deleteAccount);

// Elastic
app.get('/category/rates', authenticateToken, show_category_rates);
app.get('/users/rates', authenticateToken, show_blogger_rates);
app.get('/posts/histogram', authenticateToken, show_histogram);

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});