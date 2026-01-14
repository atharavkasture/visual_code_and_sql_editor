function generate(ir) {
    if (!ir || ir.type !== 'program') {
        throw new Error('Invalid IR format.');
    }
    
    // 1. Generate Class Definitions
    // We pass a new Set() for declarations so class member names don't conflict with globals
    const classes = (ir.classes || []).map(cls => generateNode(cls, 0, new Set())).join('\n\n');

    // 2. Generate Function Definitions
    const functions = (ir.functions || []).map(func => generateNode(func, 0, new Set())).join('\n\n');
    
    // 3. Generate Main Body
    const mainBody = (ir.body || []).map(node => generateNode(node, 1, new Set())).join('\n');

    return `#include <iostream>
#include <string>
#include <vector>
#include <algorithm>

using namespace std;

${classes}

${functions}

int main() {
${mainBody}
    return 0;
}`;
}

function mapCppType(dataType) {
    switch (dataType) {
        case 'String': return 'string';
        case 'boolean': return 'bool';
        case 'int': return 'int';
        case 'float': return 'float';
        // Allow custom types (like class names) to pass through
        default: return dataType || '';
    }
}

function formatCppValue(value, dataType) {
    if (dataType === 'String') {
        return `"${value}"`;
    }
    if (dataType === 'boolean') {
        return value === 'true' ? 'true' : 'false';
    }
    return value;
}

function generateNode(node, indent = 0, declarations) {
    const prefix = '    '.repeat(indent);
    const cppType = mapCppType(node.dataType);

    switch (node.type) {
        // --- 1. Class Definition ---
        case 'class_define':
            // Generate members (variables and methods) inside the class
            // We use indent + 1 so members are indented inside the class
            const members = node.members.map(member => 
                generateNode(member, indent + 1, new Set())
            ).join('\n');

            return `${prefix}class ${node.name} {\n${prefix}public:\n${members}\n${prefix}};`;

        // --- 2. Variable Declaration ---
        case 'variable_declaration':
        case 'assign': 
            const valDec = formatCppValue(node.value, node.dataType);
            
            if (!declarations.has(node.var)) {
                declarations.add(node.var);
                // Handle empty values (e.g., "Dog d;" instead of "Dog d = ;")
                if (valDec === undefined || valDec === '') {
                    return `${prefix}${cppType} ${node.var};`;
                }
                return `${prefix}${cppType} ${node.var} = ${valDec};`;
            }
            // Update existing variable
            return `${prefix}${node.var} = ${valDec};`;

        // --- 3. Variable Update ---
        case 'variable_update':
        case 'assign2': 
            const valUpd = formatCppValue(node.value, null);
            return `${prefix}${node.var} = ${valUpd};`;

        case 'array_assign_values':
            const cppValues = node.values.map(v => formatCppValue(v, node.dataType)).join(', ');
            if (!declarations.has(node.var)) {
                declarations.add(node.var);
                return `${prefix}${cppType} ${node.var}[] = {${cppValues}};`;
            }
            return `${prefix}${node.var}[] = {${cppValues}};`;
        
        case 'array_assign_size':
             if (!declarations.has(node.var)) {
                declarations.add(node.var);
                // C++ stack array declaration: int arr[10];
                return `${prefix}${cppType} ${node.var}[${node.size}];`;
            }
            // Note: C-style arrays cannot be easily resized. 
            // If using std::vector, we would use .resize(). 
            // For now, we assume strict array behavior or manual vector management.
            return `${prefix}// Warning: Cannot resize C-style array ${node.var}`;

        case 'print':
            return `${prefix}cout << ${node.value} << endl;`;
        
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
                    switchStr += `${prefix}    case ${c.value}: {\n${caseBody}\n${prefix}        break;\n${prefix}    }\n`;
                });
            }
            if (node.defaultBody && node.defaultBody.length > 0) {
                const defaultBody = node.defaultBody.map(child => generateNode(child, indent + 2, declarations)).join('\n');
                switchStr += `${prefix}    default: {\n${defaultBody}\n${prefix}        break;\n${prefix}    }\n`;
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
            const params = node.params.map(p => `${mapCppType(p.type)} ${p.name}`).join(', ');
            return `${prefix}void ${node.name}(${params}) {\n${funcBody}\n${prefix}}`;

        case 'function_call':
            const args = node.args.join(', ');
            return `${prefix}${node.name}(${args});`;

        case 'object_creation':
            const cppArgs = node.args.join(', ');
            if (!cppArgs) {
        // Warning: "Dog d();" is a function prototype in C++, not an object!
        // Correct way for empty constructor is "Dog d;"
                return `${prefix}${node.className} ${node.var};`;
            }
    // Output: Dog d(10, "red");
            return `${prefix}${node.className} ${node.var}(${cppArgs});`;

        default:
            return `${prefix}// Unknown node type: ${node.type}`;
    }
}

module.exports = { generate };