import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';

const SavedQueries = ({ onClose, onLoad }) => {
    const [queries, setQueries] = useState([]);

    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('savedQueries') || '[]');
        setQueries(saved);
    }, []);

    const handleLoad = (config) => {
        onLoad(config);
        onClose();
    };

    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this saved query?")) {
            const newQueries = queries.filter(q => q.id !== id);
            setQueries(newQueries);
            localStorage.setItem('savedQueries', JSON.stringify(newQueries));
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b dark:border-slate-700">
                    <h2 className="text-lg font-semibold">Saved Queries</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
                        title="Close"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto">
                    {queries.length === 0 ? (
                        <p className="text-slate-500">No queries saved yet.</p>
                    ) : (
                        <ul className="space-y-2">
                            {queries.map(query => (
                                <li key={query.id} className="p-2 border rounded-md dark:border-slate-600 flex justify-between items-center">
                                    <span className="font-medium text-slate-900 dark:text-slate-100"> {/* <--- CHANGED THIS LINE */}
                                        {query.name}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleLoad(query.config)} className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
                                            Load
                                        </button>
                                        <button onClick={() => handleDelete(query.id)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full" title="Delete query">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SavedQueries;