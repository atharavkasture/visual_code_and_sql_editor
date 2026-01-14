import React, { useState, useEffect } from 'react';
import { Play, Save, Download, DatabaseZap, BarChart2, PieChart, LineChart, Circle, Table } from 'lucide-react';
import SavedQueries from './SavedQueries';
import QueryChart from './QueryChart';

// Helper for form inputs
const FormInput = ({ label, children }) => (
    <div className="flex items-center gap-1">
        <label className="block text-sm font-medium text-slate-600">{label}:</label>
        {children}
    </div>
);

const ResultsPanel = ({ result, isLoading, onRunQuery, queryConfig, onConfigChange, chartConfig, onChartConfigChange }) => {
    const [showSaved, setShowSaved] = useState(false);
    const [viewMode, setViewMode] = useState('table'); 

    const isDDL = queryConfig.queryType === 'DDL';

    const [stringCols, setStringCols] = useState([]);
    const [numberCols, setNumberCols] = useState([]);
    
    const canShowChart = result && result.data && result.data.length > 0 &&
        Object.values(result.data[0]).some(val => typeof val === 'number') &&
        Object.values(result.data[0]).some(val => typeof val === 'string');
    
    useEffect(() => { 
        setViewMode('table'); 
        if (canShowChart) {
            const headers = Object.keys(result.data[0]);
            setStringCols(headers.filter(h => typeof result.data[0][h] === 'string'));
            setNumberCols(headers.filter(h => typeof result.data[0][h] === 'number'));
        } else {
            setStringCols([]);
            setNumberCols([]);
        }
    }, [result, canShowChart]);

    const downloadCSV = () => {
        if (!result || !result.data || result.data.length === 0) return;
        const headers = Object.keys(result.data[0]);
        const csvRows = [ headers.join(','), ...result.data.map(row => headers.map(fieldName => JSON.stringify(row[fieldName])).join(',')) ];
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `${queryConfig.selectedTable || 'query'}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
    
    const saveQuery = () => {
        const queryName = prompt("Enter a name for this query:");
        if (queryName) {
            const savedQueries = JSON.parse(localStorage.getItem('savedQueries') || '[]');
            savedQueries.push({ name: queryName, config: queryConfig, id: Date.now() });
            localStorage.setItem('savedQueries', JSON.stringify(savedQueries));
            alert(`Query "${queryName}" saved!`);
        }
    };

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="flex-shrink-0 p-2 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-slate-700">Actions & Results</h3>
                    {canShowChart && (
                        <div className="flex items-center bg-slate-200 rounded-md p-0.5">
                            <button onClick={() => setViewMode('table')} className={`p-1 rounded ${viewMode === 'table' ? 'bg-white shadow-sm' : ''}`} title="Table View"> <Table size={16} /> </button>
                            <button onClick={() => setViewMode('bar')} className={`p-1 rounded ${viewMode === 'bar' ? 'bg-white shadow-sm' : ''}`} title="Bar Chart"> <BarChart2 size={16} /> </button>
                            <button onClick={() => setViewMode('line')} className={`p-1 rounded ${viewMode === 'line' ? 'bg-white shadow-sm' : ''}`} title="Line Chart"> <LineChart size={16} /> </button>
                            <button onClick={() => setViewMode('pie')} className={`p-1 rounded ${viewMode === 'pie' ? 'bg-white shadow-sm' : ''}`} title="Pie Chart"> <PieChart size={16} /> </button>
                            <button onClick={() => setViewMode('doughnut')} className={`p-1 rounded ${viewMode === 'doughnut' ? 'bg-white shadow-sm' : ''}`} title="Doughnut Chart"> <Circle size={16} /> </button>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button id="run-query-btn" onClick={onRunQuery} disabled={isLoading} className="btn-primary"> {/* ADDED ID HERE */}
                        <Play size={16} /> <span>{isLoading ? 'Running...' : 'Run Query'}</span>
                    </button>
                     <button onClick={saveQuery} className="btn-secondary" title="Save Query"><Save size={16} /></button>
                     <button onClick={() => setShowSaved(true)} className="btn-secondary">Load Saved</button>
                    <button onClick={downloadCSV} disabled={!result || !result.data || isDDL} className="btn-secondary" title="Download CSV"><Download size={16} /></button>
                </div>
            </div>

            {viewMode !== 'table' && canShowChart && (
                <div className="p-2 bg-slate-100 border-b border-slate-200 flex items-center gap-2">
                    <span className="text-sm font-semibold">Chart Settings:</span>
                    <FormInput label="Labels (X-Axis)">
                        <select 
                            value={chartConfig.xKey} 
                            onChange={e => onChartConfigChange({...chartConfig, xKey: e.target.value})}
                            className="input-field-chart"
                        >
                            <option value="">Select Text Column...</option>
                            {stringCols.map(key => <option key={key} value={key}>{key}</option>)}
                        </select>
                    </FormInput>
                    <FormInput label="Values (Y-Axis)">
                        <select 
                            value={chartConfig.yKey}
                            onChange={e => onChartConfigChange({...chartConfig, yKey: e.target.value})}
                            className="input-field-chart"
                        >
                            <option value="">Select Number Column...</option>
                            {numberCols.map(key => <option key={key} value={key}>{key}</option>)}
                        </select>
                    </FormInput>
                </div>
            )}
            
            {isLoading && <div className="p-8 text-center text-slate-500">Executing query...</div>}

            {result && !isLoading && (
                <div className="flex-grow flex flex-col overflow-hidden">
                    <div className="p-2 text-xs text-slate-500 flex justify-between border-b border-slate-200">
                        <span>{result.message || `Query returned ${result.meta.rowsReturned} rows.`}</span>
                        <span>Runtime: {result.meta.runtimeMs} ms</span>
                    </div>

                    {/* Conditional rendering for Table vs. Charts */}
                    {viewMode !== 'table' && canShowChart ? (
                        <div className="flex-grow overflow-auto p-4 relative h-[60vh]">
                            <QueryChart 
                                type={viewMode} 
                                data={result.data} 
                                xKey={chartConfig.xKey}
                                yKey={chartConfig.yKey}
                            />
                        </div>
                    ) : (
                        result.data && result.data.length > 0 ? (
                            <div className="flex-grow overflow-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-600 uppercase bg-slate-100 sticky top-0">
                                        <tr>{Object.keys(result.data[0]).map(key => <th key={key} scope="col" className="px-4 py-2 font-medium">{key}</th>)}</tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {result.data.map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                {Object.values(row).map((val, j) => <td key={j} className="px-4 py-2 whitespace-nowrap">{String(val)}</td>)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                             <div className="flex-grow flex flex-col items-center justify-center text-slate-500 p-4">
                                <DatabaseZap size={48} className="text-green-500 mb-4" />
                                <h4 className="font-semibold text-slate-700">Query Executed Successfully</h4>
                                <p className="text-center">The operation completed with no rows returned. This is normal for commands like INSERT, UPDATE, or CREATE TABLE.</p>
                            </div>
                        )
                    )}
                </div>
            )}
            
            {!result && !isLoading && (
                 <div className="flex-grow flex items-center justify-center text-slate-400 p-4 text-center">
                    Run a query to see the results here.
                </div>
            )}
            
            {showSaved && <SavedQueries onClose={() => setShowSaved(false)} onLoad={onConfigChange} />}
            <style>{`.input-field-chart { @apply block w-full sm:text-sm rounded-md bg-white border border-slate-300 p-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm; }`}</style>
        </div>
    );
};
export default ResultsPanel;