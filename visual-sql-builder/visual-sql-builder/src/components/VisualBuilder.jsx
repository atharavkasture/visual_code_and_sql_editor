import React from 'react';
import { Plus, Trash2, ArrowDown, ArrowUp } from 'lucide-react';

// Helper component for UI sections
const BuilderSection = ({ title, children }) => (
    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <h3 className="text-md font-semibold text-slate-700 mb-4">{title}</h3>
        <div className="space-y-4">{children}</div>
    </div>
);

// Helper for form inputs
const FormInput = ({ label, children }) => (
    <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
        {children}
    </div>
);

// Helper component for a single filter row (WHERE)
const FilterRow = ({ filter, onUpdate, onRemove, allColumns }) => (
    <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-100 rounded-md">
        <select value={`${filter.tableAlias}.${filter.column}`} onChange={e => {
            const [tableAlias, column] = e.target.value.split('.');
            onUpdate({ ...filter, tableAlias, column });
        }} className="input-field">
            <option value="">Select Column...</option>
            {allColumns.map(c => <option key={c.key} value={`${c.alias}.${c.name}`}>{c.prefixedName}</option>)}
        </select>
        <select value={filter.operator} onChange={e => onUpdate({ ...filter, operator: e.target.value })} className="input-field">
            <option value="=">=</option><option value="!=">!=</option><option value=">">&gt;</option><option value="<">&lt;</option>
            <option value="LIKE">LIKE</option><option value="IN">IN</option>
        </select>
        <input type="text" value={filter.value} onChange={e => onUpdate({ ...filter, value: e.target.value })} placeholder="Value" className="input-field flex-1" />
        <button onClick={onRemove} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><Trash2 size={16} /></button>
    </div>
);

