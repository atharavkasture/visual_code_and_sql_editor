const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os'); // Added to handle platform-specific executable extensions

const execute = (language, code) => {
    if (language === 'python') {
        return executePython(code);
    } else if (language === 'java') {
        return executeJava(code);
    } else if (language === 'cpp') {
        return executeCpp(code);
    } else if (language === 'csharp') {
        return executeCSharp(code);
    }
    return Promise.reject(new Error('Unsupported language for execution'));
};

const executePython = (code) => {
    return new Promise((resolve, reject) => {
        const python = spawn('python', ['-c', code]);
        let stdout = '';
        let stderr = '';

        python.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        python.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        python.on('close', (code) => {
            resolve({ stdout, stderr, exitCode: code });
        });
        
        python.on('error', (err) => {
            reject(err);
        });
    });
};

const executeJava = async (code) => {
    const tempDir = path.join(__dirname, 'temp_java_' + Date.now()); // Unique temp dir to avoid collisions
    await fs.ensureDir(tempDir);
    const javaFile = path.join(tempDir, 'Main.java');
    await fs.writeFile(javaFile, code);

    return new Promise((resolve, reject) => {
        // Compile
        const javac = spawn('javac', [javaFile]);
        let compileError = '';
        javac.stderr.on('data', data => compileError += data.toString());
        
        javac.on('close', (code) => {
            if (code !== 0) {
                fs.remove(tempDir); // Cleanup
                return resolve({ stdout: '', stderr: compileError, exitCode: code });
            }

            // Execute
            const java = spawn('java', ['-cp', tempDir, 'Main']);
            let stdout = '';
            let stderr = '';
            
            java.stdout.on('data', data => stdout += data.toString());
            java.stderr.on('data', data => stderr += data.toString());
            
            java.on('close', (exitCode) => {
                fs.remove(tempDir); // Cleanup
                resolve({ stdout, stderr, exitCode });
            });
            
            java.on('error', (err) => {
                fs.remove(tempDir);
                reject(err);
            });
        });

        javac.on('error', (err) => {
            fs.remove(tempDir);
            reject(err);
        });
    });
};

const executeCpp = async (code) => {
    const tempDir = path.join(__dirname, 'temp_cpp_' + Date.now());
    await fs.ensureDir(tempDir);
    const cppFile = path.join(tempDir, 'main.cpp');
    // Determine executable name based on OS (main.exe for Windows, main for Linux/Mac)
    const exeName = os.platform() === 'win32' ? 'main.exe' : './main';
    const exePath = path.join(tempDir, exeName);
    
    await fs.writeFile(cppFile, code);

    return new Promise((resolve, reject) => {
        // Compile using g++
        // -o defines the output executable name
        const gplusplus = spawn('g++', [cppFile, '-o', exePath]);
        let compileError = '';
        
        gplusplus.stderr.on('data', data => compileError += data.toString());

        gplusplus.on('close', (code) => {
            if (code !== 0) {
                fs.remove(tempDir);
                return resolve({ stdout: '', stderr: compileError, exitCode: code });
            }

            // Execute the compiled binary
            const program = spawn(exePath, [], { cwd: tempDir }); // Execute within tempDir
            let stdout = '';
            let stderr = '';

            program.stdout.on('data', data => stdout += data.toString());
            program.stderr.on('data', data => stderr += data.toString());

            program.on('close', (exitCode) => {
                fs.remove(tempDir);
                resolve({ stdout, stderr, exitCode });
            });

            program.on('error', (err) => {
                fs.remove(tempDir);
                reject(err);
            });
        });

        gplusplus.on('error', (err) => {
            fs.remove(tempDir);
            reject(err);
        });
    });
};

const executeCSharp = async (code) => {
    // C# execution via .NET Core requires a project structure.
    // This method creates a temporary console project, replaces Program.cs, and runs 'dotnet run'
    const tempDir = path.join(__dirname, 'temp_csharp_' + Date.now());
    await fs.ensureDir(tempDir);

    return new Promise(async (resolve, reject) => {
        try {
            // 1. Create a new console project
            const dotnetNew = spawn('dotnet', ['new', 'console'], { cwd: tempDir });
            
            dotnetNew.on('close', async (code) => {
                if (code !== 0) {
                    await fs.remove(tempDir);
                    return resolve({ stdout: '', stderr: 'Failed to create .NET project', exitCode: code });
                }

                // 2. Overwrite Program.cs with user code
                // Note: The generated code needs to match the structure expected by the C# generator 
                // (i.e., namespace GeneratedCode { class Program { ... } })
                const programCsPath = path.join(tempDir, 'Program.cs');
                await fs.writeFile(programCsPath, code);

                // 3. Run the project
                const dotnetRun = spawn('dotnet', ['run'], { cwd: tempDir });
                let stdout = '';
                let stderr = '';

                dotnetRun.stdout.on('data', data => stdout += data.toString());
                // dotnet run often outputs build info to stderr, which might be confusing.
                // You might want to filter this if strict "error only" stderr is needed.
                dotnetRun.stderr.on('data', data => stderr += data.toString());

                dotnetRun.on('close', async (exitCode) => {
                    await fs.remove(tempDir);
                    // Filter out standard dotnet build messages from stderr if needed
                    resolve({ stdout, stderr, exitCode });
                });
                
                dotnetRun.on('error', async (err) => {
                    await fs.remove(tempDir);
                    reject(err);
                });
            });

        } catch (err) {
            await fs.remove(tempDir);
            reject(err);
        }
    });
};

module.exports = { execute };