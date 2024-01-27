require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('./postre');

// Update Profile
const updateProfile = async (req, res) => {
    let { location, address } = req.body;

    // Checking correctness of parameters
    if (!location && !address) {
      res.status(401).json({message:'At least of the information is required.'});
      return;
    }

    // Nulling empty data for COALESCE function
    if(location==="") location = null;
    if(address==="") address = null;
  
    const token = req.token;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // With COALESCE it just change the data if it's given
      const updateQuery = 'UPDATE users SET location = COALESCE($1,location), address = COALESCE($2,address) WHERE token = $3 AND is_deleted = false';
      await client.query(updateQuery, [location, address, token]);
      
      res.json({message: "Success"});
      await client.query('COMMIT');
    } catch (error) {
      console.log(error);
      await client.query('ROLLBACK');
      res.status(401).json({code: 12, message: 'Something went wrong check your data and try again'});
    } finally {
      client.release();
    }
  }
  
// Change Password
const changePassword = async (req, res) =>{
    const {password} = req.body;

    // Checking password correctess
    if(!password || password.length < 8) return res.status(401).json({code: 9, message: "Missing information found"});
    
    const token = req.token;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Salting and hashing for security
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password,salt);

      const deactivateTokenQuery = 'UPDATE users SET token = NULL, password = $2 WHERE token = $1 AND is_deleted = false RETURNING id';
      const id = await client.query(deactivateTokenQuery, [token, hashedPassword]);
      
      // if query is not working, which means Token is not matched
      if(id.rows.length === 0) throw new Error("Unauthorized");
      await client.query('COMMIT');
      res.json({message: "Success"})
    } catch (error) {
      await client.query('ROLLBACK');
      console.log(error);
      res.status(401).json({code: 12, message: 'Something went wrong check your data and try again'});
    } finally {
      client.release();
    }
}
  
// Delete Account
const deleteAccount = async (req, res) =>{
   
    const client = await pool.connect();
    const token = req.token;
    try{
      await client.query('BEGIN');
      const deleted_at = new Date();
      const user = await client.query("SELECT users.id FROM users WHERE users.token = $1 AND users.is_deleted = false",
      [token]);

      // If query is not working, then Token is not matched. So it will throw error.
      if(user.rows.length === 0) throw new Error('Unauthorized');

      // Removing account
      await client.query(
          "UPDATE users SET is_deleted = $3, deleted_at = $1 WHERE users.id = $2 AND users.is_deleted = false",
          [deleted_at, user.rows[0].id, true] 
      )

      //Removing posts created by user
      await client.query(
          "UPDATE posts SET is_deleted = $3, deleted_at = $1 WHERE posts.user_id = $2 AND posts.is_deleted = false",
          [deleted_at, user.rows[0].id, true]
      );

      //Removing comments created by user and also comments created for the posts which is written by user
      await client.query(
          "UPDATE comments SET is_deleted = $3, deleted_at = $1 FROM posts WHERE (posts.id = comments.post_id AND posts.user_id = $2 AND comments.is_deleted = false) OR (comments.user_id = $2 AND comments.is_deleted = false)",
          [deleted_at, user.rows[0].id, true]
      );
      await client.query('COMMIT');
      res.json({ message: 'Success'});
    } catch (err) {
      console.log(err.message);
      await client.query('ROLLBACK');
      res.status(401).json({code: 12, message: 'Something went wrong check your data and try again'});
    } finally {
      client.release();
    }
  
}

module.exports = {
    changePassword: changePassword,
    updateProfile: updateProfile,
    deleteAccount: deleteAccount
}