// NEW: A component for JOIN rows
const JoinRow = ({ join, onUpdate, onRemove, allTables, currentTableColumns, schema, baseTableAlias }) => {
    const targetTableSchema = schema.tables.find(t => t.name === join.targetTable);
    const targetTableColumns = targetTableSchema ? targetTableSchema.columns : [];

    return (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-100 rounded-md">
            <select value={join.type} onChange={e => onUpdate({ ...join, type: e.target.value })} className="input-field">
                <option>INNER JOIN</option><option>LEFT JOIN</option><option>RIGHT JOIN</option>
            </select>
            <select value={join.targetTable} onChange={e => onUpdate({ ...join, targetTable: e.target.value })} className="input-field">
                <option value="">Target Table</option>
                {allTables.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
            <span className="text-slate-500">AS</span>
            <input type="text" placeholder="Alias (e.g., B)" value={join.alias} onChange={e => onUpdate({ ...join, alias: e.target.value })} className="input-field w-24" />
            <span className="text-slate-500">ON</span>
            <select value={join.onCol1} onChange={e => onUpdate({ ...join, onCol1: e.target.value })} className="input-field">
                <option value="">{baseTableAlias} Column</option>
                {currentTableColumns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <span className="text-slate-500">=</span>
            <select value={join.onCol2} onChange={e => onUpdate({ ...join, onCol2: e.target.value })} className="input-field">
                <option value="">{join.alias || join.targetTable} Column</option>
                {targetTableColumns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <button onClick={onRemove} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><Trash2 size={16} /></button>
        </div>
    );
};

// NEW: A component for HAVING rows
const HavingRow = ({ having, onUpdate, onRemove, aggregatedColumns }) => (
    <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-md">
        <select value={`${having.tableAlias}.${having.column}`} onChange={e => {
            const selectedOpt = e.target.selectedOptions[0];
            onUpdate({ ...having, column: e.target.value, tableAlias: selectedOpt.getAttribute('data-alias'), aggregation: selectedOpt.getAttribute('data-agg') });
        }} className="input-field">
            <option value="">Aggregated Column...</option>
            {aggregatedColumns.map(c => 
                <option key={c.key} value={c.name} data-alias={c.alias} data-agg={c.aggregation}>
                    {c.prefixedName}
                </option>
            )}
        </select>
        <select value={having.operator} onChange={e => onUpdate({ ...having, operator: e.target.value })} className="input-field">
            <option value="=">=</option><option value="!=">!=</option><option value=">">&gt;</option><option value="<">&lt;</option>
        </select>
        <input type="text" value={having.value} onChange={e => onUpdate({ ...having, value: e.target.value })} placeholder="Value" className="input-field flex-1" />
        <button onClick={onRemove} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><Trash2 size={16} /></button>
    </div>
);


const VisualBuilder = ({ schema, config, onConfigChange, dbType }) => {
    const { selectedTable, selectedTableAlias } = config;
    const tableSchema = schema.tables.find(t => t.name === selectedTable);
    const columns = tableSchema ? tableSchema.columns : [];
    const baseAlias = selectedTableAlias || selectedTable;

    // --- NEW: Helper function to get all columns from all joined tables with ALIASES ---
    const getAllAvailableColumns = () => {
        if (!tableSchema) return [];
        let allCols = [];
        // Add base table columns
        allCols.push(...tableSchema.columns.map(c => ({ 
            ...c, table: tableSchema.name, alias: baseAlias, prefixedName: `${baseAlias}.${c.name}`, key: `${baseAlias}.${c.name}` 
        })));
        // Add joined table columns
        config.joins.forEach(join => {
            const joinedTableSchema = schema.tables.find(t => t.name === join.targetTable);
            const joinAlias = join.alias || join.targetTable;
            if (joinedTableSchema) {
                allCols.push(...joinedTableSchema.columns.map(c => ({ 
                    ...c, table: joinedTableSchema.name, alias: joinAlias, prefixedName: `${joinAlias}.${c.name}`, key: `${joinAlias}.${c.name}` 
                })));
            }
        });
        return allCols;
    };
    const allColumns = getAllAvailableColumns();

    // --- NEW: Helper to get only the selected + aggregated columns with ALIASES ---
    const getAggregatedColumns = () => {
        return config.selectedColumns
            .filter(c => c.aggregation !== 'NONE')
            .map(c => ({...c, key: `${c.table}.${c.name}.${c.aggregation}`, prefixedName: `${c.aggregation}(${c.table}.${c.name})` }));
    };
    const aggregatedColumns = getAggregatedColumns();
    
    const handleConfig = (key, value) => {
        onConfigChange({ ...config, [key]: value });
    };

    const addFilter = () => handleConfig('filters', [...config.filters, { id: Date.now(), tableAlias: '', column: '', operator: '=', value: '' }]);
    const updateFilter = (updatedFilter) => handleConfig('filters', config.filters.map(f => f.id === updatedFilter.id ? updatedFilter : f));
    const removeFilter = (id) => handleConfig('filters', config.filters.filter(f => f.id !== id));

    const renderSelectBuilder = () => (
        <BuilderSection title={`Querying Table: ${config.selectedTable || '...'}`}>
            {!config.selectedTable ? <p className="text-slate-500">Please select a base table.</p> :
            <div className="space-y-6">
                
                {/* NEW: Base Table Alias */}
                <div>
                    <FormInput label="Base Table Alias (e.g., A)">
                        <input type="text" placeholder="e.g., A" value={config.selectedTableAlias} onChange={e => handleConfig('selectedTableAlias', e.target.value)} className="input-field w-24" />
                    </FormInput>
                </div>
                
                {/* JOIN BUILDER - MODIFIED */}
                <div>
                    <h3 className="font-semibold text-sm text-slate-600 mb-2">JOINs (Max 1 Join)</h3>
                    <div className="space-y-2">
                        {config.joins.map(join => (
                            <JoinRow key={join.id} join={join}
                                onUpdate={(updatedJoin) => handleConfig('joins', config.joins.map(j => j.id === updatedJoin.id ? updatedJoin : j))}
                                onRemove={() => handleConfig('joins', config.joins.filter(j => j.id !== join.id))}
                                allTables={schema.tables.filter(t => t.name !== config.selectedTable)}
                                currentTableColumns={columns}
                                schema={schema}
                                baseTableAlias={baseAlias}
                            />
                        ))}
                    </div>
                    {config.joins.length === 0 && ( // Only allow adding one join
                        <button onClick={() => handleConfig('joins', [...config.joins, { id: Date.now(), type: 'INNER JOIN', targetTable: '', alias: 'B', onCol1: '', onCol2: '' }])}
                            className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:underline">
                            <Plus size={16} /> Add JOIN
                        </button>
                    )}
                </div>

                {/* WHERE BUILDER - MODIFIED */}
                <div>
                    <h3 className="font-semibold text-sm text-slate-600 mb-2">Filters (WHERE)</h3>
                    <div className="space-y-2">
                        {config.filters.map(filter => (
                            <FilterRow key={filter.id} filter={filter} 
                                onUpdate={updateFilter} 
                                onRemove={() => removeFilter(filter.id)} 
                                allColumns={allColumns} // Pass all columns with aliases
                            />
                        ))}
                    </div>
                    <button onClick={addFilter} className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:underline"><Plus size={16} /> Add filter</button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* GROUP BY - MODIFIED */}
                    <div>
                        <FormInput label="Group By">
                            <select multiple value={config.groupBy.map(g => `${g.alias}.${g.column}`)} 
                                onChange={e => {
                                    const selectedOptions = Array.from(e.target.selectedOptions);
                                    const newGroupBy = selectedOptions.map(opt => ({
                                        alias: opt.getAttribute('data-alias'),
                                        column: opt.value
                                    }));
                                    handleConfig('groupBy', newGroupBy);
                                }} 
                                className="input-field w-full h-24"
                            >
                                {allColumns.map(c => <option key={c.key} value={c.name} data-alias={c.alias}>{c.prefixedName}</option>)}
                            </select>
                        </FormInput>
                    </div>
                    
                    {/* HAVING BUILDER - MODIFIED */}
                    <div>
                        <FormInput label="Having (for aggregated groups)">
                            <div className="space-y-2">
                                {config.having.map(hav => (
                                    <HavingRow key={hav.id} having={hav}
                                        onUpdate={(updatedHav) => handleConfig('having', config.having.map(h => h.id === updatedHav.id ? updatedHav : h))}
                                        onRemove={() => handleConfig('having', config.having.filter(h => h.id !== hav.id))}
                                        aggregatedColumns={aggregatedColumns}
                                    />
                                ))}
                            </div>
                            <button onClick={() => handleConfig('having', [...config.having, { id: Date.now(), tableAlias: '', column: '', aggregation: '', operator: '>', value: '' }])}
                                className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                disabled={aggregatedColumns.length === 0}
                                title={aggregatedColumns.length === 0 ? "You must select an aggregated column (e.g., COUNT) to use HAVING" : ""}
                            >
                                <Plus size={16} /> Add HAVING clause
                            </button>
                        </FormInput>
                    </div>
                </div>
                {/* ORDER BY and LIMIT - MODIFIED */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <FormInput label="Order By">
                            <div className="flex gap-2">
                                <select value={`${config.orderBy.tableAlias}.${config.orderBy.column}`} 
                                    onChange={e => {
                                        const selectedOpt = e.target.selectedOptions[0];
                                        handleConfig('orderBy', {
                                            ...config.orderBy, 
                                            column: selectedOpt.getAttribute('data-column'), 
                                            tableAlias: selectedOpt.getAttribute('data-alias'),
                                            aggregation: selectedOpt.getAttribute('data-agg') || 'NONE'
                                        });
                                    }} 
                                    className="input-field flex-1"
                                >
                                    <option value="">None</option>
                                    <optgroup label="Columns">
                                        {allColumns.map(c => <option key={c.key} value={c.key} data-alias={c.alias} data-column={c.name}>{c.prefixedName}</option>)}
                                    </optgroup>
                                    <optgroup label="Aggregations">
                                        {aggregatedColumns.map(c => <option key={c.key} value={c.key} data-alias={c.alias} data-column={c.name} data-agg={c.aggregation}>{c.prefixedName}</option>)}
                                    </optgroup>
                                </select>
                                <button onClick={() => handleConfig('orderBy', {...config.orderBy, direction: config.orderBy.direction === 'ASC' ? 'DESC' : 'ASC'})} className="p-2 border rounded-md border-slate-300">
                                    {config.orderBy.direction === 'ASC' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                                </button>
                            </div>
                        </FormInput>
                    </div>
                    <div>
                        <FormInput label="Limit">
                            <input type="number" placeholder="e.g., 100" value={config.limit} onChange={e => handleConfig('limit', e.target.value)} className="input-field w-32" />
                        </FormInput>
                    </div>
                </div>
            </div>}
        </BuilderSection>
    );

    const renderDMLBuilder = (type) => (
         <BuilderSection title={`${type} from table: ${selectedTable || '...'}`}>
            {!selectedTable ? <p className="text-slate-500">Please select a table from the left panel first.</p> :
            <div className="space-y-4">
                 <h3 className="font-semibold text-sm text-slate-600 mb-2">{type === 'INSERT' ? 'Values to Insert' : 'Values to Update'}</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {columns.map(col => (
                        <div key={col.name}>
                            <label className="block text-sm font-medium text-slate-600 mb-1">{col.name} <span className="text-slate-400 text-xs uppercase">({col.type})</span></label>
                            <input type="text" className="input-field w-full" value={config.values[col.name] || ''} onChange={e => handleConfig('values', {...config.values, [col.name]: e.target.value})} />
                        </div>
                    ))}
                </div>
                {(type === 'UPDATE' || type === 'DELETE') && (
                 <div>
                    <h3 className="font-semibold my-2 text-sm text-slate-600">Filters (WHERE Clause)</h3>
                     <p className="text-xs text-amber-600 mb-2">Warning: Without a WHERE clause, this operation will affect all rows in the table.</p>
                    <div className="space-y-2">
                        {/* We use a simple filter row for DML, as joins are not typical here */}
                        {config.filters.map(filter => (
                            <FilterRow 
                                key={filter.id} 
                                filter={filter} 
                                onUpdate={updateFilter} 
                                onRemove={() => removeFilter(filter.id)} 
                                allColumns={columns.map(c => ({...c, table: selectedTable, alias: selectedTable, prefixedName: c.name, key: c.name}))} // Pass base columns
                            />
                        ))}
                    </div>
                    <button onClick={addFilter} className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:underline"><Plus size={16} /> Add filter</button>
                </div>
            )}
            </div>}
         </BuilderSection>
    );

    const renderCreateTableBuilder = () => (
        <BuilderSection title="Create New Table">
            <FormInput label="Table Name"><input type="text" placeholder="e.g., employees" value={config.newTableName} onChange={e => handleConfig('newTableName', e.target.value)} className="input-field w-full" /></FormInput>
            <div>
                <h4 className="text-sm font-medium text-slate-600 mb-2">Columns</h4>
                <div className="space-y-2">
                    {config.newColumns.map((col, index) => (
                        <div key={col.id} className="grid grid-cols-12 gap-2 items-center p-2 bg-slate-50 rounded-md">
                            <input type="text" placeholder="Column Name" value={col.name} onChange={e => { const newCols = [...config.newColumns]; newCols[index].name = e.target.value; handleConfig('newColumns', newCols); }} className="input-field col-span-4" />
                             <select value={col.type} onChange={e => { const newCols = [...config.newColumns]; newCols[index].type = e.target.value; handleConfig('newColumns', newCols); }} className="input-field col-span-3">
                                <option>TEXT</option><option>VARCHAR(255)</option><option>INT</option><option>DECIMAL</option><option>DATE</option>
                            </select>
                             <select value={col.constraint} onChange={e => { const newCols = [...config.newColumns]; newCols[index].constraint = e.target.value; handleConfig('newColumns', newCols); }} className="input-field col-span-4">
                                <option value="NONE">No Constraint</option><option value="PRIMARY KEY">PRIMARY KEY</option><option value="NOT NULL">NOT NULL</option>
                            </select>
                            <button onClick={() => { const newCols = config.newColumns.filter(c => c.id !== col.id); handleConfig('newColumns', newCols); }} className="text-red-500 hover:text-red-700 col-span-1 justify-self-center"><Trash2 size={16} /></button>
                        </div>
                    ))}
                </div>
                <button onClick={() => handleConfig('newColumns', [...config.newColumns, { id: Date.now(), name: '', type: 'TEXT', constraint: 'NONE' }])}
                    className="mt-3 flex items-center gap-2 text-sm text-blue-600 hover:underline">
                    <Plus size={16} /> Add Column
                </button>
            </div>
        </BuilderSection>
    );

    const renderAlterTableBuilder = () => (
        <BuilderSection title={`Alter Table: ${config.selectedTable || '...'}`}>
            {!config.selectedTable ? <p className="text-slate-500">Please select a table from the left panel first.</p> :
            <>
                <FormInput label="Alter Action">
                    <select value={config.alterType} onChange={e => handleConfig('alterType', e.target.value)} className="input-field w-full">
                        <option value="RENAME_TABLE">Rename Table</option>
                        <option value="ADD_COLUMN">Add Column</option>
                        <option value="DROP_COLUMN">Drop Column</option>
                    </select>
                </FormInput>
                {config.alterType === 'RENAME_TABLE' && (
                    <FormInput label="New Table Name">
                        <input type="text" placeholder="e.g., old_orders" value={config.renameTo} onChange={e => handleConfig('renameTo', e.target.value)} className="input-field w-full" />
                    </FormInput>
                )}
                {config.alterType === 'ADD_COLUMN' && (
                    <div className="flex gap-2">
                        <FormInput label="New Column Name"><input type="text" placeholder="e.g., notes" value={config.addColumn.name} onChange={e => handleConfig('addColumn', {...config.addColumn, name: e.target.value})} className="input-field w-full" /></FormInput>
                        <FormInput label="Column Type"><select value={config.addColumn.type} onChange={e => handleConfig('addColumn', {...config.addColumn, type: e.target.value})} className="input-field w-full"><option>TEXT</option><option>VARCHAR(255)</option><option>INT</option><option>DECIMAL</option><option>DATE</option></select></FormInput>
                    </div>
                )}
                {config.alterType === 'DROP_COLUMN' && (
                    <FormInput label="Column to Drop">
                        <select value={config.dropColumn} onChange={e => handleConfig('dropColumn', e.target.value)} className="input-field w-full">
                            <option value="">Select column...</option>
                            {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                    </FormInput>
                )}
            </>}
        </BuilderSection>
    );

    const renderDropTableBuilder = () => (
        <BuilderSection title={`Drop Table: ${config.selectedTable || '...'}`}>
            {!config.selectedTable ? <p className="text-slate-500">Please select a table from the left panel first.</p> :
            <>
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    <span className="font-bold">Warning:</span> This action is irreversible and will permanently delete the table and all its data.
                </p>
                <FormInput label={`To confirm, please type the name of the table: ${config.selectedTable}`}>
                    <input type="text" value={config.newTableName} onChange={e => handleConfig('newTableName', e.target.value)} className="input-field w-full" />
                </FormInput>
            </>}
        </BuilderSection>
    );
    
    const renderTruncateTableBuilder = () => (
        <BuilderSection title={`Truncate Table: ${config.selectedTable || '...'}`}>
            {!config.selectedTable ? <p className="text-slate-500">Please select a table from the left panel first.</p> :
            <>
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    <span className="font-bold">Warning:</span> This action is irreversible. It will delete ALL data from the table (but not the table itself).
                </p>
                <FormInput label={`To confirm, please type the name of the table: ${config.selectedTable}`}>
                    <input type="text" value={config.newTableName} onChange={e => handleConfig('newTableName', e.target.value)} className="input-field w-full" />
                </FormInput>
            </>}
         </BuilderSection>
    );

    const renderSimpleBuilder = (action) => (
        <BuilderSection title={action}>
            <p className="text-slate-500">
                Do not use the UI for TCL statement. Use the SQL Editor for transaction control commands. For transactions, it's best to write all the queries together. E.g. START TRANSACTION; UPDATE ...; INSERT ...; COMMIT; 'OR' START TRANSACTION; UPDATE ...; INSERT ...; COMMIT;
            </p>
        </BuilderSection>
    );

    const renderUnsupportedBuilder = (action) => (
        <BuilderSection title={`${action}`}>
            <p className="text-slate-500">
                Visual builder for <span className="font-semibold">{action}</span> is not supported in this environment.
                <br /><br />
                DCL commands like GRANT and REVOKE are used by server-based databases to manage user permissions, which is an administrative task.
            </p>
        </BuilderSection>
    );

    const renderAction = () => {
        switch (config.action) {
            case 'SELECT': return renderSelectBuilder();
            case 'INSERT': case 'UPDATE': case 'DELETE': return renderDMLBuilder(config.action);
            case 'CREATE TABLE': return renderCreateTableBuilder();
            case 'ALTER TABLE': return renderAlterTableBuilder();
            case 'DROP TABLE': return renderDropTableBuilder();
            case 'TRUNCATE TABLE': return renderTruncateTableBuilder();
            case 'COMMIT': case 'ROLLBACK': return renderSimpleBuilder(config.action);
            case 'GRANT': case 'REVOKE': return renderUnsupportedBuilder(config.action);
            default: return <p className="text-center text-slate-500">Select an action to begin building your query.</p>;
        }
    };

    return (
        <div className="visual-builder">
            <style>{`.input-field { @apply block w-full sm:text-sm rounded-md bg-white border border-slate-300 p-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm; }`}</style>
            {renderAction()}
        </div>
    );
};

export default VisualBuilder;