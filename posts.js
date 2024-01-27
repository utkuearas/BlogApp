const pool = require('./postre');
const uuid = require('uuid');
// Create Post
const createPost = async (req, res) => {
    const { title, category, body } = req.body;

    // Checking data correctness
    if( !title || !category || !body ) return res.status(401).json({code: 9, message: "Missing information found"});
    if( title.length > 50 || body.length < 500 || (category !== "Artificial Intelligence" && category !== "Business" && category !== "Money" && category !== "Technology")){
      return res.status(401).json({code : 10, message: "Inappropriate post design"});
    }

    const token = req.token;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Creation of external post data
        const id = uuid.v4();
        const created_at = new Date();
        const user_id = await client.query(
            "SELECT id FROM users WHERE token = $1 AND users.is_deleted = false",
            [token]
        );
        await client.query(
            "INSERT INTO posts VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id",
            [id, user_id.rows[0].id, title, body, category, created_at, created_at, 0, false]
        );
        await client.query('COMMIT');
        res.json({post_id: id, message: 'Success'});
    } catch (err) {
        console.log(err.message);
        await client.query('ROLLBACK');
        res.status(401).json({code: 12, message: 'Something went wrong check your data and try again'});
    } finally {
      client.release();
    }
}

// Update the Post
const updatePost = async (req, res) =>{
    let {title, body, post_id} = req.body;

    // Nulling the empty informations for COALESCE function
    if(title == '') title = null;
    if(body == '') body = null;

    // Checking data correctness
    if(!post_id) return res.status(401).json({code : 9, message: 'Missing information'});
    if(!title && !body) return res.status(401).json({code : 9, message: 'Missing information'});
    if((title && title.length > 50) || (body && body.length < 500)) return res.status(401).json({code : 10, message: "Inappropriate post design"});

    const client = await pool.connect();
    const token = req.token;
    try{
      await client.query('BEGIN');
      const updated_at = new Date();
      const token_in_db = await client.query("SELECT token FROM users JOIN posts ON posts.user_id = users.id WHERE posts.id = $1",
      [post_id]);

      // If token is not matched, it will throw error
      if(token_in_db.rows[0].token !== token) throw new Error('Unauthorized');
      
      await client.query(
          "UPDATE posts SET body = COALESCE($1,body), title = COALESCE($2,title), updated_at = $3 WHERE posts.id = $4 AND posts.is_deleted = false",
          [body, title, updated_at, post_id]
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

// Delete a Post
const deletePost = async (req, res) =>{
    let {post_id} = req.body;

    // Checking data correctness
    if(!post_id) return res.status(401).json({code : 9, message: 'Missing information'});
   
    const client = await pool.connect();
    const token = req.token;
    try{
      await client.query('BEGIN');
      const deleted_at = new Date();
      const token_in_db = await client.query("SELECT token FROM users JOIN posts ON posts.user_id = users.id WHERE posts.id = $1",
      [post_id]);

      // If token is not matched, it will throw error
      if(token_in_db.rows[0].token !== token) throw new Error('Unauthorized');

      // Deleting post 
      await client.query(
          "UPDATE posts SET is_deleted = $3, deleted_at = $1 WHERE posts.id = $2 AND posts.is_deleted = false",
          [deleted_at, post_id, true]
      );

      // Deleting comments which is written for given post id
      await client.query(
          "UPDATE comments SET is_deleted = $3, deleted_at = $1 WHERE comments.post_id = $2 AND comments.is_deleted = false",
          [deleted_at, post_id, true]
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
    createPost: createPost,
    updatePost: updatePost,
    deletePost: deletePost
};