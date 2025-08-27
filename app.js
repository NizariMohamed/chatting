const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const mysql = require('mysql2/promise');
const multer = require('multer');

// =====================
// Config (env or defaults)
// =====================
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'nizari2412@@';
const UPLOAD_DIR = path.join(__dirname, 'uploads');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || '1234';
const DB_NAME = process.env.DB_NAME || 'nchat_db';

// =====================
// MySQL: pool + init
// =====================
let pool;
async function initDb() {
  const root = await mysql.createConnection({ host: DB_HOST, user: DB_USER, password: DB_PASS });
  await root.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await root.end();

  pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE,
      email VARCHAR(100) UNIQUE,
      password VARCHAR(255) NOT NULL,
      avatar VARCHAR(255) DEFAULT NULL,
      status ENUM('online','offline') DEFAULT 'offline',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_id INT NOT NULL,
      receiver_id INT NOT NULL,
      message TEXT NOT NULL,
      file_url VARCHAR(255) DEFAULT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status ENUM('sent','delivered','read') NOT NULL DEFAULT 'sent',
      read_at TIMESTAMP NULL DEFAULT NULL,
      INDEX idx_pair (sender_id, receiver_id),
      CONSTRAINT fk_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);
}

// =====================
// File Upload Middleware
// =====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to avoid collisions
  },
});

const upload = multer({ storage });

// =====================
// App + HTTP + Socket.IO
// =====================
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', credentials: true },
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR)); // Serve uploaded files

// =====================
// Auth helpers
// =====================[]
function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// =====================
// REST: Auth
// =====================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ message: 'All fields required' });
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password) VALUES (:username, :email, :password)',
      { username, email, password: hash }
    );
    const [rows] = await pool.query('SELECT id, username, email, avatar, status FROM users WHERE id = :id', { id: result.insertId });
    const user = rows[0];
    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Username or email already exists' });
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
    const [rows] = await pool.query('SELECT * FROM users WHERE email = :email', { email });
    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const clean = { id: user.id, username: user.username, email: user.email, avatar: user.avatar, status: user.status };
    const token = signToken(clean);
    res.json({ token, user: clean });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// =====================
// REST: Users & Messages
// =====================
const onlineUsers = new Map();

app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, username, email, avatar FROM users WHERE id <> :id ORDER BY username', { id: req.user.id });
    const withPresence = rows.map(u => ({ ...u, status: onlineUsers.has(u.id) ? 'online' : 'offline' }));
    res.json(withPresence);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET messages & mark as read
