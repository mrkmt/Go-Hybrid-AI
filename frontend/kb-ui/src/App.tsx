import React, { useState, useEffect } from 'react';
import './App.css';

interface Recording {
  id: string;
  session_id: string;
  created_at: string;
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
  const [loading, setLoading] = useState(false);

  // Admin standard ID (hardcoded for prototype, normally selectable)
  const ADMIN_STANDARD_ID = recordings.find(r => r.session_id.includes('admin'))?.id || recordings[0]?.id;

  useEffect(() => {
    fetch('http://localhost:3000/api/recordings')
      .then(res => res.json())
      .then(data => setRecordings(data.data));
  }, []);

  const runAudit = async (caseId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/audit/${caseId}?standardId=${ADMIN_STANDARD_ID}`);
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
          <h3>CASES FOR AUDIT</h3>
          <div className="case-list">
            {recordings.map(r => (
              <div 
                key={r.id} 
                className={`case-item ${selectedCase === r.id ? 'active' : ''}`}
                onClick={() => runAudit(r.id)}
              >
                <div className="case-id">ID: {r.id.slice(0, 8)}...</div>
                <div className="case-date">{new Date(r.created_at).toLocaleString()}</div>
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
                <h2>VERDICT: {auditReport.verdict}</h2>
                <p className="explanation">{auditReport.cloudVerdict || auditReport.explanation}</p>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="comparison-grid">
                <div className="frame">
                  <div className="frame-label">ADMIN GROUND TRUTH (STANDARD)</div>
                  <div className="media-container">
                    {auditReport.assets.standard.screenshot ? (
                      <img src={auditReport.assets.standard.screenshot} alt="Standard" />
                    ) : (
                      <div className="placeholder">NO IMAGE EVIDENCE</div>
                    )}
                  </div>
                </div>

                <div className="frame failure">
                  <div className="frame-label">CURRENT EXECUTION (FAILURE)</div>
                  <div className="media-container">
                    {auditReport.assets.execution.screenshot ? (
                      <img src={auditReport.assets.execution.screenshot} alt="Failure" />
                    ) : (
                      <div className="placeholder">NO IMAGE EVIDENCE</div>
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
