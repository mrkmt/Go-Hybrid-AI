import { useState, useEffect } from 'react';
import { Play, Clipboard, Activity, AlertCircle, ChevronRight, Search, Clock, Monitor, BarChart3, Wrench, FileText, Settings } from 'lucide-react';
import './App.css';

interface Recording {
    id: string;
    session_id: string;
    app_version: string;
    environment: any;
    created_at: string;
}

interface Report {
    id: string;
    title: string;
    description: string;
    generatedAt: string;
    reportType: string;
    data: any;
}

interface Tab {
    id: string;
    label: string;
    icon: JSX.Element;
    component: JSX.Element;
}

function App() {
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [apiKey, setApiKey] = useState(localStorage.getItem('apiKey') || '');
    const [error, setError] = useState<string>('');
    const [activeTab, setActiveTab] = useState('dashboard');
    const [testRequirements, setTestRequirements] = useState('');
    const [generatedTest, setGeneratedTest] = useState('');
    const [generatingTest, setGeneratingTest] = useState(false);

    const apiFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
        const headers = new Headers(init.headers);
        if (apiKey) headers.set('x-api-key', apiKey);
        return fetch(input, { ...init, headers });
    };

    useEffect(() => {
        setLoading(true);
        setError('');
        apiFetch('/api/recordings')
            .then(res => res.json())
            .then(data => {
                setRecordings(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError('Failed to load recordings.');
                setLoading(false);
            });
            
        // Load reports
        apiFetch('/api/reports')
            .then(res => res.json())
            .then(data => {
                setReports(data.reports || []);
            })
            .catch(err => {
                console.error('Failed to load reports:', err);
            });
    }, [apiKey]);

    useEffect(() => {
        localStorage.setItem('apiKey', apiKey);
    }, [apiKey]);

    const handleGenerateTest = () => {
        if (!testRequirements.trim()) return;
        
        setGeneratingTest(true);
        apiFetch('/api/generate-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requirements: testRequirements })
        })
        .then(res => res.json())
        .then(data => {
            setGeneratedTest(data.testCode || 'Test generation failed');
        })
        .catch(err => {
            console.error('Test generation failed:', err);
            setGeneratedTest('Error generating test: ' + err.message);
        })
        .finally(() => {
            setGeneratingTest(false);
        });
    };

    const tabs: Tab[] = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: <Activity size={18} />,
            component: (
                <>
                    <section className="sidebar">
                        <h2>Recent Sessions</h2>
                        {loading && <div className="loading">Loading...</div>}
                        {error && <div className="loading error-message">{error}</div>}
                        {recordings.map(rec => (
                            <div
                                key={rec.id}
                                className={`session-card ${selectedId === rec.id ? 'active' : ''}`}
                                onClick={() => {
                                    setSelectedId(rec.id);
                                    setActiveTab('dashboard');
                                }}
                            >
                                <div className="card-header">
                                    <Clock size={16} />
                                    <span>{new Date(rec.created_at).toLocaleString()}</span>
                                </div>
                                <div className="card-body">
                                    <strong>ID: {rec.session_id || rec.id.substring(0, 8)}</strong>
                                    <p>v{rec.app_version}</p>
                                </div>
                                <ChevronRight size={20} className="chevron" />
                            </div>
                        ))}
                    </section>

                    <section className="content">
                        {selectedId ? (
                            <RecordingDetails id={selectedId} apiFetch={apiFetch} />
                        ) : (
                            <div className="empty-state">
                                <Clipboard size={64} />
                                <h3>Select a session to view details</h3>
                                <p>Search for specific business rule failures or triage reports.</p>
                            </div>
                        )}
                    </section>
                </>
            )
        },
        {
            id: 'testgen',
            label: 'Test Generator',
            icon: <Wrench size={18} />,
            component: (
                <div className="test-generator">
                    <h2>AI Test Generator</h2>
                    <p>Describe the test scenario you want to generate, and our AI will create a Playwright test for you.</p>
                    
                    <div className="test-input-area">
                        <textarea
                            value={testRequirements}
                            onChange={(e) => setTestRequirements(e.target.value)}
                            placeholder="Enter test requirements, e.g., 'Test login with valid credentials and verify dashboard access'"
                            rows={6}
                            className="test-textarea"
                        />
                        
                        <button 
                            onClick={handleGenerateTest} 
                            disabled={generatingTest || !testRequirements.trim()}
                            className="generate-btn"
                        >
                            {generatingTest ? 'Generating...' : 'Generate Test'}
                        </button>
                    </div>
                    
                    {generatedTest && (
                        <div className="generated-test">
                            <h3>Generated Test</h3>
                            <pre className="test-output">{generatedTest}</pre>
                        </div>
                    )}
                </div>
            )
        },
        {
            id: 'reports',
            label: 'Reports',
            icon: <BarChart3 size={18} />,
            component: (
                <div className="reports-view">
                    <h2>Test Reports</h2>
                    <div className="reports-list">
                        {reports.length > 0 ? (
                            reports.map(report => (
                                <div key={report.id} className="report-card">
                                    <h3>{report.title}</h3>
                                    <p>{report.description}</p>
                                    <small>Generated: {new Date(report.generatedAt).toLocaleString()}</small>
                                </div>
                            ))
                        ) : (
                            <p>No reports available yet.</p>
                        )}
                    </div>
                </div>
            )
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: <Settings size={18} />,
            component: (
                <div className="settings-view">
                    <h2>Configuration</h2>
                    <div className="api-key-section">
                        <label>API Key:</label>
                        <input
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="(optional)"
                            type="password"
                            className="api-key-input"
                        />
                        <p className="help-text">Set your API key to enable AI features</p>
                    </div>
                </div>
            )
        }
    ];

    return (
        <div className="app-container">
            <header>
                <div className="logo">
                    <Activity size={32} color="#6366f1" />
                    <span>AI-Aero Testing Platform</span>
                </div>
                
                <nav className="tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>
                
                <div className="user-control api-key-controls">
                    <label className="api-key-label">API Key:</label>
                    <input
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="(optional)"
                        type="password"
                        className="api-key-input-field"
                    />
                </div>
            </header>

            <main className="main-content">
                {tabs.find(tab => tab.id === activeTab)?.component}
            </main>
        </div>
    );
}

