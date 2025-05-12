const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'codecraftsman',
  password: '!@#Lu78na#',
  database: 'forumdb'
});

module.exports = db;