function generate(ir) {
    if (!ir || ir.type !== 'program') {
        throw new Error('Invalid IR format.');
    }

    // 1. Generate Class Definitions
    const classes = (ir.classes || []).map(cls => generateNode(cls, 0)).join('\n\n');

    // 2. Generate Function Definitions
    const functions = (ir.functions || []).map(func => generateNode(func, 0)).join('\n\n');
    
    // 3. Generate Main Body
    const mainBody = (ir.body || []).map(node => generateNode(node, 0)).join('\n');

    // Combine sections with spacing, filtering out empty sections
    return [classes, functions, mainBody].filter(Boolean).join('\n\n');
}

// --- 1. Helper: Convert Division & Logic ---
function toPythonOp(str) {
    if (!str) return str;
    
    // Check if string literal (don't touch inside quotes)
    if ((String(str).startsWith('"') && String(str).endsWith('"')) || 
        (String(str).startsWith("'") && String(str).endsWith("'"))) {
        return str;
    }

    // Replace / with // (Integer Division)
    // Uses lookbehind/lookahead to avoid changing existing // or comments
    let clean = str.replace(/(?<!\/)\/(?!\/)/g, '//');
    
    // Replace Logic Operators
    clean = clean
        .replace(/&&/g, ' and ')
        .replace(/\|\|/g, ' or ')
        .replace(/!([^=])/g, 'not $1') // !x -> not x
        .replace(/\btrue\b/g, 'True')
        .replace(/\bfalse\b/g, 'False');

    return clean;
}

// --- 2. Helper: Split Increments (i++) ---
function processPostIncrements(str) {
    if (!str) return { cleanStr: str, increments: [] };
    
    const regex = /([a-zA-Z0-9_$]+)(\+\+|--)/g;
    let increments = [];
    
    let cleanStr = str.replace(regex, (match, varName, op) => {
        const pyOp = op === '++' ? ' += 1' : ' -= 1';
        increments.push(`${varName}${pyOp}`);
        return varName; 
    });
    
    cleanStr = toPythonOp(cleanStr);

    return { cleanStr, increments };
}

// --- 3. Helper: Format Values ---
function formatValue(val) {
    if (val === undefined || val === null) return 'None';
    
    // Booleans
    if (val === 'true') return 'True';
    if (val === 'false') return 'False';
    
    // Numbers
    if (!isNaN(parseFloat(val)) && isFinite(val)) return val;
    
    // Strings (already quoted)
    if ((String(val).startsWith('"') && String(val).endsWith('"')) || 
        (String(val).startsWith("'") && String(val).endsWith("'"))) {
        return val;
    }

    // Detect Code (Math, Brackets)
    const hasMathChars = /[\+\-\*\/\%\(\)\[\]\<\>\=\!]/.test(val);
    if (hasMathChars) {
        let cleanVal = val.includes('.length') ? val.replace(/(\w+)\.length/g, 'len($1)') : val;
        return toPythonOp(cleanVal);
    }

    // Identifier check
    const isIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(val);
    if (isIdentifier) return val;

    // Fallback to string literal
    return `'${val}'`;
}

function generateNode(node, indent = 0) {
    const prefix = '    '.repeat(indent); 
    
    switch (node.type) {
        // --- Class Definition ---
        case 'class_define':
            // Generate members (methods and nested classes)
            // Python requires 'pass' if the class is empty
            const classBody = node.members.map(member => 
                // We assume members are mostly functions (methods).
                // Note: In Python, you usually manually add 'self' to params in the UI,
                // or we could automate it here, but manual is safer for generic generators.
                generateNode(member, indent + 1)
            ).join('\n');
            
            return `${prefix}class ${node.name}:\n${classBody || prefix + '    pass'}`;

        // --- Assignments ---
        case 'variable_declaration':
        case 'variable_update': 
        case 'assign': 
        case 'assign2': 
            const lhs = processPostIncrements(node.var);
            const rhs = processPostIncrements(node.value);
            
            const finalRhs = formatValue(rhs.cleanStr); 
            let codeBlock = `${prefix}${lhs.cleanStr} = ${finalRhs}`;

            const allIncrements = [...lhs.increments, ...rhs.increments];
            if (allIncrements.length > 0) {
                const incLines = allIncrements.map(inc => `${prefix}${inc}`).join('\n');
                codeBlock += `\n${incLines}`;
            }
            
            return codeBlock;
        
        case 'array_assign_values':
            const pyValues = node.values.map(formatValue).join(', ');
            return `${prefix}${node.var} = [${pyValues}]`;
        
        case 'array_assign_size':
            return `${prefix}${node.var} = [None] * ${node.size}`;

        case 'print':
            return `${prefix}print(${formatValue(node.value)})`;
        
        // --- Control Flow ---
        case 'if':
            const cond = toPythonOp(node.condition);
            const ifBody = node.body.map(child => generateNode(child, indent + 1)).join('\n');
            let result = `${prefix}if ${cond}:\n${ifBody || prefix + '    pass'}`;
            if (node.elseBody && node.elseBody.length > 0) {
                const elseBody = node.elseBody.map(child => generateNode(child, indent + 1)).join('\n');
                result += `\n${prefix}else:\n${elseBody}`;
            }
            return result;
        
        case 'switch':
            let switchStr = '';
            const cases = node.cases || [];
            cases.forEach((c, index) => {
                const keyword = index === 0 ? 'if' : 'elif';
                const condition = `${node.var} == ${formatValue(c.value)}`;
                const caseBody = c.body.map(child => generateNode(child, indent + 1)).join('\n');
                switchStr += `${prefix}${keyword} ${condition}:\n${caseBody || prefix + '    pass'}\n`;
            });
            if (node.defaultBody && node.defaultBody.length > 0) {
                const defaultBody = node.defaultBody.map(child => generateNode(child, indent + 1)).join('\n');
                switchStr += `${prefix}else:\n${defaultBody}`;
            } else if (cases.length === 0) {
                 return `${prefix}pass # Empty switch`;
            }
            return switchStr.trimEnd();

        case 'for':
            const forBody = node.body.map(child => generateNode(child, indent + 1)).join('\n');
            const rangeVal = toPythonOp(node.range);
            return `${prefix}for ${node.var} in range(${rangeVal}):\n${forBody || prefix + '    pass'}`;

        case 'while':
            const whileCond = toPythonOp(node.condition);
            const whileBody = node.body.map(child => generateNode(child, indent + 1)).join('\n');
            return `${prefix}while ${whileCond}:\n${whileBody || prefix + '    pass'}`;

        case 'function_define':
            const funcBody = node.body.map(child => generateNode(child, indent + 1)).join('\n');
            const params = node.params.map(p => p.name.replace('[]', '')).join(', ');
            return `${prefix}def ${node.name}(${params}):\n${funcBody || prefix + '    pass'}`;
        
        case 'function_call':
             const args = node.args.join(', ');
            return `${prefix}${node.name}(${args})`;
        
        case 'object_creation':
            const pyArgs = node.args.join(', ');
            return `${prefix}${node.var} = ${node.className}(${pyArgs})`;

        default:
            return `${prefix}# Unsupported node type: ${node.type}`;
    }
}

module.exports = { generate };