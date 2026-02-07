import { useState, useEffect, useRef } from 'react'
import './App.css'

// Types
interface AgentStatus {
  name: string
  status: 'idle' | 'active' | 'complete'
  lastAction?: string
}

interface LogEntry {
  id: number
  timestamp: string
  agent: string
  type: 'info' | 'tool' | 'handoff' | 'result' | 'error'
  message: string
}

interface AlertData {
  type: string
  location: string
  severity: string
  population: number
}

function App() {
  const [alertInput, setAlertInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [currentReport, setCurrentReport] = useState<string | null>(null)
  const [agents, setAgents] = useState<AgentStatus[]>([
    { name: 'Watchman', status: 'idle' },
    { name: 'Vision Specialist', status: 'idle' },
    { name: 'Climate Analyst', status: 'idle' }
  ])
  const [alertData, setAlertData] = useState<AlertData | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // Simulated processing for demo
  const processAlert = async () => {
    if (!alertInput.trim()) return
    
    setIsProcessing(true)
    setLogs([])
    setCurrentReport(null)
    
    // Parse alert
    const parsedAlert = parseAlert(alertInput)
    setAlertData(parsedAlert)
    
    // Simulate agent workflow
    await simulateAgentFlow(parsedAlert)
    
    setIsProcessing(false)
  }

  const parseAlert = (text: string): AlertData => {
    const lower = text.toLowerCase()
    let type = 'unknown'
    if (lower.includes('flood')) type = 'flood'
    else if (lower.includes('earthquake')) type = 'earthquake'
    else if (lower.includes('hurricane')) type = 'hurricane'
    else if (lower.includes('wildfire') || lower.includes('fire')) type = 'wildfire'
    else if (lower.includes('tsunami')) type = 'tsunami'
    
    // Extract location (simple heuristic)
    const locationMatch = text.match(/in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i)
    const location = locationMatch ? locationMatch[1] : 'Unknown Location'
    
    // Extract population
    const popMatch = text.match(/(\d+(?:,\d+)?(?:\s*(?:million|k|thousand))?)\s*(?:people|affected|population)/i)
    let population = 100000
    if (popMatch) {
      let num = parseInt(popMatch[1].replace(/,/g, ''))
      if (popMatch[1].toLowerCase().includes('million')) num *= 1000000
      else if (popMatch[1].toLowerCase().includes('k') || popMatch[1].toLowerCase().includes('thousand')) num *= 1000
      population = num
    }
    
    return {
      type,
      location,
      severity: 'high',
      population
    }
  }

  const addLog = (agent: string, type: LogEntry['type'], message: string) => {
    const entry: LogEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString(),
      agent,
      type,
      message
    }
    setLogs(prev => [...prev, entry])
  }

  const updateAgent = (name: string, status: AgentStatus['status'], lastAction?: string) => {
    setAgents(prev => prev.map(a => 
      a.name === name ? { ...a, status, lastAction } : a
    ))
  }

  const simulateAgentFlow = async (alert: AlertData) => {
    // Watchman activation
    updateAgent('Watchman', 'active', 'Analyzing alert...')
    addLog('Watchman', 'info', `Received alert: ${alert.type} in ${alert.location}`)
    await delay(800)
    
    addLog('Watchman', 'info', `Parsed disaster type: ${alert.type.toUpperCase()}`)
    await delay(500)
    
    addLog('Watchman', 'info', `Estimated population affected: ${alert.population.toLocaleString()}`)
    await delay(500)
    
    addLog('Watchman', 'handoff', 'No imagery detected → Routing to Climate Analyst')
    updateAgent('Watchman', 'complete', 'Triage complete')
    await delay(300)
    
    // Climate Analyst
    updateAgent('Climate Analyst', 'active', 'Processing...')
    addLog('Climate Analyst', 'info', 'Starting resource calculation...')
    await delay(600)
    
    addLog('Climate Analyst', 'tool', 'Calling: calculate_supply_needs')
    await delay(1000)
    addLog('Climate Analyst', 'result', 'Supply needs calculated')
    
    addLog('Climate Analyst', 'tool', 'Calling: generate_crisis_report')
    await delay(1200)
    addLog('Climate Analyst', 'result', 'Crisis report generated')
    
    updateAgent('Climate Analyst', 'complete', 'Analysis complete')
    
    // Generate report
    setCurrentReport(generateDemoReport(alert))
  }

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const generateDemoReport = (alert: AlertData): string => {
    const waterLiters = Math.round(alert.population * 7.5 * 14 * 1.6)
    const mealPacks = Math.round(alert.population * 2100 * 14 / 500 * 1.6)
    const medKits = Math.round((alert.population / 1000) * 50 * 1.6)
    const shelters = Math.round((alert.population / 100) * 25 * 1.6)
    
    return `# 🚨 CRISIS ACTION REPORT
## Aegis-1 Disaster Response System

**Report Generated:** ${new Date().toISOString().replace('T', ' ').split('.')[0]} UTC  
**Report ID:** AEGIS-${Date.now().toString(36).toUpperCase()}

---

## 📍 SITUATION OVERVIEW

| Parameter | Value |
|-----------|-------|
| **Disaster Type** | ${alert.type.toUpperCase()} |
| **Location** | ${alert.location} |
| **Severity Level** | ${alert.severity.toUpperCase()} |
| **Population Affected** | ${alert.population.toLocaleString()} |
| **Households Affected** | ~${Math.round(alert.population / 4.5).toLocaleString()} |

---

## 💧 CRITICAL RESOURCE REQUIREMENTS

### Water Supplies
- **Total Required:** ${waterLiters.toLocaleString()} liters
- **20L Jerrycans:** ${Math.round(waterLiters / 20).toLocaleString()}
- **Water Trucks (10,000L):** ${Math.round(waterLiters / 10000) + 1}
- **Priority:** CRITICAL

### Food Supplies  
- **Meal Packs (500kcal):** ${mealPacks.toLocaleString()}
- **Family Food Kits (7-day):** ${Math.round(alert.population / 4.5 * 2).toLocaleString()}
- **Priority:** CRITICAL

### Medical Supplies
- **Basic Medical Kits:** ${medKits.toLocaleString()}
- **Trauma Kits:** ${Math.round(medKits * 0.15).toLocaleString()}
- **Priority:** HIGH

### Shelter Supplies
- **Emergency Shelters:** ${shelters.toLocaleString()}
- **Blankets:** ${(alert.population * 2).toLocaleString()}

---

## 🚚 LOGISTICS ESTIMATE

| Resource | Quantity |
|----------|----------|
| Cargo Flights | ${Math.round((waterLiters + mealPacks * 0.5) / 50000) + 1} |
| Truck Loads | ${Math.round((waterLiters + mealPacks * 0.5) / 20000) + 1} |
| **Estimated Cost** | **$${Math.round(alert.population * 14 * 15 * 1.6).toLocaleString()} USD** |

---

## ⚡ IMMEDIATE ACTIONS REQUIRED

1. **Deploy Water Supplies** - Priority distribution to areas without water access
2. **Establish Medical Stations** - Set up ${Math.max(3, Math.round(alert.population / 10000))} field hospitals
3. **Shelter Distribution** - Begin emergency shelter deployment
4. **Search & Rescue** - Coordinate with local emergency services
5. **Communications** - Establish emergency broadcast channels

---

*This report was automatically generated by the Aegis-1 Crisis Response System.*`
  }

  const getStatusColor = (status: AgentStatus['status']) => {
    switch (status) {
      case 'active': return 'var(--color-accent)'
      case 'complete': return 'var(--color-success)'
      default: return 'var(--color-text-muted)'
    }
  }

  const getLogTypeIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'tool': return '🔧'
      case 'handoff': return '➤'
      case 'result': return '✓'
      case 'error': return '❌'
      default: return '○'
    }
  }

  return (
    <div className="app">
      <div className="backdrop"></div>
      
      <header className="header">
        <div className="logo">
          <span className="logo-icon">🛡️</span>
          <span className="logo-text">Aegis-1</span>
          <span className="logo-subtitle">Crisis Response System</span>
        </div>
        <div className="status-indicator">
          <span className={`status-dot ${isProcessing ? 'active' : ''}`}></span>
          <span>{isProcessing ? 'Processing' : 'Ready'}</span>
        </div>
      </header>

      <main className="main">
        {/* Input Section */}
        <section className="input-section">
          <h2 className="section-title">
            <span className="section-icon">📡</span>
            Alert Input
          </h2>
          <div className="input-container">
            <textarea
              className="alert-input"
              placeholder="Enter disaster alert... (e.g., 'Satellite alert: Flood detected in Jakarta, 500,000 people affected')"
              value={alertInput}
              onChange={(e) => setAlertInput(e.target.value)}
              disabled={isProcessing}
            />
            <button 
              className={`process-btn ${isProcessing ? 'processing' : ''}`}
              onClick={processAlert}
              disabled={isProcessing || !alertInput.trim()}
            >
              {isProcessing ? (
                <>
                  <span className="spinner"></span>
                  Processing...
                </>
              ) : (
                <>
                  <span>⚡</span>
                  Analyze Alert
                </>
              )}
            </button>
          </div>
          
          {/* Quick Actions */}
          <div className="quick-actions">
            <span className="quick-label">Quick demos:</span>
            <button onClick={() => setAlertInput('Satellite alert: Flood detected in Jakarta, 500,000 people affected')}>
              🌊 Flood
            </button>
            <button onClick={() => setAlertInput('Emergency: Earthquake magnitude 7.2 struck Tokyo, 1.2 million affected')}>
              🏚️ Earthquake
            </button>
            <button onClick={() => setAlertInput('Alert: Wildfire spreading in California, 50,000 residents evacuating')}>
              🔥 Wildfire
            </button>
          </div>
        </section>

        {/* Agent Status Grid */}
        <section className="agents-section">
          <h2 className="section-title">
            <span className="section-icon">🤖</span>
            Agent Swarm
          </h2>
          <div className="agents-grid">
            {agents.map((agent) => (
              <div 
                key={agent.name} 
                className={`agent-card ${agent.status}`}
                style={{ '--agent-color': getStatusColor(agent.status) } as React.CSSProperties}
              >
                <div className="agent-header">
                  <span className="agent-icon">
                    {agent.name === 'Watchman' && '👁️'}
                    {agent.name === 'Vision Specialist' && '📸'}
                    {agent.name === 'Climate Analyst' && '📊'}
                  </span>
                  <span className="agent-name">{agent.name}</span>
                </div>
                <div className="agent-status">
                  <span className={`status-badge ${agent.status}`}>
                    {agent.status.toUpperCase()}
                  </span>
                </div>
                {agent.lastAction && (
                  <div className="agent-action">{agent.lastAction}</div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Logs Section */}
        <section className="logs-section">
          <h2 className="section-title">
            <span className="section-icon">📋</span>
            Activity Log
          </h2>
          <div className="logs-container">
            {logs.length === 0 ? (
              <div className="logs-empty">
                <span>Waiting for alert input...</span>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className={`log-entry ${log.type}`}>
                  <span className="log-time">{log.timestamp}</span>
                  <span className="log-agent">[{log.agent}]</span>
                  <span className="log-icon">{getLogTypeIcon(log.type)}</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </section>

        {/* Report Section */}
        {currentReport && (
          <section className="report-section">
            <h2 className="section-title">
              <span className="section-icon">📑</span>
              Crisis Action Report
            </h2>
            <div className="report-container">
              <pre className="report-content">{currentReport}</pre>
              <div className="report-actions">
                <button onClick={() => navigator.clipboard.writeText(currentReport)}>
                  📋 Copy Report
                </button>
                <button onClick={() => {
                  const blob = new Blob([currentReport], { type: 'text/markdown' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `crisis-report-${Date.now()}.md`
                  a.click()
                }}>
                  💾 Download
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>Aegis-1 Multi-Agent Disaster Response System • Powered by Dedalus Labs</p>
      </footer>
    </div>
  )
}

export default App
