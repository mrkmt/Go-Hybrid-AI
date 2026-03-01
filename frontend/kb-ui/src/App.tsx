import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
  aiActions?: any[];
  policyReference?: string;
}

function App() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [liveSteps, setLiveSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:3000');
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'LIVE_STEP') {
        setLiveSteps(prev => [data.step, ...prev].slice(0, 10));
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
    if (!confirm('Mark this case as the official Admin Ground Truth?')) return;
    await fetch(`http://localhost:3000/api/recordings/${id}/make-standard`, { method: 'PUT' });
    fetchRecordings();
  };

  const runAudit = async (caseId: string) => {
    setLoading(true);
    try {
      const selected = recordings.find(r => r.id === caseId);
      const standard = recordings.find(r => r.is_admin && r.app_version === selected?.app_version);
      const standardId = standard?.id || caseId;

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

  const exportToPDF = () => {
    const input = document.getElementById('forensic-report');
    if (!input) return;

    setLoading(true);
    html2canvas(input, { useCORS: true, backgroundColor: '#0f172a', scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`investigation-${selectedCase?.slice(0, 8)}.pdf`);
      setLoading(false);
    });
  };

  return (
    <div className="dashboard dark-theme">
      <header className="header">
        <div className="logo">GO-HYBRID AI <span className="tag">FORENSIC UNIT</span></div>
        <div className="status-bar">
          <span className="status-item">SYSTEM: READY</span>
          <span className="status-item">OLLAMA: AVAILABLE</span>
          {auditReport && (
            <button className="btn-export" onClick={exportToPDF}>EXPORT REPORT</button>
          )}
        </div>
      </header>

      <div className="main-layout">
        <aside className="sidebar">
          <div className="live-feed">
            <h3 className="live-pulse">LIVE STREAM</h3>
            <div className="live-steps">
              {liveSteps.length === 0 && <div className="no-live">WAITING...</div>}
              {liveSteps.map((step, i) => (
                <div key={i} className="live-step-item">
                  <span className="live-action">{step.action}</span>
                  <span className="live-element">{step.elementName || 'UI'}</span>
                </div>
              ))}
            </div>
          </div>
          <hr className="divider" />
          <h3>CASES</h3>
          <div className="case-list">
            {recordings.map(r => (
              <div key={r.id} className={`case-item ${selectedCase === r.id ? 'active' : ''} ${r.is_admin ? 'standard-item' : ''}`} onClick={() => runAudit(r.id)}>
                <div className="case-header">
                  <div className="case-id">{r.id.slice(0, 8)}</div>
                  {r.is_admin && <span className="admin-badge">ADMIN</span>}
                </div>
                <div className="case-module">{r.app_version}</div>
              </div>
            ))}
          </div>
        </aside>

        <main className="forensic-view" id="forensic-report">
          {loading ? (
            <div className="loading-spinner">PROCESSING EVIDENCE...</div>
          ) : auditReport ? (
            <>
              <div className={`verdict-panel ${auditReport.verdict}`}>
                <div className="verdict-header">
                  <h2>VERDICT: {auditReport.verdict}</h2>
                  {!recordings.find(r => r.id === selectedCase)?.is_admin && (
                    <button className="btn-standard" onClick={() => markAsStandard(selectedCase!)}>MAKE ADMIN STANDARD</button>
                  )}
                </div>
                <p className="explanation">{auditReport.cloudVerdict || auditReport.explanation}</p>
              </div>

              <div className="comparison-grid three-way">
                <div className="frame">
                  <div className="frame-label">ADMIN STANDARD</div>
                  <div className="media-container">
                    {auditReport.assets.standard.screenshot ? <img src={auditReport.assets.standard.screenshot} alt="Standard" /> : <div className="placeholder">NO IMAGE</div>}
                  </div>
                </div>
                <div className="frame manual">
                  <div className="frame-label">MANUAL (USER)</div>
                  <div className="media-container">
                    {auditReport.assets.execution.manual ? <img src={auditReport.assets.execution.manual} alt="Manual" /> : <div className="placeholder">NO IMAGE</div>}
                  </div>
                </div>
                <div className="frame failure">
                  <div className="frame-label">REPLAY (SYSTEM)</div>
                  <div className="media-container">
                    {auditReport.assets.execution.screenshot ? <img src={auditReport.assets.execution.screenshot} alt="Replay" /> : <div className="placeholder">NO IMAGE</div>}
                  </div>
                </div>
              </div>

              <div className="details-grid">
                <div className="panel action-log-panel">
                  <h3>AI ACTIONS</h3>
                  <div className="action-list">
                    {auditReport.aiActions?.map((action, i) => (
                      <div key={i} className={`action-card ${action.status}`}>
                        <div className="action-header-info">
                          <span className="action-type">{action.action_type}</span>
                          <span className={`status-pill ${action.status}`}>{action.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="panel policy-panel">
                  <h3>LOGIC MAPPING</h3>
                  <div className="policy-box">
                    <strong>POLICY:</strong> {auditReport.policyReference || "General"}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">SELECT CASE FOR AUDIT</div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
