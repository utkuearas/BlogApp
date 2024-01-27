require('dotenv').config();
const jwt = require('jsonwebtoken');
const pool = require('./postre');
const bcrypt = require('bcrypt');
const unidecode = require('unidecode');
const uuid = require('uuid');

const authenticateToken = async (req, res, next) => {
  // Middleware function for auth required functions

  const token = req.cookies.token; // Only for same domain web applications
  // Depends on the REST API usage, it may need to get token via auth header const token = req.headers['authorization'].split(' ')[1];
  
  // Checking token
  if (token == null) return res.status(401).json({code: -1, message: 'Login is required'});
  const client = await pool.connect();
  try{

    jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
      
      // Checking token status
      if (err && err.name === 'TokenExpiredError'){
        return res.status(403).json({code: 5, message: "Session expired. Please login again"});
      }else if(err){
        return res.sendStatus(403);
      }

      await client.query('BEGIN');
      // Checking existence of token
      const result = await client.query('SELECT EXISTS(SELECT 1 FROM users WHERE token = $1 AND is_deleted = false)',[token]);
      await client.query('COMMIT');

      if (result.rows[0].exists) {
        req.token = token;
        next();
      } else {
        res.status(403).json({code: 4, message: 'Not authorized'});
      }
    });
  }catch (err){
    await client.query('ROLLBACK');
  }finally {
    client.release();
  }
};

const register =  async (req, res) => {

  const { email, password, full_name } = req.body;

  // Checking data correctness
  if(!email || !password || !full_name){
    return res.status(401).json({code: 1, message: "Inappropriate request"});    
  }else if(password.length < 8){
    return res.status(401).json({code: 2, message: "Password length must be at least 8 characters length"});
  }

  const client = await pool.connect();
  try{
    await client.query("BEGIN");
    
    // Generating external informations based on given data
    let username = unidecode(full_name.toLowerCase()).replace(/\s/g, '.');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    const id = uuid.v4();

    // Checking username 
    let number = await client.query("SELECT count(*) from users WHERE username LIKE $1", [username+'%']);
    number = parseInt(number.rows[0].count);
    username += number;

    // Checking email
    exist = await client.query("SELECT EXISTS(SELECT 1 from users WHERE email=$1)", [email]);
    if(exist.rows[0].exists){
      res.status(401).json({code: 0, message: "This email is already exist"});
      return await client.query('COMMIT');
    }
    // User creation
    const result = await client.query(
      'INSERT INTO users (id, email, password, full_name, username, is_deleted) VALUES ($1, $2, $3, $4, $5, $6) RETURNING email, username, full_name',
      [id, email, hashedPassword, full_name, username, false]
    );
    await client.query("COMMIT");
    res.json({result: result.rows[0], message: 'Success'});
  }catch(err){
    console.log(err);
    await client.query("ROLLBACK");
  }finally{
    client.release();
  }
}

const login = async (req, res) => {
  const client = await pool.connect();
  try{
    await client.query("BEGIN");
    const { email, password } = req.body;

    const result = await client.query('SELECT * FROM users WHERE email = $1 AND is_deleted = false', 
    [email]);

    if (result.rows.length > 0) {
      const user = result.rows[0];

      if (bcrypt.compareSync(password, user.password)) {
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        await client.query('UPDATE users SET token = $1 WHERE id = $2', [token, user.id]);
        await client.query('COMMIT');
        res.cookie('token', token, { httpOnly: true , secure: true }); // Only for same domain web applications
        res.json({ message:'Success' });
        // Depends on REST API usage, it may need to send token via body res.json({token: token, message:'Success'});
      } else {
        res.status(401).json({code: 3, message: 'Invalid login information' });
      }
    } else {
      res.status(401).json({code: 3, message: 'Invalid login information' });
    }
  }catch(err){
    console.log(err);
    await client.query("ROLLBACK");
  }finally{
    client.release();
  }
}

module.exports = {authenticateToken: authenticateToken,
                  login: login,
                  register: register};