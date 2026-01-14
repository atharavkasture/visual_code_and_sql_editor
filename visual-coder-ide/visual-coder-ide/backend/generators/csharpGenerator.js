function generate(ir) {
    if (!ir || ir.type !== 'program') {
        throw new Error('Invalid IR format.');
    }
    
    // 1. Generate Class Definitions (Indent 1: Inside Namespace)
    const classes = (ir.classes || []).map(cls => generateNode(cls, 1, new Set())).join('\n\n');

    // 2. Generate function definitions (Indent 2: Inside Program class)
    const functions = (ir.functions || []).map(func => generateNode(func, 2, new Set())).join('\n\n');
    
    // 3. Generate Main Body (Indent 3: Inside Main method)
    const mainBody = (ir.body || []).map(node => generateNode(node, 3, new Set())).join('\n');

    return `using System;
using System.Collections.Generic;

namespace GeneratedCode {
${classes}

    public class Program {
        public static void Main(string[] args) {
${mainBody}
        }

${functions}
    }
}`;
}

function mapCSharpType(dataType) {
    if (!dataType) return ''; 
    switch (dataType.toLowerCase()) {
        case 'boolean': return 'bool';
        case 'string': return 'string';
        case 'int': return 'int';
        case 'float': return 'float';
        case 'double': return 'double';
        case 'char': return 'char';
        default: return dataType;
    }
}

function formatCSharpValue(value, dataType) {
    if (dataType === 'String' || dataType === 'string') {
        if (!String(value).startsWith('"')) {
            return `"${value}"`;
        }
    }
    if (dataType === 'boolean' || dataType === 'bool') {
        return String(value).toLowerCase(); 
    }
    return value;
}


function generateNode(node, indent = 0, declarations) {
    const prefix = '    '.repeat(indent);
    const csType = mapCSharpType(node.dataType);

    switch (node.type) {
        // --- 1. Class Definition ---
        case 'class_define':
            // Generate members (variables and methods) inside the class
            const members = node.members.map(member => 
                generateNode(member, indent + 1, new Set())
            ).join('\n');

            return `${prefix}public class ${node.name} {\n${members}\n${prefix}}`;

        // --- 2. Variable Declaration ---
        case 'variable_declaration':
        case 'assign': 
            const valDec = formatCSharpValue(node.value, node.dataType);
            if (!declarations.has(node.var)) {
                declarations.add(node.var);
                // Handle empty declarations
                if (valDec === undefined || valDec === '') {
                    return `${prefix}${csType} ${node.var};`;
                }
                return `${prefix}${csType} ${node.var} = ${valDec};`;
            }
            return `${prefix}${node.var} = ${valDec};`;

        // --- 3. Variable Update ---
        case 'variable_update':
        case 'assign2': 
            const valUpd = formatCSharpValue(node.value, null);
            return `${prefix}${node.var} = ${valUpd};`;

        case 'array_assign_values':
            const csValues = node.values.map(v => formatCSharpValue(v, node.dataType)).join(', ');
            if (!declarations.has(node.var)) {
                declarations.add(node.var);
                return `${prefix}${csType}[] ${node.var} = { ${csValues} };`;
            }
            return `${prefix}${node.var} = new ${csType}[] { ${csValues} };`;
        
        case 'array_assign_size':
             if (!declarations.has(node.var)) {
                declarations.add(node.var);
                return `${prefix}${csType}[] ${node.var} = new ${csType}[${node.size}];`;
            }
            return `${prefix}${node.var} = new ${csType}[${node.size}];`;

        case 'print':
            return `${prefix}Console.WriteLine(${node.value});`;
        
        case 'if':
            const ifBody = node.body.map(child => generateNode(child, indent + 1, declarations)).join('\n');
            let result = `${prefix}if (${node.condition}) {\n${ifBody}\n${prefix}}`;
            if (node.elseBody && node.elseBody.length > 0) {
                const elseBody = node.elseBody.map(child => generateNode(child, indent + 1, declarations)).join('\n');
                result += ` else {\n${elseBody}\n${prefix}}`;
            }
            return result;

        case 'switch':
            let switchStr = `${prefix}switch (${node.var}) {\n`;
            if (node.cases) {
                node.cases.forEach(c => {
                    const caseBody = c.body.map(child => generateNode(child, indent + 2, declarations)).join('\n');
                    switchStr += `${prefix}    case ${c.value}:\n${caseBody}\n${prefix}        break;\n`;
                });
            }
            if (node.defaultBody && node.defaultBody.length > 0) {
                const defaultBody = node.defaultBody.map(child => generateNode(child, indent + 2, declarations)).join('\n');
                switchStr += `${prefix}    default:\n${defaultBody}\n${prefix}        break;\n`;
            }
            switchStr += `${prefix}}`;
            return switchStr;
        
        case 'for':
            const forBody = node.body.map(child => generateNode(child, indent + 1, declarations)).join('\n');
            return `${prefix}for (int ${node.var} = 0; ${node.var} < ${node.range}; ${node.var}++) {\n${forBody}\n${prefix}}`;

        case 'while':
            const whileBody = node.body.map(child => generateNode(child, indent + 1, declarations)).join('\n');
            return `${prefix}while (${node.condition}) {\n${whileBody}\n${prefix}}`;

        case 'function_define':
            const funcBody = node.body.map(child => generateNode(child, indent + 1, new Set())).join('\n');
            const params = node.params.map(p => `${mapCSharpType(p.type)} ${p.name}`).join(', ');
            
            // In C# Program class, methods must be static to be called from static Main.
            // If inside a custom class, they can be instance methods.
            // Heuristic: If indent is 2, it's inside Program (or another class member level), let's default to static for safety in this simple IDE.
            // Or we could check if it was part of "ir.functions" (global) vs "node.members" (class).
            // For now, defaulting to public static is the safest bet for the "Program" class context.
            // If you want instance methods in custom classes, you might remove 'static' here.
            return `${prefix}public static void ${node.name}(${params}) {\n${funcBody}\n${prefix}}`;

        case 'function_call':
            const args = node.args.join(', ');
            return `${prefix}${node.name}(${args});`;
        
        case 'object_creation':
            const csArgs = node.args.join(', ');
    // Output: Dog myDog = new Dog(args);
            return `${prefix}${node.className} ${node.var} = new ${node.className}(${csArgs});`;

        default:
            return `${prefix}// Unsupported node type for C#: ${node.type}`;
    }
}

module.exports = { generate };