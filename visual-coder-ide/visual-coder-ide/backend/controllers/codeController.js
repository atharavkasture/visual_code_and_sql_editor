const pythonGenerator = require('../generators/pythonGenerator');
const javaGenerator = require('../generators/javaGenerator');
// Import the new generators
const cppGenerator = require('../generators/cppGenerator');
const csharpGenerator = require('../generators/csharpGenerator');
const codeExecutor = require('../services/codeExecutor');

const generateCode = (req, res) => {
    const { language, ir } = req.body;
    try {
        let code;
        if (language === 'python') {
            code = pythonGenerator.generate(ir);
        } else if (language === 'java') {
            code = javaGenerator.generate(ir);
        } else if (language === 'cpp') {
            // Handle C++ generation
            code = cppGenerator.generate(ir);
        } else if (language === 'csharp') {
            // Handle C# generation
            code = csharpGenerator.generate(ir);
        } else {
            return res.status(400).json({ error: 'Unsupported language' });
        }
        res.status(200).json({ code });
    } catch (error) {
        console.error('Code generation error:', error);
        res.status(500).json({ error: 'Failed to generate code', details: error.message });
    }
};

const executeCode = async (req, res) => {
    const { language, code } = req.body;
    try {
        // Ensure your codeExecutor service is updated to handle 'cpp' and 'csharp' strings
        const output = await codeExecutor.execute(language, code);
        res.status(200).json(output);
    } catch (error) {
        console.error('Code execution error:', error);
        res.status(500).json({ error: 'Failed to execute code', details: error.message });
    }
};

const fs = require('fs-extra');
const path = require('path');

const PROJECTS_DIR = path.join(__dirname, '../saved_projects');
const FUNCTIONS_DIR = path.join(__dirname, '../saved_functions');

const saveProject = async (req, res) => {
    const { name, code, diagram } = req.body;
    if (!name || !code || !diagram) {
        return res.status(400).json({ error: 'Missing name, code, or diagram' });
    }
    try {
        const projectDir = path.join(PROJECTS_DIR, name);
        await fs.ensureDir(projectDir);
        await fs.writeFile(path.join(projectDir, 'code.json'), JSON.stringify(code, null, 2));
        await fs.writeFile(path.join(projectDir, 'diagram.json'), JSON.stringify(diagram, null, 2));
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save project', details: error.message });
    }
};

const loadProject = async (req, res) => {
    const { name } = req.params;
    try {
        const projectDir = path.join(PROJECTS_DIR, name);
        const code = await fs.readJson(path.join(projectDir, 'code.json'));
        const diagram = await fs.readJson(path.join(projectDir, 'diagram.json'));
        res.status(200).json({ code, diagram });
    } catch (error) {
        res.status(404).json({ error: 'Project not found', details: error.message });
    }
};

const listProjects = async (req, res) => {
    try {
        const projects = await fs.readdir(PROJECTS_DIR);
        res.status(200).json({ projects });
    } catch (error) {
        res.status(500).json({ error: 'Failed to list projects', details: error.message });
    }
};

const saveFunction = async (req, res) => {
    const { name, functionData } = req.body;
    if (!name || !functionData) {
        return res.status(400).json({ error: 'Missing name or functionData' });
    }
    try {
        await fs.ensureDir(FUNCTIONS_DIR);
        await fs.writeFile(path.join(FUNCTIONS_DIR, `${name}.json`), JSON.stringify(functionData, null, 2));
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save function', details: error.message });
    }
};

const loadFunction = async (req, res) => {
    const { name } = req.params;
    try {
        const data = await fs.readJson(path.join(FUNCTIONS_DIR, `${name}.json`));
        res.status(200).json({ functionData: data });
    } catch (error) {
        res.status(404).json({ error: 'Function not found', details: error.message });
    }
};

const listFunctions = async (req, res) => {
    try {
        await fs.ensureDir(FUNCTIONS_DIR);
        const files = await fs.readdir(FUNCTIONS_DIR);
        const functions = files.filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, ''));
        res.status(200).json({ functions });
    } catch (error) {
        res.status(500).json({ error: 'Failed to list functions', details: error.message });
    }
};

module.exports = {
    generateCode,
    executeCode,
    saveProject,
    loadProject,
    listProjects,
    saveFunction,
    loadFunction,
    listFunctions,
};