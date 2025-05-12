const jwt = require('jsonwebtoken');

function verifyToken(request, reply, done) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Ingen token angiven' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Kontrollera att du anv�nder r�tt secret
    request.user = decoded; // Exempel: { id: 3, username: "testuser" }
    done();
  } catch (err) {
    reply.code(401).send({ error: 'Ogiltig token' });
  }
}

module.exports = verifyToken;

