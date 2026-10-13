import app, { storage } from './app.js'

// API_PORT rather than PORT: dev launchers set PORT for the web server
const PORT = process.env.API_PORT || 3001
app.listen(PORT, () => console.log(`Task Console API on http://localhost:${PORT} · data in ${storage.where}`))