function RecordingDetails({ id, apiFetch }: { id: string; apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> }) {
    const [data, setData] = useState<any>(null);
    const [aiSuggestion, setAiSuggestion] = useState<string>('');
    const [loadingAi, setLoadingAi] = useState(false);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        setData(null);
        setAiSuggestion('');
        setError('');

        apiFetch(`/api/recordings/${id}`)
            .then(res => {
                if (!res.ok) throw new Error(`Failed to load recording (${res.status})`);
                return res.json();
            })
            .then(d => {
                setData(d);
                setLoadingAi(true);
                return apiFetch(`/api/triage/${id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ error: "Discrepancy in leave consumption" })
                });
            })
            .then(res => res.json())
            .then(res => {
                setAiSuggestion(res.suggestion);
                setLoadingAi(false);
            })
            .catch(err => {
                console.error(err);
                setError('Failed to load details or AI triage.');
                setLoadingAi(false);
            });
    }, [id]);

    if (error) return <div className="loading error-message">{error}</div>;
    if (!data) return <div className="loading">Loading details...</div>;

    return (
        <div className="details-view">
            <div className="details-header">
                <h1>Session: {data.session_id || data.id}</h1>
                <div className="badge fail">Failed Validation</div>
            </div>

            <div className="ai-triage-section">
                <div className="section-header">
                    <Activity size={20} color="#6366f1" />
                    <h2>Local AI Triage (Qwen)</h2>
                </div>
                <div className="ai-suggestion-card">
                    {loadingAi ? (
                        <div className="pulse">Consulting local knowledge...</div>
                    ) : (
                        <p>{aiSuggestion || "No AI suggestion available."}</p>
                    )}
                </div>
            </div>

            <div className="metrics-grid">
                <div className="metric-box">
                    <Monitor size={24} />
                    <div>
                        <label>Environment</label>
                        <span>{data.environment?.browser || 'Chrome'} (Mac OS)</span>
                    </div>
                </div>
                <div className="metric-box">
                    <AlertCircle size={24} color="#ef4444" />
                    <div>
                        <label>Business Discrepancy</label>
                        <span className="text-fail">Expected 2d, Found 4d</span>
                    </div>
                </div>
            </div>

            <div className="steps-timeline">
                <h2>Recording Steps</h2>
                {data.steps?.map((step: any, i: number) => (
                    <div key={i} className="step-item">
                        <div className="step-num">{i + 1}</div>
                        <div className="step-content">
                            <strong>{step.type.toUpperCase()}</strong>: <code>{step.selector}</code>
                            {step.value && <p>Value: "{step.value}"</p>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default App;