app.get('/api/messages/:partnerId', authMiddleware, async (req, res) => {
  try {
    const me = req.user.id;
    const partner = Number(req.params.partnerId);

    // Mark messages as read
    await pool.query(
      'UPDATE messages SET status = "read", read_at = NOW() WHERE receiver_id = :me AND sender_id = :partner AND status <> "read"',
      { me, partner }
    );

    const [rows] = await pool.query(
      `SELECT id, sender_id, receiver_id, message, file_url, timestamp, status
       FROM messages
       WHERE (sender_id = :me AND receiver_id = :partner)
          OR (sender_id = :partner AND receiver_id = :me)
       ORDER BY timestamp ASC
       LIMIT 500`,
      { me, partner }
    );

    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/messages', authMiddleware, async (req, res) => {
  try {
    const sender_id = req.user.id;
    const { receiver_id, message } = req.body;
    if (!receiver_id || !message) return res.status(400).json({ message: 'receiver_id and message required' });

    const [result] = await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, message, status) VALUES (:sender_id, :receiver_id, :message, "sent")',
      { sender_id, receiver_id, message }
    );

    const [rows] = await pool.query('SELECT * FROM messages WHERE id = :id', { id: result.insertId });
    const msg = rows[0];

    // Emit to receiver
    io.to(`user:${receiver_id}`).emit('chat-message', {
      id: msg.id,
      sender_id,
      receiver_id,
      message,
      file_url: msg.file_url,
      timestamp: msg.timestamp,
      status: msg.status,
    });

    res.json(msg);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST for image and audio uploads
app.post('/api/messages/images', [authMiddleware, upload.single('image')], async (req, res) => {
  try {
    const sender_id = req.user.id;
    const receiver_id = req.body.receiver_id;
    const fileUrl = `/uploads/${req.file.filename}`;

    const [result] = await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, message, file_url, status) VALUES (:sender_id, :receiver_id, "", :fileUrl, "sent")',
      { sender_id, receiver_id, fileUrl }
    );

    const [rows] = await pool.query('SELECT * FROM messages WHERE id = :id', { id: result.insertId });
    const msg = rows[0];

    // Emit to receiver
    io.to(`user:${receiver_id}`).emit('chat-message', {
      id: msg.id,
      sender_id,
      receiver_id,
      message: '',
      file_url: msg.file_url,
      timestamp: msg.timestamp,
      status: msg.status,
    });

    res.json(msg);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/messages/audios', [authMiddleware, upload.single('audio')], async (req, res) => {
    try {
        const sender_id = req.user.id;
        const receiver_id = req.body.receiver_id;
        const fileUrl = `/uploads/${req.file.filename}`; // Ensure this path is correct

        const [result] = await pool.query(
            'INSERT INTO messages (sender_id, receiver_id, message, file_url, status) VALUES (:sender_id, :receiver_id, "", :fileUrl, "sent")',
            { sender_id, receiver_id, fileUrl }
        );

        const [rows] = await pool.query('SELECT * FROM messages WHERE id = :id', { id: result.insertId });
        const msg = rows[0];

        // Emit to receiver
        io.to(`user:${receiver_id}`).emit('chat-message', {
            id: msg.id,
            sender_id,
            receiver_id,
            message: '',
            file_url: msg.file_url,
            timestamp: msg.timestamp,
            status: msg.status,
        });

        res.json(msg);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }
});

// =====================
// Socket.IO auth & events
// =====================
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token || null;
    if (!token) return next(new Error('No token'));
    const user = jwt.verify(token, JWT_SECRET);
    socket.user = user;
    next();
  } catch (e) {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', async (socket) => {
  const userId = socket.user.id;
  onlineUsers.set(userId, true);
  socket.join(`user:${userId}`);

  io.emit('presence', { userId, status: 'online' });

  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    io.emit('presence', { userId, status: 'offline' });
  });

  // Typing indicator
  socket.on('typing', ({ to, isTyping }) => {
    io.to(`user:${to}`).emit('typing', { from: userId, isTyping });
  });

  // Direct message
  socket.on('direct-message', async ({ to, message }) => {
    if (!to || !message) return;

    const [result] = await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, message, status) VALUES (:sender_id, :receiver_id, :message, "sent")',
      { sender_id: userId, receiver_id: to, message }
    );

    const [rows] = await pool.query('SELECT * FROM messages WHERE id = :id', { id: result.insertId });
    const msg = rows[0];

    io.to(`user:${to}`).emit('chat-message', {
      id: msg.id,
      sender_id: userId,
      receiver_id: to,
      message,
      timestamp: msg.timestamp,
      status: msg.status
    });

    // Notify sender immediately with "sent"
    socket.emit('message-status', { messageId: msg.id, status: 'sent' });
  });

  // Delivery report: mark delivered
  socket.on('message-delivered', async ({ messageId }) => {
    await pool.query('UPDATE messages SET status = "delivered" WHERE id = :id AND status = "sent"', { id: messageId });
    const [rows] = await pool.query('SELECT sender_id FROM messages WHERE id = :id', { id: messageId });
    const senderId = rows[0].sender_id;
    io.to(`user:${senderId}`).emit('message-status', { messageId, status: 'delivered' });
  });

  // Mark read on open chat
  socket.on('message-read', async ({ partnerId }) => {
    const me = userId;
    await pool.query(
      'UPDATE messages SET status = "read", read_at = NOW() WHERE receiver_id = :me AND sender_id = :partner AND status <> "read"',
      { me, partner: partnerId }
    );
    // Notify sender
    io.to(`user:${partnerId}`).emit('message-status', { partnerId: me, status: 'read' });
  });
});



// DELETE route for deleting a single message
app.delete('/api/messages/:messageId', authMiddleware, async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.id;

        // First, check if the message exists and belongs to the user
        const [messageRows] = await pool.query(
            'SELECT * FROM messages WHERE id = :messageId AND sender_id = :userId',
            { messageId, userId }
        );

        if (messageRows.length === 0) {
            return res.status(404).json({ 
                error: 'Message not found or you do not have permission to delete this message' 
            });
        }

        const messageData = messageRows[0];

        // If message has a file, delete the file from filesystem
        if (messageData.file_url) {
            const fs = require('fs');
            const path = require('path');
            
            try {
                // Extract filename from URL (assuming file_url is like '/uploads/filename.ext')
                const filename = path.basename(messageData.file_url);
                const filePath = path.join(UPLOAD_DIR, filename); // Use UPLOAD_DIR constant
                
                // Check if file exists before attempting to delete
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`Deleted file: ${filePath}`);
                }
            } catch (fileError) {
                console.error('Error deleting file:', fileError);
                // Continue with message deletion even if file deletion fails
            }
        }

        // Delete the message from database
        await pool.query(
            'DELETE FROM messages WHERE id = :messageId AND sender_id = :userId',
            { messageId, userId }
        );

        // Emit socket event to notify other users about message deletion
        io.to(`user:${messageData.receiver_id}`).emit('message-deleted', { 
            messageId: parseInt(messageId),
            senderId: userId 
        });

        // Also emit to sender to update their UI
        io.to(`user:${userId}`).emit('message-deleted', { 
            messageId: parseInt(messageId),
            senderId: userId 
        });

        res.json({ 
            success: true, 
            message: 'Message deleted successfully',
            messageId: parseInt(messageId)
        });

    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ 
            error: 'Internal server error while deleting message' 
        });
    }
});

