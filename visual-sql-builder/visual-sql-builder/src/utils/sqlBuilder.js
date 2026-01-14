const quote = (alias, name) => `\`${alias}\`.\`${name}\``;

const quoteTable = (table) => `\`${table}\``;

const quoteName = (name) => `\`${name}\``;


export const buildSqlFromConfig = (config, dbType = 'mysql') => {
    const {
        queryType, action, selectedTable, selectedTableAlias, selectedColumns, joins, filters,
        groupBy, having, orderBy, limit, values, newTableName, newColumns,
        alterType, renameTo, addColumn, dropColumn
    } = config;

    const baseAlias = selectedTableAlias || selectedTable;

    switch (`${queryType}:${action}`) {
        case 'DQL:SELECT': {
            if (!selectedTable) return '-- Select a table to begin';
            
            // Build column list with aggregations
            let columns = '*';
            if (selectedColumns.length > 0) {
                columns = selectedColumns.map(c => {
                    // c.table is already the alias, set in App.jsx
                    const colName = quote(c.table, c.name);
                    // Add an alias to aggregated columns (e.g., COUNT(A.id) AS COUNT_id)
                    return c.aggregation !== 'NONE' 
                        ? `${c.aggregation}(${colName}) AS ${quoteName(c.aggregation + '_' + c.name)}`
                        : colName;
                }).join(', ');
            }
            
            let sql = `SELECT ${columns}\nFROM ${quoteTable(selectedTable)} AS ${quoteName(baseAlias)}`;

            // NEW: Add JOINs with Aliases
            if (joins.length > 0) {
                const joinClauses = joins.map(j => {
                    const joinAlias = j.alias || j.targetTable;
                    return `\n${j.type} ${quoteTable(j.targetTable)} AS ${quoteName(joinAlias)} ON ${quote(baseAlias, j.onCol1)} = ${quote(joinAlias, j.onCol2)}`;
                }).join('');
                sql += joinClauses;
            }

            if (filters.length > 0) {
                const whereClauses = filters
                    .filter(f => f.tableAlias && f.column && f.operator && f.value)
                    .map(f => `${quote(f.tableAlias, f.column)} ${f.operator} '${f.value}'`)
                    .join(' AND ');
                if (whereClauses) sql += `\nWHERE ${whereClauses}`;
            }

            if (groupBy.length > 0) {
                sql += `\nGROUP BY ${groupBy.map(g => quote(g.alias, g.column)).join(', ')}`;
            }

            // NEW: Add HAVING
            if (having.length > 0) {
                const havingClauses = having
                    .filter(h => h.tableAlias && h.column && h.aggregation && h.operator && h.value)
                    .map(h => {
                        // Use the alias for the HAVING clause
                        const colName = quoteName(`${h.aggregation}_${h.column}`);
                        return `${colName} ${h.operator} '${h.value}'`;
                    }).join(' AND ');
                if (havingClauses) sql += `\nHAVING ${havingClauses}`;
            }

            if (orderBy.column) {
                // Use the alias for ordering if it's an aggregation
                const colName = orderBy.aggregation !== 'NONE'
                              ? quoteName(`${orderBy.aggregation}_${orderBy.column}`)
                              : quote(orderBy.tableAlias, orderBy.column);
                sql += `\nORDER BY ${colName} ${orderBy.direction}`;
            }

            if (limit) {
                sql += `\nLIMIT ${limit}`;
            }
            return sql + ';';
        }
        
        case 'DML:INSERT': {
            if (!selectedTable) return '-- Select a table to insert into';
            const cols = Object.keys(values).filter(k => values[k]);
            if (cols.length === 0) return `-- Fill in values...`;
            const valStrings = cols.map(c => `'${values[c]}'`).join(', ');
            return `INSERT INTO ${quoteTable(selectedTable)} (${cols.map(c => quoteName(c)).join(', ')})\nVALUES (${valStrings});`;
        }

        case 'DML:UPDATE': {
            if (!selectedTable) return '-- Select a table to update';
            const setClauses = Object.keys(values).filter(k => values[k]).map(k => `${quoteName(k)} = '${values[k]}'`).join(', ');
            if (!setClauses) return `-- Specify values to update...`;
            let sql = `UPDATE ${quoteTable(selectedTable)}\nSET ${setClauses}`;
             if (filters.length > 0) {
                // Note: DML operations typically don't use prefixed table names in WHERE
                const whereClauses = filters.filter(f => f.column && f.operator && f.value).map(f => `${quoteName(f.column)} ${f.operator} '${f.value}'`).join(' AND ');
                if (whereClauses) sql += `\nWHERE ${whereClauses}`;
            } else {
                sql += `\n-- WARNING: Add a WHERE clause to avoid updating all rows!`;
            }
            return sql + ';';
        }

        case 'DML:DELETE': {
            if (!selectedTable) return '-- Select a table to delete from';
            let sql = `DELETE FROM ${quoteTable(selectedTable)}`;
             if (filters.length > 0) {
                // Note: DML operations typically don't use prefixed table names in WHERE
                const whereClauses = filters.filter(f => f.column && f.operator && f.value).map(f => `${quoteName(f.column)} ${f.operator} '${f.value}'`).join(' AND ');
                if (whereClauses) sql += `\nWHERE ${whereClauses}`;
            } else {
                sql += `\n-- WARNING: Add a WHERE clause to avoid deleting all rows!`;
            }
            return sql + ';';
        }
        
        case 'DDL:CREATE TABLE': {
            if (!newTableName.trim()) return '-- Enter a table name';
            const validColumns = newColumns.filter(c => c.name.trim() && c.type.trim());
            if (validColumns.length === 0) return `-- Add at least one column...`;
            const columnDefs = validColumns.map(c => {
                let def = `${quoteName(c.name)} ${c.type}`;
                if (c.constraint === 'PRIMARY KEY') def += ' PRIMARY KEY';
                if (c.constraint === 'NOT NULL') def += ' NOT NULL';
                return def;
            }).join(',\n  ');
            return `CREATE TABLE ${quoteName(newTableName)} (\n  ${columnDefs}\n);`;
        }

        case 'DDL:ALTER TABLE': {
            if (!selectedTable) return '-- Select a table to alter';
            if (alterType === 'RENAME_TABLE') {
                if (!renameTo.trim()) return `-- Enter the new name...`;
                return `ALTER TABLE ${quoteTable(selectedTable)}\nRENAME TO ${quoteName(renameTo)};`;
            }
            if (alterType === 'ADD_COLUMN') {
                if (!addColumn.name.trim()) return `-- Enter a name for the new column`;
                return `ALTER TABLE ${quoteTable(selectedTable)}\nADD COLUMN ${quoteName(addColumn.name)} ${addColumn.type};`;
            }
            if (alterType === 'DROP_COLUMN') {
                if (!dropColumn) return `-- Select a column to drop`;
                return `ALTER TABLE ${quoteTable(selectedTable)}\nDROP COLUMN ${quoteName(dropColumn)};`;
            }
            return '-- Select an alter action';
        }

        case 'DDL:DROP TABLE': {
            if (!newTableName.trim()) return '-- Select a table and confirm its name...';
            if (selectedTable !== newTableName) return `-- Confirmation failed...`;
            return `DROP TABLE ${quoteTable(selectedTable)};`;
        }

        case 'DDL:TRUNCATE TABLE': {
            if (!newTableName.trim()) return '-- Select a table and confirm its name';
            if (selectedTable !== newTableName) return `-- Confirmation failed...`;
            return `TRUNCATE TABLE ${quoteTable(selectedTable)};`;
        }
        // For transaction
        case 'TCL:START TRANSACTION':
            return 'START TRANSACTION;';
        // For transaction
        case 'TCL:COMMIT':
            return 'COMMIT;';
        case 'TCL:ROLLBACK':
            return 'ROLLBACK;';
        case 'DCL:GRANT':
        case 'DCL:REVOKE':
            return `-- DCL commands are not typically run from an application. This is an administrative task.`;
        
        default:
            return '-- Visual builder not implemented for this action yet.';
    }
};

