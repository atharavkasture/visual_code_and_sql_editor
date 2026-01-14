require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios'); // Required for Local LLM calls

const app = express();
const PORT = 3002; // Local Port

// System API Key from .env
const SYSTEM_GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// --- LOCAL Database Configuration (As requested) ---


const dbConfigMySQL = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    port: process.env.MYSQL_PORT,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,    
};

const dbConfigMariaDB = {
    host: process.env.MARIADB_HOST,
    user: process.env.MARIADB_USER,
    port: process.env.MARIADB_PORT,
    password: process.env.MARIADB_PASSWORD,
    database: process.env.MARIADB_DATABASE,    
};

let mysqlPool;
let mariaDbPool;

// --- CORS ---
const allowedOrigins = [
    'http://localhost:5173' // Local Frontend
];
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
};

app.use(cors(corsOptions));
app.use(express.json());

const getPool = (dbType) => (dbType === 'mariadb') ? mariaDbPool : mysqlPool;
const getDbName = (dbType) => (dbType === 'mariadb') ? dbConfigMariaDB.database : dbConfigMySQL.database;

// --- API ROUTES ---

app.get('/api/schema', async (req, res) => {
    const dbType = req.query.dbType || 'mysql';
    const pool = getPool(dbType);
    const dbName = getDbName(dbType);
    
    if (!pool) return res.status(500).json({ error: `Database ${dbType} not connected.` });

    try {
        const [tables] = await pool.query(`SHOW TABLES;`);
        if (!tables || tables.length === 0) return res.json({ tables: [] });
        
        const schema = { tables: [] };
        const tableNameKey = `Tables_in_${dbName}`;
        
        for (const table of tables) {
            const tableName = table[tableNameKey];
            const [columns] = await pool.query(`
                SELECT column_name as name, data_type as type,
                       (CASE WHEN column_key = 'PRI' THEN 1 ELSE 0 END) as pk
                FROM information_schema.columns 
                WHERE table_schema = ? AND table_name = ?
                ORDER BY ordinal_position;
            `, [dbName, tableName]);
            schema.tables.push({ name: tableName, columns: columns });
        }
        res.json(schema);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/query', async (req, res) => {
    const { sql, dbType } = req.body;
    const pool = getPool(dbType);
    if (!sql) return res.status(400).json({ error: 'SQL query is required.' });
    
    try {
        const [rows] = await pool.query(sql);
        const isSelect = Array.isArray(rows);
        const meta = { rowsReturned: isSelect ? rows.length : (rows.affectedRows || 0) };
        const data = isSelect ? rows : [];
        res.json({ data, meta });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

// --- UPDATED 3-OPTION AI ROUTE (With Explanation) ---
app.post('/api/generate-query', async (req, res) => {
    const { userInput, schema, mode, customKey } = req.body; 

    if (!userInput || !schema) return res.status(400).json({ error: 'User input and schema required.' });

    const schemaString = schema.tables.map(table => `Table ${table.name} has columns: ${table.columns.map(c => `${c.name} (${c.type})`).join(', ')}.`).join('\n');
    
    // NEW: Strict JSON instructions
    const systemInstruction = `
        You are an expert SQL tutor. 
        1. Generate a valid MySQL query based on the schema.
        2. Provide a concise, 2-sentence explanation of what the query does for a beginner.
        
        OUTPUT FORMAT:
        You must return ONLY a valid JSON object with this structure:
        {
          "sql": "SELECT/UPDATE etc ...",
          "explanation": "This query selects..."
        }
        Do not output markdown formatting like \`\`\`json. Just the raw JSON object.
    `;
    
    const fullPrompt = `${systemInstruction}\n\nSchema:\n${schemaString}\n\nUser Request: "${userInput}"`;

    try {
        let rawOutput = "";

        // OPTION 1: LOCAL LLM (LM Studio)
        if (mode === 'local') {
            console.log("🤖 Using Local LLM...");
            const response = await axios.post('http://localhost:1234/v1/chat/completions', {
                model: "qwen2.5-coder-7b-instruct", 
                messages: [
                    { role: "system", content: systemInstruction },
                    { role: "user", content: `Schema:\n${schemaString}\n\nRequest: "${userInput}"` }
                ],
                temperature: 0.1
            });
            rawOutput = response.data.choices[0].message.content;

        // OPTION 2: CUSTOM KEY
        } else if (mode === 'custom') {
            console.log("🔑 Using Custom Key...");
            if (!customKey) throw new Error("Custom Key missing");
            const customGenAI = new GoogleGenerativeAI(customKey);
            const model = customGenAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(fullPrompt);
            rawOutput = result.response.text();

        // OPTION 3: SYSTEM CLOUD
        } else {
            console.log("☁️ Using System Cloud...");
            if (!SYSTEM_GEMINI_API_KEY) throw new Error("System API Key not configured on server.");
            const genAI = new GoogleGenerativeAI(SYSTEM_GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(fullPrompt);
            rawOutput = result.response.text();
        }

        // CLEANUP: Sometimes AI adds markdown blocks anyway
        let cleanJson = rawOutput.replace(/```json/g, "").replace(/```/g, "").trim();
        
        // Parse the JSON to verify it works
        const parsedResponse = JSON.parse(cleanJson);

        res.json({ 
            sqlQuery: parsedResponse.sql, 
            explanation: parsedResponse.explanation 
        });

    } catch (err) {
        console.error("[AI] Error:", err.message);
        // Fallback if JSON parsing fails (rare but possible with local models)
        res.status(500).json({ error: "AI Generation Failed or Invalid Format. Try again." });
    }
});

// --- SERVER START ---
async function connectToDatabases() {
    try {
        mysqlPool = mysql.createPool(dbConfigMySQL);
        await mysqlPool.getConnection();
        console.log('✅ Local MySQL Connected (3306).');
        
        mariaDbPool = mysql.createPool(dbConfigMariaDB);
        await mariaDbPool.getConnection();
        console.log('✅ Local MariaDB Connected (3307).');
    } catch (error) {
        console.error('❌ Failed to connect to databases:', error);
        // process.exit(1); // Optional: Keep server running even if DB fails initially
    }
}

connectToDatabases().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    });
});