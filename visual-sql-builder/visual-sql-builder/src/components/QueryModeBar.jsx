import React from 'react';

const queryOptions = {
    DQL: ['SELECT'],
    DML: ['INSERT', 'UPDATE', 'DELETE'],
    // NEW: Added TRUNCATE TABLE
    DDL: ['CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'TRUNCATE TABLE'],
    // TCL present for state
    TCL: ['COMMIT', 'ROLLBACK', 'START TRANSACTION'],
    DCL: ['GRANT', 'REVOKE'],
};

const QueryModeBar = ({ config, onConfigChange, initialConfig, dbType, onDbTypeChange }) => {
    const handleTypeChange = (e) => {
        const newType = e.target.value;
        const newAction = newType === 'TCL' ? 'COMMIT' : queryOptions[newType][0];
        onConfigChange({ ...initialConfig, queryType: newType, action: newAction, selectedTable: config.selectedTable });
    };

    const handleActionChange = (e) => {
        const newAction = e.target.value;
        onConfigChange({ ...initialConfig, queryType: config.queryType, action: newAction, selectedTable: config.selectedTable });
    };

    return (
        <div id="query-mode-bar" className="flex items-center space-x-4"> {/* ADDED ID */}
            <select 
                id="db-selector" // ADDED ID
                value={dbType} 
                onChange={(e) => onDbTypeChange(e.target.value)} 
                className="text-sm rounded-md bg-white border border-slate-300 p-2"
                title="Select the database to connect to"
            >
                <option value="mysql">Cloud MySQL</option>
                <option value="mariadb">Cloud MariaDB</option>
            </select>
            
            <select value={config.queryType} onChange={handleTypeChange} className="text-sm rounded-md bg-white border border-slate-300 p-2">
                {Object.keys(queryOptions).map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
            </select>
            
            {config.queryType !== 'TCL' ? (
                <select value={config.action} onChange={handleActionChange} className="text-sm rounded-md bg-white border border-slate-300 p-2">
                    {queryOptions[config.queryType].map(action => (
                        <option key={action} value={action}>{action}</option>
                    ))}
                </select>
            ) : (
                <div className="text-sm text-slate-500 px-3 py-2 rounded-md bg-yellow-50 border border-yellow-100">
                    Transaction mode — paste commands in editor.
                </div>
            )}
        </div>
    );
};

export default QueryModeBar;