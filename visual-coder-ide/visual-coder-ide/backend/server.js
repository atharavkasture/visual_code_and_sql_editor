const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const apiRoutes = require('./routes/api'); // Keep this if you use it for other things

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// --- CONFIGURATION ---
// Ensure these folders exist in your backend directory!
const PROJECTS_DIR = path.join(__dirname, 'saved_projects');
const FUNCTIONS_DIR = path.join(__dirname, 'saved_functions');

// Ensure folders exist
if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR);
if (!fs.existsSync(FUNCTIONS_DIR)) fs.mkdirSync(FUNCTIONS_DIR);

// --- DELETE ROUTES ---

// 1. Delete Project
app.delete('/api/delete-project/:name', (req, res) => {
    // Decode the name to handle spaces (e.g., "My Project" instead of "My%20Project")
    const name = decodeURIComponent(req.params.name);
    const filePath = path.join(PROJECTS_DIR, `${name}.json`);

    console.log(`[DELETE] Attempting to remove project: ${name}`);

    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            console.log(`[SUCCESS] Deleted: ${filePath}`);
            res.json({ success: true });
        } catch (err) {
            console.error('[ERROR] Could not delete file:', err);
            res.status(500).json({ error: 'File permission error' });
        }
    } else {
        console.warn(`[WARNING] File not found: ${filePath}`);
        res.status(404).json({ error: 'Project not found' });
    }
});

// 2. Delete Function
app.delete('/api/delete-function/:name', (req, res) => {
    const name = decodeURIComponent(req.params.name);
    const filePath = path.join(FUNCTIONS_DIR, `${name}.json`);

    console.log(`[DELETE] Attempting to remove function: ${name}`);

    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            console.log(`[SUCCESS] Deleted: ${filePath}`);
            res.json({ success: true });
        } catch (err) {
            console.error('[ERROR] Could not delete file:', err);
            res.status(500).json({ error: 'File permission error' });
        }
    } else {
        console.warn(`[WARNING] File not found: ${filePath}`);
        res.status(404).json({ error: 'Function not found' });
    }
});

// Use your existing API routes for Generate/Execute
app.use('/api', apiRoutes);

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});