// DELETE route for deleting multiple messages (batch delete)
app.delete('/api/messages', authMiddleware, async (req, res) => {
    try {
        const { messageIds } = req.body;
        const userId = req.user.id;

        if (!Array.isArray(messageIds) || messageIds.length === 0) {
            return res.status(400).json({ 
                error: 'messageIds must be a non-empty array' 
            });
        }

        // Create placeholders for the IN clause using named parameters
        const placeholders = messageIds.map((_, index) => `:messageId${index}`).join(',');
        const params = { userId };
        messageIds.forEach((id, index) => {
            params[`messageId${index}`] = id;
        });
        
        // First, get all messages that belong to the user
        const [messages] = await pool.query(
            `SELECT * FROM messages WHERE id IN (${placeholders}) AND sender_id = :userId`,
            params
        );

        if (messages.length === 0) {
            return res.status(404).json({ 
                error: 'No messages found or you do not have permission to delete these messages' 
            });
        }

        // Delete associated files
        const fs = require('fs');
        const path = require('path');
        
        for (const message of messages) {
            if (message.file_url) {
                try {
                    const filename = path.basename(message.file_url);
                    const filePath = path.join(UPLOAD_DIR, filename);
                    
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`Deleted file: ${filePath}`);
                    }
                } catch (fileError) {
                    console.error('Error deleting file:', fileError);
                }
            }
        }

        // Delete messages from database
        const deletedMessageIds = messages.map(msg => msg.id);
        const deleteParams = { userId };
        deletedMessageIds.forEach((id, index) => {
            deleteParams[`deleteId${index}`] = id;
        });
        const deletePlaceholders = deletedMessageIds.map((_, index) => `:deleteId${index}`).join(',');
        
        await pool.query(
            `DELETE FROM messages WHERE id IN (${deletePlaceholders}) AND sender_id = :userId`,
            deleteParams
        );

        // Emit socket events for each deleted message
        messages.forEach(message => {
            io.to(`user:${message.receiver_id}`).emit('message-deleted', { 
                messageId: message.id,
                senderId: userId 
            });
            io.to(`user:${userId}`).emit('message-deleted', { 
                messageId: message.id,
                senderId: userId 
            });
        });

        res.json({ 
            success: true, 
            message: `${deletedMessageIds.length} messages deleted successfully`,
            deletedMessageIds: deletedMessageIds 
        });

    } catch (error) {
        console.error('Error deleting messages:', error);
        res.status(500).json({ 
            error: 'Internal server error while deleting messages' 
        });
    }
});


//profile updadates
app.put('/api/users/profile', authMiddleware, upload.single('avatar'), async (req, res) => {
    const { username, email } = req.body;
    const userId = req.user.id;
    let avatarUrl = null;

    // If an avatar file is uploaded, set the URL
    if (req.file) {
        avatarUrl = `/uploads/${req.file.filename}`; // Adjust the URL based on your setup
    }

    try {
        await pool.query(
            `UPDATE users SET username = :username, email = :email, avatar = :avatar WHERE id = :id`,
            { username, email, avatar: avatarUrl, id: userId }
        );

        // Fetch updated user data
        const [rows] = await pool.query('SELECT id, username, email, avatar FROM users WHERE id = :id', { id: userId });
        console.log(rows)
        res.json(rows[0]);
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

//fetch profiles

app.get('/api/users/profile/read', authMiddleware, async (req, res) => {
    const userId = req.user.id;

    try {
        const [rows] = await pool.query('SELECT id, username, email, avatar FROM users WHERE id = :id', { id: userId });
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// =====================
// Fallback routes
// =====================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, 'public', 'chat.html')));

// =====================
// Boot server
// =====================
(async () => {
  await initDb();
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR); // Create upload directory if it doesn't exist
  }
  server.listen(PORT, () => console.log(`💬 nChat server running http://localhost:${PORT}`));
})();