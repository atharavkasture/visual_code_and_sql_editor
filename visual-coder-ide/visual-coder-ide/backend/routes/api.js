const express = require('express');
const { generateCode, executeCode, saveProject, loadProject, listProjects, saveFunction, loadFunction, listFunctions } = require('../controllers/codeController');

const router = express.Router();

// POST /api/generate
router.post('/generate', generateCode);

// POST /api/execute
router.post('/execute', executeCode);

// POST /api/save-project
router.post('/save-project', saveProject);

// GET /api/load-project/:name
router.get('/load-project/:name', loadProject);

// GET /api/list-projects
router.get('/list-projects', listProjects);

// POST /api/save-function
router.post('/save-function', saveFunction);

// GET /api/load-function/:name
router.get('/load-function/:name', loadFunction);

// GET /api/list-functions
router.get('/list-functions', listFunctions);

module.exports = router;