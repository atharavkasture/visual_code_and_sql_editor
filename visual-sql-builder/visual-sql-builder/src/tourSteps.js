import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const runTour = () => {
    const driverObj = driver({
        showProgress: true,
        animate: true,
        steps: [
            { 
                popover: { 
                    title: 'Welcome to Visual SQL Builder!', 
                    description: 'This tool helps you build, visualize, and run SQL queries on the Cloud. Let us take a quick tour.',
                    side: "left", 
                    align: 'start' 
                } 
            },
            { 
                element: '#db-selector', 
                popover: { 
                    title: 'Choose Your Database', 
                    description: 'Switch instantly between Cloud MySQL and Cloud MariaDB. The application adapts automatically.', 
                    side: "bottom", 
                    align: 'start' 
                } 
            },
            { 
                element: '#schema-panel', 
                popover: { 
                    title: 'Schema Explorer', 
                    description: 'View all tables here. Click a table to select it. You can also expand joined tables to see their columns.', 
                    side: "right", 
                    align: 'start' 
                } 
            },
            { 
                element: '#query-mode-bar', 
                popover: { 
                    title: 'Query Mode', 
                    description: 'Select what you want to do: SELECT (DQL), INSERT (DML), CREATE TABLE (DDL), etc.', 
                    side: "bottom", 
                    align: 'start' 
                } 
            },
            { 
                element: '#visual-builder', 
                popover: { 
                    title: 'Visual Builder', 
                    description: 'Build your query visually. Add Filters, Joins, Group By, and Order By clauses here without writing code.', 
                    side: "top", 
                    align: 'start' 
                } 
            },
            { 
                element: '#sql-editor', 
                popover: { 
                    title: 'Live SQL Editor', 
                    description: 'The generated SQL appears here automatically. You can also type manually and click "Sync to UI" to update the builder.', 
                    side: "top", 
                    align: 'start' 
                } 
            },
            { 
                element: '#results-panel', 
                popover: { 
                    title: 'Results & Visualization', 
                    description: 'View your data here. Use the chart icons to switch between Table, Bar, Line, Pie, and Doughnut charts.', 
                    side: "top", 
                    align: 'start' 
                } 
            },
            { 
                element: '#run-query-btn', 
                popover: { 
                    title: 'Execute', 
                    description: 'Click here to run your query against the live Cloud Database.', 
                    side: "left", 
                    align: 'start' 
                } 
            },
            { 
                element: '#ai-assistant-btn', 
                popover: { 
                    title: 'AI Assistant', 
                    description: 'Stuck? Click here to ask the AI (Gemini) to write the query for you in plain English.', 
                    side: "bottom", 
                    align: 'end' 
                } 
            }
        ]
    });

    driverObj.drive();
};