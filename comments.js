const pool = require('./postre');
const uuid = require('uuid');

// Comment to Post
const commentToPost = async (req, res) => {
    const { text, post_id } = req.body;

    // Checking data correctness
    if(!text || !post_id) return res.status(401).json({code: 9, message: "Missing information"});

    const token = req.token;
    const client = await pool.connect();
    try {
      // Generating external informations
      await client.query('BEGIN');
      const id = uuid.v4();
      const created_at = new Date();
      const user_id = await client.query(
          "SELECT id FROM users WHERE token = $1",
          [token]
      );
      const is_exist = await client.query("SELECT * FROM posts WHERE posts.id = $1 AND posts.is_deleted = false",
        [post_id]);

      // if is_exist has no length, then post is not exist. So it will throw error
      if(is_exist.rows.length === 0) throw new Error("Post is not exist");

      await client.query(
        "INSERT INTO comments (id, user_id, text, post_id, created_at, updated_at, is_deleted) VALUES($1, $2, $3, $4, $5, $6, $7)",
        [id, user_id.rows[0].id, text, post_id, created_at, created_at, false]
      );
      await client.query(
        "UPDATE posts SET comment_count = comment_count + 1 WHERE posts.id = $1",
        [post_id]
      );
      res.json({comment_id : id, message: "Success"});
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.log(err.message);
      res.status(401).json({code: 12, message: 'Something went wrong check your data and try again'})
    } finally {
      client.release();
    }
}

// Update a comment
const updateComment = async (req, res) =>{
    let {text, comment_id} = req.body;

    //Checking data correctness
    if(!text || !comment_id) return res.status(401).json({code: 9, message: 'Missing information'});

    const client = await pool.connect();
    const token = req.token;
    try{
      await client.query('BEGIN');
      const updated_at = new Date();
      const token_in_db = await client.query("SELECT token FROM users JOIN comments ON comments.user_id = users.id WHERE comments.id = $1",
      [comment_id]);

      // token is not matched in db, it will throw error
      if(token_in_db.rows[0].token !== token) throw new Error('Unauthorized');
      
      await client.query(
          "UPDATE comments SET text = $1, updated_at = $2 WHERE comments.id = $3 AND comments.is_deleted = false",
          [text, updated_at, comment_id]
      );
      await client.query('COMMIT');
      res.json({ message: 'Success'});
    } catch (err) {
      console.log(err.message);
      await client.query('ROLLBACK');
      res.status(401).json({code: 12, message: 'Something went wrong check your data and try again'})
    } finally {
      client.release();
    }

}

// Delete a Comment
const deleteComment = async (req, res) =>{
    let {comment_id} = req.body;

    // Checking data correctness
    if(!comment_id) return res.status(401).json({code: 9, message: 'Missing information'});

    const client = await pool.connect();
    const token = req.token;
    try{
      await client.query('BEGIN');
      const deleted_at = new Date();
      const token_in_db = await client.query("SELECT token FROM users JOIN comments ON comments.user_id = users.id WHERE comments.id = $1",
      [comment_id]);

      // It will throw error, if token is not matched
      if(token_in_db.rows[0].token !== token) throw new Error('Unauthorized');
      
      await client.query(
          "UPDATE comments SET is_deleted = $3, deleted_at = $1 WHERE comments.id = $2 AND comments.is_deleted = false",
          [deleted_at, comment_id, true]
      );
      await client.query(
          "UPDATE posts SET comment_count = comment_count - 1 FROM comments WHERE comments.post_id = posts.id AND comments.id = $1",
          [comment_id]
      );
      await client.query('COMMIT');
      res.json({ message: 'Success'});
    } catch (err) {
      console.log(err.message);
      await client.query('ROLLBACK');
      res.status(401).json({code: 12, message: 'Something went wrong check your data and try again'})
    } finally {
      client.release();
    }

  }

module.exports = {
    commentToPost: commentToPost,
    updateComment: updateComment,
    deleteComment: deleteComment
}