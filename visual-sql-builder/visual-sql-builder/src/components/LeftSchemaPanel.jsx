import React, { useState, useEffect } from 'react';
import { Search, Key, ChevronDown, ChevronRight } from 'lucide-react';

const AGG_OPTIONS = ['NONE', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];

// NEW: A reusable component for a single column row
const ColumnRow = ({ table, column, isChecked, currentAgg, onColumnChange }) => {
    return (
        <li className="p-2 rounded-md hover:bg-slate-100">
            <div className="flex items-center">
                <input 
                    type="checkbox" 
                    checked={isChecked} 
                    onChange={() => onColumnChange(table.name, column.name, isChecked ? null : 'NONE')} 
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-3 text-sm font-medium text-slate-700">{column.name}</span>
                {column.pk > 0 && <Key size={12} className="ml-1 text-amber-500" title="Primary Key" />}
                <span className="ml-auto text-xs text-slate-500 uppercase">{column.type}</span>
            </div>
            {isChecked && (
                <div className="mt-2 pl-7">
                    <select 
                        value={currentAgg}
                        onChange={(e) => onColumnChange(table.name, column.name, e.target.value)}
                        className="input-field text-xs w-full"
                    >
                        {AGG_OPTIONS.map(agg => (
                            <option key={agg} value={agg}>{agg}</option>
                        ))}
                    </select>
                </div>
            )}
        </li>
    );
};

// NEW: A collapsible section for each table
const TableSection = ({ table, selectedColumnMap, onColumnChange, searchTerm, isBaseTable, alias }) => {
    const [isOpen, setIsOpen] = useState(isBaseTable); // Open base table by default

    const filteredColumns = table.columns.filter(col =>
        col.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // If search is active, open the section
    useEffect(() => {
        if (searchTerm) {
            setIsOpen(true);
        }
    }, [searchTerm]);

    return (
        <div className="border-b border-slate-200 last:border-b-0 py-2">
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="flex items-center justify-between w-full p-1 rounded hover:bg-slate-100"
            >
                <h3 className="text-md font-semibold text-slate-800">{table.name} <span className="text-sm font-normal text-slate-500">AS {alias}</span></h3>
                {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
            {isOpen && (
                <ul className="space-y-1 pt-1">
                    {filteredColumns.map(column => {
                        // The "key" for the map is now "alias.columnname"
                        const isChecked = selectedColumnMap.has(`${alias}.${column.name}`);
                        const currentAgg = selectedColumnMap.get(`${alias}.${column.name}`) || 'NONE';
                        return (
                            <ColumnRow
                                key={column.name}
                                table={{...table, name: alias}} // Pass the ALIAS as the table name
                                column={column}
                                isChecked={isChecked}
                                currentAgg={currentAgg}
                                onColumnChange={onColumnChange}
                            />
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

const LeftSchemaPanel = ({ schema, config, onTableSelect, onColumnChange }) => {
    const { selectedTable, selectedColumns, joins, selectedTableAlias } = config;
    const [searchTerm, setSearchTerm] = useState('');
    const tables = schema.tables || [];
    
    // Create a map of all tables we need to display
    const tablesToShow = new Map();
    const currentTable = tables.find(t => t.name === selectedTable);
    if (currentTable) {
        tablesToShow.set(currentTable.name, { ...currentTable, alias: selectedTableAlias || selectedTable, isBaseTable: true });
    }
    
    // Add any tables from the JOINs
    joins.forEach(join => {
        if (join.targetTable && !tablesToShow.has(join.targetTable)) {
            const joinedTableSchema = tables.find(t => t.name === join.targetTable);
            if (joinedTableSchema) {
                tablesToShow.set(joinedTableSchema.name, { ...joinedTableSchema, alias: join.alias || join.targetTable, isBaseTable: false });
            }
        }
    });

    // Create a fast-lookup map for selected columns: "tableAlias.column" -> "AGG_TYPE"
    const selectedColumnMap = new Map(
        selectedColumns.map(c => [`${c.table}.${c.name}`, c.aggregation])
    );

    return (
        <div className="p-4 h-full flex flex-col">
            <h2 className="text-lg font-semibold mb-3 text-slate-800">Schema Explorer</h2>
            <div className="mb-4">
                <label htmlFor="table-select" className="text-sm font-medium text-slate-600">Base Table (FROM)</label>
                <select id="table-select" value={selectedTable} onChange={(e) => onTableSelect(e.target.value)}
                    className="mt-1 w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white border shadow-sm">
                    <option value="">Select a table...</option>
                    {tables.map(table => (
                        <option key={table.name} value={table.name}>{table.name}</option>
                    ))}
                </select>
            </div>
            {currentTable && (
                <div className="flex-grow flex flex-col overflow-hidden">
                    <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Search all columns..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm border-slate-300 rounded-md bg-white border shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div className="flex-grow overflow-y-auto -mr-2 pr-2">
                        {/* NEW: Render a section for each table */}
                        {Array.from(tablesToShow.values()).map(table => (
                            <TableSection
                                key={table.name}
                                table={table}
                                alias={table.alias}
                                isBaseTable={table.isBaseTable}
                                selectedColumnMap={selectedColumnMap}
                                onColumnChange={onColumnChange}
                                searchTerm={searchTerm}
                            />
                        ))}
                    </div>
                </div>
            )}
            <style>{`.input-field { @apply block w-full sm:text-sm rounded-md bg-white border border-slate-300 p-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm; }`}</style>
        </div>
    );
};

export default LeftSchemaPanel;