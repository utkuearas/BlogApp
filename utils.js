require('dotenv').config();
const pool = require('./postre');

// Search Function
const searchPosts = async (req, res) => {
  const { query } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const searchQuery = 'SELECT * FROM posts WHERE title ILIKE $1 ORDER BY updated_at DESC';
    const params = [`%${query}%`]; 
    const result = await client.query(searchQuery, params);
    res.json(result.rows);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(401).json({code: 12, message: 'Something went wrong check your data and try again'});
    console.log(error);
  } finally {
    client.release();
  }
}


  // View a Post Comments
  const viewAPostComments = async (req, res) => {
    const { post_id } = req.body;
    if(!post_id)
      return res.status(401).json({code : 7, message: "Post id should be given"});
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const comments = await client.query('SELECT * FROM comments WHERE post_id = $1 AND comments.is_deleted = false ORDER BY comments.updated_at DESC',
        [post_id]);
      res.json(comments.rows);
      await client.query('COMMIT');
    } catch (err) {
      console.error(err.message);
      res.status(500).json({code: 6, message:'Unexpected error is occured'});
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  };

  // View My Posts
  const viewMyPosts = async (req, res) => {
    const client = await pool.connect();
    const token = req.token;
    try {
      await client.query('BEGIN');
      const user_id = await client.query('SELECT * FROM users WHERE token = $1',
        [token]);
      const myPosts = await client.query("SELECT posts.id, posts.title, posts.category, $2 AS author_name, posts.comment_count, posts.created_at, posts.updated_at FROM posts WHERE user_id = $1 AND posts.is_deleted = false ORDER BY posts.updated_at DESC",
        [user_id.rows[0].id, user_id.rows[0].username]);
      res.json(myPosts.rows);
      await client.query('COMMIT');
    } catch (err) {
      console.error(err.message);
      res.status(500).json({code: 6, message:'Unexpected error is occured'});
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  };

  // View by category
  const viewByCategory = async (req, res) => {
    const {category} = req.body;
    if(!category) return res.status(401).json({code : 9, message: 'Missing information'});
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const allPosts = await client.query("SELECT posts.id, posts.title, posts.category, users.username AS author_name, posts.comment_count,  posts.created_at, posts.updated_at FROM posts JOIN users ON posts.user_id = users.id WHERE posts.category = $1 AND posts.is_deleted = false ORDER BY posts.updated_at DESC",
      [category]);
      res.json(allPosts.rows);
      await client.query('COMMIT');
    } catch (err) {
      console.log(err.message);
      res.status(500).json({code: 6, message:'Unexpected error is occured'});
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  };
  
  // View my Comments
  const viewMyComments = async (req, res) => {
    const client = await pool.connect();
    const token = req.token;
    try {
      await client.query('BEGIN');
      const user_id = await client.query('SELECT * FROM users WHERE token = $1',
        [token]);
      const myComments = await client.query("SELECT comments.text, users.username, comments.updated_at, posts.title FROM comments JOIN posts ON posts.id = comments.post_id JOIN users ON comments.user_id = users.id WHERE posts.user_id = $1 AND comments.is_deleted = false ORDER BY comments.updated_at DESC",
        [user_id.rows[0].id]);
      res.json(myComments.rows);
      await client.query('COMMIT');
    } catch (err) {
      console.error(err.message);
      res.status(500).json({code: 6, message:'Unexpected error is occured'});
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  };

  // View a Post
  const viewAPost = async (req, res) => {
    const { post_id } = req.body;
    if(!post_id)
      return res.status(401).json({code : 7, message: "Post id should be given"});
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const post = await client.query('SELECT posts.*, users.username FROM posts JOIN users ON posts.user_id = users.id WHERE posts.id = $1 AND posts.is_deleted = false',
        [post_id]);
      if(post.rows.length == 0){
        await client.query('COMMIT');
        return res.status(401).json({code: 8, message: "Invalid post id"});
      }
      res.json(post.rows[0]);
      await client.query('COMMIT');
    } catch (err) {
      console.error(err.message);
      res.status(500).json({code: 6, message:'Unexpected error is occured'});
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  };
  
  // View Posts
  const viewPosts = async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const allPosts = await client.query("SELECT posts.id, posts.title, posts.category, users.username AS author_name, posts.comment_count,  posts.created_at, posts.updated_at FROM posts JOIN users ON posts.user_id = users.id WHERE posts.is_deleted = false ORDER BY posts.updated_at DESC");
      res.json(allPosts.rows);
      await client.query('COMMIT');
    } catch (err) {
      console.error(err.message);
      res.status(500).json({code: 6, message:'Unexpected error is occured'});
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  };

  module.exports = {viewMyPosts: viewMyPosts,
                    viewPosts: viewPosts,
                    viewAPost: viewAPost,
                    viewAPostComments: viewAPostComments,
                    viewMyComments: viewMyComments,
                    viewByCategory, viewByCategory,
                    searchPosts: searchPosts};
