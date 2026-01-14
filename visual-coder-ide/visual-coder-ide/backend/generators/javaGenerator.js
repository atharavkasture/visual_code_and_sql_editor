function generate(ir) {
    if (!ir || ir.type !== 'program') {
        throw new Error('Invalid IR format.');
    }
    
    // 1. Generate Class Definitions (Placed outside Main class)
    const classes = (ir.classes || []).map(cls => generateNode(cls, 0, new Set())).join('\n\n');

    // 2. Generate function definitions (Static methods inside Main)
    const functions = (ir.functions || []).map(func => generateNode(func, 1, new Set())).join('\n\n');
    
    // 3. Generate Main Body
    const mainBody = (ir.body || []).map(node => generateNode(node, 2, new Set())).join('\n');

    return `${classes}

public class Main {
    public static void main(String[] args) {
${mainBody}
    }

${functions}
}`;
}

function mapJavaType(dataType) {
    if (!dataType) return ''; 
    switch (dataType.toLowerCase()) {
        case 'string': return 'String';
        case 'boolean': return 'boolean';
        case 'int': return 'int';
        case 'float': return 'float';
        case 'double': return 'double';
        case 'char': return 'char';
        // Allow custom class names to pass through
        default: return dataType;
    }
}

function formatJavaValue(value, dataType) {
    if (dataType === 'String' || dataType === 'string') {
        if (!String(value).startsWith('"')) {
            return `"${value}"`;
        }
    }
    if (dataType === 'boolean') {
        return value === 'true' ? 'true' : 'false';
    }
    return value;
}


function generateNode(node, indent = 0, declarations) {
    const prefix = '    '.repeat(indent);
    const javaType = mapJavaType(node.dataType);

    switch (node.type) {
        // --- 1. Class Definition ---
        case 'class_define':
            // Generate members (variables and methods) inside the class
            const members = node.members.map(member => 
                generateNode(member, indent + 1, new Set())
            ).join('\n');

            // We generate a standard class. 
            // Note: In a single file, only 'Main' is public. Others are default (package-private).
            return `${prefix}class ${node.name} {\n${members}\n${prefix}}`;

        // --- 2. Variable Declaration ---
        case 'variable_declaration':
        case 'assign': 
            const valDec = formatJavaValue(node.value, node.dataType);
            
            if (!declarations.has(node.var)) {
                declarations.add(node.var);
                // Handle empty values (e.g. "Dog myDog;")
                if (valDec === undefined || valDec === '') {
                     return `${prefix}${javaType} ${node.var};`;
                }
                return `${prefix}${javaType} ${node.var} = ${valDec};`;
            }
            return `${prefix}${node.var} = ${valDec};`;

        // --- 3. Variable Update ---
        case 'variable_update':
        case 'assign2': 
            const valUpd = formatJavaValue(node.value, null);
            return `${prefix}${node.var} = ${valUpd};`;

        case 'array_assign_values':
            const javaValues = node.values.map(v => formatJavaValue(v, node.dataType)).join(', ');
            if (!declarations.has(node.var)) {
                declarations.add(node.var);
                return `${prefix}${javaType}[] ${node.var} = {${javaValues}};`;
            }
            return `${prefix}${node.var} = new ${javaType}[]{${javaValues}};`;
        
        case 'array_assign_size':
             if (!declarations.has(node.var)) {
                declarations.add(node.var);
                return `${prefix}${javaType}[] ${node.var} = new ${javaType}[${node.size}];`;
            }
            return `${prefix}${node.var} = new ${javaType}[${node.size}];`;

        case 'print':
            return `${prefix}System.out.println(${node.value});`;
        
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
            const params = node.params.map(p => `${mapJavaType(p.type)} ${p.name}`).join(', ');
            // If we are nesting functions inside main class, they are static methods
            // If we are inside a Class Definition, we might want them to be instance methods
            // For simplicity in this generator, we default to public static for main, 
            // but we can adjust to 'public' only if inside a class context.
            // However, distinguishing context here requires passing a flag. 
            // Given the typical simple use case, 'public static' is safe for Main, 
            // and often acceptable for helper classes unless specific object instance logic is needed.
            // To be safe for Classes:
            if (indent > 0) {
                 // Likely inside a class, make it an instance method
                 return `${prefix}public static void ${node.name}(${params}) {\n${funcBody}\n${prefix}}`;
            }
            // Global/Main functions
            return `${prefix}public static void ${node.name}(${params}) {\n${funcBody}\n${prefix}}`;

        case 'function_call':
            const args = node.args.join(', ');
            return `${prefix}${node.name}(${args});`;

        case 'object_creation':
            const javaArgs = node.args.join(', ');
    // Output: Dog myDog = new Dog(args);
            return `${prefix}${node.className} ${node.var} = new ${node.className}(${javaArgs});`;

        default:
            return `${prefix}// Unsupported node type for Java: ${node.type}`;
    }
}

module.exports = { generate };