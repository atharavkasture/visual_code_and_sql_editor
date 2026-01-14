import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const runTour = () => {
    const driverObj = driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        doneBtnText: 'Finish',
        nextBtnText: 'Next',
        prevBtnText: 'Previous',
        steps: [
            { 
                popover: { 
                    title: '🚀 Welcome to Visual Coder!', 
                    description: 'This IDE lets you build programs visually and convert them to Python, Java, C++, and C# instantly.',
                    side: "center", 
                    align: 'center' 
                } 
            },
            { 
                element: '#node-block-list', // Specific ID for the buttons
                popover: { 
                    title: '1. The Building Blocks', 
                    description: 'Drag these nodes (Assign, If/Else, Loops) onto the canvas to build your logic.',
                    side: "right", 
                    align: 'start' 
                } 
            },
            { 
                element: '#canvas-area', 
                popover: { 
                    title: '2. The Canvas', 
                    description: 'Drop nodes here and connect them. Remember to connect the "Start" node to your first block!',
                    side: "right", 
                    align: 'center' 
                } 
            },
            { 
                element: '#btn-generate', // Specific ID
                popover: { 
                    title: '3. Generate Code', 
                    description: 'Click this to convert your visual graph into actual code.',
                    side: "left", 
                    align: 'center' 
                } 
            },
            { 
                element: '#lang-tabs', // Specific ID
                popover: { 
                    title: '4. Choose Language', 
                    description: 'Toggle between Python, Java, C++, and C# to see the syntax differences.',
                    side: "left", 
                    align: 'center' 
                } 
            },
            { 
                element: '#btn-execute', // Specific ID
                popover: { 
                    title: '5. Run It!', 
                    description: 'Click Execute to run your code on our server and see the output below.',
                    side: "left", 
                    align: 'center' 
                } 
            },
            { 
                element: '#console-area', // Specific ID
                popover: { 
                    title: '6. Output Console', 
                    description: 'The results of your program (and any errors) will appear here.',
                    side: "left", 
                    align: 'start' 
                } 
            },
            { 
                element: '#save-function-area', 
                popover: { 
                    title: '7. Reusable Functions', 
                    description: 'Defined a cool function? Save it here to reuse it in other projects later.',
                    side: "left", 
                    align: 'start' 
                } 
            },
            { 
                element: '#header-chat-btn', // Specific ID in Top Bar
                popover: { 
                    title: '8. AI Assistant', 
                    description: 'Stuck? Toggle the AI Chat to get help building your algorithms.',
                    side: "bottom", 
                    align: 'end' 
                } 
            }
        ]
    });

    driverObj.drive();
};