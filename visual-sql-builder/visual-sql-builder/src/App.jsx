import React, { useState, useEffect } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import LeftSchemaPanel from './components/LeftSchemaPanel';
import QueryModeBar from './components/QueryModeBar';
import VisualBuilder from './components/VisualBuilder';
import SqlEditor from './components/SqlEditor';
import ResultsPanel from './components/ResultsPanel';
import AISidebar from './components/AISidebar';
import { buildSqlFromConfig, parseSqlToConfig } from './utils/sqlBuilder';
import { Menu, X, Bot, HelpCircle } from 'lucide-react'; // ADDED HelpCircle
import { runTour } from './tourSteps'; // IMPORT THE TOUR

const initialConfig = {
    queryType: 'DQL',
    action: 'SELECT',
    selectedTable: '',
    selectedTableAlias: 'A',
    selectedColumns: [], 
    joins: [], 
    filters: [], 
    groupBy: [], 
    having: [], 
    orderBy: { tableAlias: '', column: '', aggregation: 'NONE', direction: 'ASC' },
    limit: '',
    values: {},
    newTableName: '',
    newColumns: [{ id: 1, name: '', type: 'TEXT', constraint: 'NONE' }],
    alterType: 'RENAME_TABLE',
    renameTo: '',
    addColumn: { name: '', type: 'TEXT' },
    dropColumn: '',
};

// =================================================================
// This is your Backend URL.
// 1. FOR LOCAL "HYBRID DEMO":
const BACKEND_URL = 'http://localhost:3002';
// =================================================================


