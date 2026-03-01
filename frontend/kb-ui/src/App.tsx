import React, { useState, useEffect } from 'react';
import './App.css';

interface Recording {
  id: string;
  session_id: string;
  created_at: string;
  is_admin: boolean;
  app_version: string; // Used as module name
  verdict?: string;
}

interface AuditReport {
  verdict: 'GUILTY' | 'CLEAR' | 'STUCK';
  explanation: string;
  cloudVerdict?: string;
  assets: {
    execution: { screenshot: string; video: string; manual: string };
    standard: { screenshot: string; video: string };
  };
  policyReference?: string;
}

function App() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [liveSteps, setLiveSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Connect to WebSocket for live streaming
    const socket = new WebSocket('ws://localhost:3000');
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'LIVE_STEP') {
        setLiveSteps(prev => [data.step, ...prev].slice(0, 10)); // Keep last 10 steps
      }
    };
    return () => socket.close();
  }, []);

  const fetchRecordings = () => {
    fetch('http://localhost:3000/api/recordings')
      .then(res => res.json())
      .then(data => setRecordings(data.data));
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  const markAsStandard = async (id: string) => {
    if (!confirm('Mark this case as the official Admin Ground Truth for this module?')) return;
    await fetch(`http://localhost:3000/api/recordings/${id}/make-standard`, { method: 'PUT' });
    alert('Case elevated to Admin Standard');
    fetchRecordings();
  };

  const runAudit = async (caseId: string) => {
    setLoading(true);
    try {
      const selected = recordings.find(r => r.id === caseId);
      const standard = recordings.find(r => r.is_admin && r.app_version === selected?.app_version);
      
      const standardId = standard?.id || caseId; // Fallback to self if no standard found

      const res = await fetch(`http://localhost:3000/api/audit/${caseId}?standardId=${standardId}`);
      const data = await res.json();
      setAuditReport(data);
      setSelectedCase(caseId);
    } catch (err) {
      console.error('Audit failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard dark-theme">
      {/* Header */}
      <header className="header">
        <div className="logo">GO-HYBRID AI <span className="tag">FORENSIC UNIT</span></div>
        <div className="status-bar">
          <span className="status-item">SYSTEM: ONLINE</span>
          <span className="status-item">OLLAMA: READY</span>
          <span className="status-item">GEMINI: CONNECTED</span>
        </div>
      </header>

      <div className="main-layout">
        {/* Sidebar: Investigation List */}
        <aside className="sidebar">
          {/* Live Feed */}
          <div className="live-feed">
            <h3 className="live-pulse">LIVE INVESTIGATION STREAM</h3>
            <div className="live-steps">
              {liveSteps.length === 0 && <div className="no-live">WAITING FOR DATA...</div>}
              {liveSteps.map((step, i) => (
                <div key={i} className="live-step-item">
                  <span className="live-action">{step.action.toUpperCase()}</span>
                  <span className="live-element">{step.elementName || step.selector.slice(0, 15)}...</span>
                </div>
              ))}
            </div>
          </div>

          <hr className="divider" />

          <h3>CASES FOR AUDIT</h3>
          <div className="case-list">
            {recordings.map(r => (
              <div 
                key={r.id} 
                className={`case-item ${selectedCase === r.id ? 'active' : ''} ${r.is_admin ? 'standard-item' : ''}`}
                onClick={() => runAudit(r.id)}
              >
                <div className="case-header">
                  <div className="case-id">ID: {r.id.slice(0, 8)}...</div>
                  {r.is_admin && <span className="admin-badge">ADMIN</span>}
                </div>
                <div className="case-date">{new Date(r.created_at).toLocaleString()}</div>
                <div className="case-module">Module: {r.app_version}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content: Forensic View */}
        <main className="forensic-view">
          {loading ? (
            <div className="loading-spinner">ANALYZING EVIDENCE...</div>
          ) : auditReport ? (
            <>
              {/* Top Panel: Verdict */}
              <div className={`verdict-panel ${auditReport.verdict}`}>
                <div className="verdict-header">
                  <h2>VERDICT: {auditReport.verdict}</h2>
                  <button className="btn-standard" onClick={() => markAsStandard(selectedCase!)}>
                    MARK AS ADMIN STANDARD
                  </button>
                </div>
                <p className="explanation">{auditReport.cloudVerdict || auditReport.explanation}</p>
              </div>

              {/* 3-Way Comparison Grid */}
              <div className="comparison-grid three-way">
                <div className="frame">
                  <div className="frame-label">1. ADMIN GROUND TRUTH</div>
                  <div className="media-container">
                    {auditReport.assets.standard.screenshot ? (
                      <img src={auditReport.assets.standard.screenshot} alt="Standard" />
                    ) : (
                      <div className="placeholder">NO GOLDEN IMAGE</div>
                    )}
                  </div>
                </div>

                <div className="frame manual">
                  <div className="frame-label">2. MANUAL RECORDING (USER)</div>
                  <div className="media-container">
                    {auditReport.assets.execution.manual ? (
                      <img src={auditReport.assets.execution.manual} alt="Manual" />
                    ) : (
                      <div className="placeholder">NO MANUAL SNAPSHOT</div>
                    )}
                  </div>
                </div>

                <div className="frame failure">
                  <div className="frame-label">3. AUTOMATED REPLAY (SYSTEM)</div>
                  <div className="media-container">
                    {auditReport.assets.execution.screenshot ? (
                      <img src={auditReport.assets.execution.screenshot} alt="Failure" />
                    ) : (
                      <div className="placeholder">NO REPLAY EVIDENCE</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Panels */}
              <div className="details-grid">
                <div className="panel policy-panel">
                  <h3>LOGIC MAPPING</h3>
                  <div className="policy-box">
                    <strong>VIOLATED POLICY:</strong> {auditReport.policyReference || "General HR Policy"}
                    <p>Calculation must comply with "Exclude Holidays" rule as defined in master documentation.</p>
                  </div>
                </div>
                <div className="panel timeline-panel">
                  <h3>TIMELINE AUDIT</h3>
                  <div className="timeline">
                    <div className="event">09:00:01 - POST /api/recordings [201]</div>
                    <div className="event error">09:00:15 - GET /api/leave/calculate [500]</div>
                    <div className="event">09:00:16 - Integrity Check Triggered</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">SELECT A CASE TO COMMENCE FORENSIC AUDIT</div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
