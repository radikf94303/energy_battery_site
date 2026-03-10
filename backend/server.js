const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const SESSIONS_FILE = path.join(__dirname, 'sessions.json');

app.use(cors());
app.use(express.json());

// Load sessions from disk
function loadSessions() {
  if (fs.existsSync(SESSIONS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

// Save sessions to disk
function saveSessions(sessions) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

// Save a session
app.post('/api/sessions', (req, res) => {
  const { name, config } = req.body;
  if (!name || !config) return res.status(400).json({ error: 'name and config required' });

  const sessions = loadSessions();
  const id = uuidv4();
  sessions[id] = {
    id,
    name,
    config,
    savedAt: new Date().toISOString()
  };
  saveSessions(sessions);
  res.json({ id, message: 'Session saved successfully' });
});

// Update a session
app.put('/api/sessions/:id', (req, res) => {
  const { name, config } = req.body;
  const sessions = loadSessions();
  if (!sessions[req.params.id]) return res.status(404).json({ error: 'Session not found' });

  sessions[req.params.id] = {
    ...sessions[req.params.id],
    name: name || sessions[req.params.id].name,
    config: config || sessions[req.params.id].config,
    savedAt: new Date().toISOString()
  };
  saveSessions(sessions);
  res.json({ message: 'Session updated successfully' });
});

// Get all sessions
app.get('/api/sessions', (req, res) => {
  const sessions = loadSessions();
  res.json(Object.values(sessions).sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)));
});

// Get a specific session
app.get('/api/sessions/:id', (req, res) => {
  const sessions = loadSessions();
  const session = sessions[req.params.id];
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

// Delete a session
app.delete('/api/sessions/:id', (req, res) => {
  const sessions = loadSessions();
  if (!sessions[req.params.id]) return res.status(404).json({ error: 'Session not found' });
  delete sessions[req.params.id];
  saveSessions(sessions);
  res.json({ message: 'Session deleted' });
});

app.listen(PORT, () => {
  console.log(`Battery Site API running on http://localhost:${PORT}`);
});