function App() {
  const [schema, setSchema] = useState({ tables: [] });
  const [queryConfig, setQueryConfig] = useState(initialConfig);
  const [generatedSql, setGeneratedSql] = useState('');
  const [editedSql, setEditedSql] = useState('');
  const [isSqlModified, setIsSqlModified] = useState(false);
  const [queryResult, setQueryResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showAISidebar, setShowAISidebar] = useState(false);
  const [dbType, setDbType] = useState('mysql');

  // NEW: State for the "smart" chart
  const [chartConfig, setChartConfig] = useState({ xKey: '', yKey: '' });

  useEffect(() => {
    const fetchSchema = async () => {
      console.log(`Fetching schema for ${dbType} from ${BACKEND_URL}...`);
      try {
        const response = await fetch(`${BACKEND_URL}/api/schema?dbType=${dbType}`);
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setSchema(data);
      } catch (error) {
        console.error("Failed to fetch schema:", error);
        alert(`Could not fetch schema for ${dbType}. Is the ${dbType} server running?\n\nDetails: ${error.message}`);
      }
    };
    fetchSchema();
  }, [queryResult, dbType]); 

  useEffect(() => {
    const newSql = buildSqlFromConfig(queryConfig, dbType);
    setGeneratedSql(newSql);
    if (!isSqlModified) setEditedSql(newSql);
  }, [queryConfig, isSqlModified, dbType]);

  const handleTableSelect = (tableName) => {
    const newConf = { 
        ...initialConfig, 
        selectedTable: tableName, 
        queryType: queryConfig.queryType, 
        action: queryConfig.action,
        dbType: dbType
    };
    if (queryConfig.action === 'DROP TABLE' || queryConfig.action === 'TRUNCATE TABLE') {
        newConf.newTableName = tableName;
    }
    setQueryConfig(newConf);
    setChartConfig({ xKey: '', yKey: '' });
    setIsSqlModified(false);
  };
  
  const handleColumnChange = (tableName, columnName, aggregation = null) => {
    setQueryConfig(prevConfig => {
        const newCols = [...prevConfig.selectedColumns];
        const tableAlias = (tableName === prevConfig.selectedTable)
            ? (prevConfig.selectedTableAlias || tableName)
            : (prevConfig.joins.find(j => j.targetTable === tableName)?.alias || tableName);

        const colIndex = newCols.findIndex(c => c.name === columnName && c.table === tableAlias);

        if (colIndex > -1) {
            if (aggregation === null) {
                newCols.splice(colIndex, 1);
            } else {
                newCols[colIndex].aggregation = aggregation;
            }
        } else {
            newCols.push({ table: tableAlias, name: columnName, aggregation: 'NONE' });
        }
        return { ...prevConfig, selectedColumns: newCols };
    });
    setChartConfig({ xKey: '', yKey: '' });
    setIsSqlModified(false);
  };
  
  const handleQueryConfigChange = (newConfig) => {
    setQueryConfig(newConfig);
    setIsSqlModified(false);
  };

  const handleSqlChange = (newSql) => {
    setEditedSql(newSql);
    setIsSqlModified(newSql !== generatedSql);
  };
  
  const handleUseAIQuery = (sql) => {
      handleSqlChange(sql);
      setShowAISidebar(false);
  };

  const handleRunQuery = async () => {
    if (!editedSql.trim() || editedSql.startsWith('--')) {
      alert("Cannot run an empty or placeholder query."); return;
    }
    setIsLoading(true);
    setQueryResult(null);
    setChartConfig({ xKey: '', yKey: '' });
    try {
        const startTime = performance.now();
        const response = await fetch(`${BACKEND_URL}/api/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql: editedSql, dbType: dbType }),
        });
        const result = await response.json();
        const endTime = performance.now();
        if (response.ok) {
            result.meta.runtimeMs = Math.round(endTime - startTime);
            setQueryResult(result);
        } else {
            alert(`SQL Error: ${result.error}`);
            setQueryResult({ data: [], meta: { rowsReturned: 0, runtimeMs: 0 } });
        }
    } catch (error) {
        console.error("Failed to run query:", error);
        alert("An error occurred while connecting to the backend.");
    }
    setIsLoading(false);
  };
  
  const handleParseSql = () => {
      const newConfig = parseSqlToConfig(editedSql, schema, dbType);
      if (newConfig) {
          const fullConfig = { ...initialConfig, ...newConfig };
          setQueryConfig(fullConfig);
          setChartConfig({ xKey: '', yKey: '' });
          setIsSqlModified(false);
          alert("Successfully synced SQL from editor to the visual builder!");
      } else {
          alert("Unable to map SQL to visual builder. Parser only supports simple queries.");
      }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 font-sans">
        <header className="flex-shrink-0 bg-white border-b border-slate-200 p-2 flex items-center justify-between shadow-sm z-10">
            <div className="flex items-center gap-3">
                <button onClick={() => setShowLeftPanel(!showLeftPanel)} className="p-2 rounded-md hover:bg-slate-100 lg:hidden">
                    {showLeftPanel ? <X size={20} /> : <Menu size={20} />}
                </button>
                <h1 className="text-xl font-bold text-slate-800">Visual SQL Builder</h1>
            </div>
             <div className="flex items-center space-x-4">
                {/* NEW: Help/Tour Button */}
                <button onClick={runTour} className="btn-secondary text-blue-600" title="Start Tour">
                    <HelpCircle size={16} />
                    <span>Help</span>
                </button>

                <button id="ai-assistant-btn" onClick={() => setShowAISidebar(true)} className="btn-secondary" title="Open AI Assistant"> {/* ADDED ID */}
                    <Bot size={16} /><span>AI Assistant</span>
                </button>
                <QueryModeBar 
                    config={queryConfig} 
                    onConfigChange={handleQueryConfigChange} 
                    initialConfig={initialConfig}
                    dbType={dbType}
                    onDbTypeChange={(newDbType) => {
                        setDbType(newDbType);
                        handleTableSelect(''); 
                    }} 
                />
            </div>
        </header>

        <main className="flex-grow flex overflow-hidden relative">
            <PanelGroup direction="horizontal" className="flex-1">
                {showLeftPanel && (
                    <>
                        <Panel defaultSize={20} minSize={15} maxSize={30} className="!overflow-y-auto bg-white border-r border-slate-200">
                           <div id="schema-panel" className="h-full"> {/* ADDED ID */}
                               <LeftSchemaPanel
                                    schema={schema}
                                    config={queryConfig}
                                    onTableSelect={handleTableSelect}
                                    onColumnChange={handleColumnChange}
                                    joins={queryConfig.joins}
                                />
                           </div>
                        </Panel>
                        <PanelResizeHandle className="w-1.5 bg-slate-200 hover:bg-blue-500 transition-colors" />
                    </>
                )}
                <Panel>
                    <PanelGroup direction="vertical">
                        <Panel defaultSize={55} minSize={20} className="p-4 bg-slate-50 overflow-auto">
                            <div id="visual-builder" className="h-full"> {/* ADDED ID */}
                                <VisualBuilder 
                                    schema={schema} 
                                    config={queryConfig} 
                                    onConfigChange={handleQueryConfigChange} 
                                    dbType={dbType} 
                                />
                            </div>
                        </Panel>
                        <PanelResizeHandle className="h-1.5 bg-slate-200 hover:bg-blue-500 transition-colors" />
                        <Panel defaultSize={45} minSize={20} className="flex flex-col">
                            <div id="sql-editor" className="h-full"> {/* ADDED ID */}
                                <SqlEditor sql={editedSql} onSqlChange={handleSqlChange} isModified={isSqlModified} onSync={handleParseSql} />
                            </div>
                        </Panel>
                    </PanelGroup>
                </Panel>
                <PanelResizeHandle className="w-1.5 bg-slate-200 hover:bg-blue-500 transition-colors" />
                <Panel defaultSize={35} minSize={25}>
                    <div id="results-panel" className="h-full"> {/* ADDED ID */}
                        <ResultsPanel 
                            result={queryResult} 
                            isLoading={isLoading} 
                            onRunQuery={handleRunQuery} 
                            queryConfig={queryConfig} 
                            onConfigChange={setQueryConfig}
                            chartConfig={chartConfig}
                            onChartConfigChange={setChartConfig}
                        />
                    </div>
                </Panel>
            </PanelGroup>

            {showAISidebar && (
                <AISidebar 
                    schema={schema} 
                    onUseQuery={handleUseAIQuery} 
                    onClose={() => setShowAISidebar(false)}
                    dbType={dbType} 
                    backendUrl={BACKEND_URL}
                />
            )}
        </main>
    </div>
  );
}
export default App;