/**
 * NEW: Smarter Parser
 */
export const parseSqlToConfig = (sql, schema, dbType = 'mysql') => {
    try {
        // Use case-insensitive matching (/i) and handle optional backticks (`?`)
        const fromMatch = sql.match(/FROM\s+`?(\w+)`?(?:\s+AS\s+`?(\w+)`?)?/i);
        if (!fromMatch) throw new Error("Parser Error: No FROM clause found.");
        
        const selectedTable = fromMatch[1];
        const selectedTableAlias = fromMatch[2] || fromMatch[1]; // Use alias if exists, else table name
        
        const tableSchema = schema.tables.find(t => t.name.toLowerCase() === selectedTable.toLowerCase());
        
        if (!tableSchema) {
            console.log(`Parser: Table '${selectedTable}' not found in schema.`);
            return null; 
        }

        const config = {
            queryType: 'DQL', action: 'SELECT', selectedTable: tableSchema.name,
            selectedTableAlias: selectedTableAlias,
            selectedColumns: [], filters: [], joins: [], groupBy: [], having: [],
            orderBy: { tableAlias: '', column: '', aggregation: 'NONE', direction: 'ASC' }, limit: ''
        };

        const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM/i);
        if (selectMatch) {
            const colsString = selectMatch[1].trim();
            
            if (colsString === '*') {
                config.selectedColumns = tableSchema.columns.map(c => ({ table: selectedTableAlias, name: c.name, aggregation: 'NONE' }));
            } else {
                const cols = colsString.split(',').map(c => c.trim().replace(/`/g, ''));
                config.selectedColumns = cols.map(c => {
                    const parts = c.split('.');
                    if (parts.length === 2) {
                        return { table: parts[0], name: parts[1], aggregation: 'NONE' };
                    } else {
                        // Guess base table
                        return { table: selectedTableAlias, name: c, aggregation: 'NONE' };
                    }
                });
            }
        }

        const whereMatch = sql.match(/WHERE\s+(.*?)(GROUP BY|ORDER BY|LIMIT|$)/i);
        if (whereMatch) {
            const conditions = whereMatch[1].split(/AND/i);
            config.filters = conditions.map((cond, index) => {
                // Regex updated to handle optional table prefix
                const parts = cond.trim().match(/(?:`?(\w+)`?\.?)?`?(\w+)`?\s*([<>=!LIKEIN\s]+)\s*'(.*?)'/);
                if (!parts) return null;
                
                // parts[0] = full match, parts[1] = table (optional), parts[2] = column, parts[3] = operator, parts[4] = value
                const hasTable = parts.length === 5 && parts[1]; 
                const tableAlias = hasTable ? parts[1] : selectedTableAlias;
                const column = hasTable ? parts[2] : parts[1];
                const operator = parts[3].trim();
                const value = parts[4];

                return { id: Date.now() + index, tableAlias, column, operator, value };
            }).filter(Boolean);
        }
        
        console.log("Successfully parsed config:", config);
        return config;

    } catch (error) {
        console.error("SQL Parsing failed:", error.message);
        return null;
    }
};