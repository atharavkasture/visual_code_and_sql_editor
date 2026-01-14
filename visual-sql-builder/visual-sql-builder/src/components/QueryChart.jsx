import React from 'react';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement, // NEW: For Line charts
  LineElement,  // NEW: For Line charts
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

// Register all necessary components for Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Helper function to generate random colors
const getRandomColor = () => `rgba(${Math.floor(Math.random() * 200) + 55}, ${Math.floor(Math.random() * 200) + 55}, ${Math.floor(Math.random() * 200) + 55}, 0.6)`;

const QueryChart = ({ type, data, xKey, yKey }) => {
    
    if (!xKey || !yKey) {
        return <div className="p-4 text-center text-slate-500">Please select a Label (Text) and Value (Number) column from the Chart Settings above to render the chart.</div>;
    }

    const labels = data.map(row => row[xKey]);
    const isMultiColor = type === 'pie' || type === 'doughnut';
    
    const chartData = {
        labels: labels,
        datasets: [{
            label: `${yKey} by ${xKey}`,
            data: data.map(row => row[yKey]),
            backgroundColor: isMultiColor
                ? labels.map(() => getRandomColor()) // Array of colors for pie/doughnut
                : 'rgba(59, 130, 246, 0.5)', // Single color for bar/line
            borderColor: isMultiColor
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(59, 130, 246, 1)',
            borderWidth: 1,
            // Line chart specific settings
            tension: 0.3, // Makes lines slightly curved (smoother)
            fill: type === 'line', // Optional: fill area under line
        }]
    };
    
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { 
                position: isMultiColor ? 'right' : 'top',
            },
            title: { 
                display: true, 
                text: `Query Result: ${yKey} by ${xKey}` 
            },
        },
    };

    // Return the correct chart component based on type
    switch (type) {
        case 'pie':
            return <Pie options={options} data={chartData} />;
        case 'doughnut':
            return <Doughnut options={options} data={chartData} />;
        case 'line':
            return <Line options={options} data={chartData} />;
        default: // 'bar'
            return <Bar options={options} data={chartData} />;
    }
};

export default QueryChart;