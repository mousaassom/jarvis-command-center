import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Activity, AudioLines, Bot, Check, ChevronRight, CircleGauge, Command,
  Cpu, Download, Github, Globe2, Menu, Mic, MicOff, Pause, Play, Power,
  Radio, RotateCcw, ScanLine, Send, Settings, ShieldCheck, Sparkles,
  Volume2, VolumeX, X, Zap,
} from 'lucide-react'
import { HelmetScene } from './components/HelmetScene'
import './App.css'

type Message = {
  id: string
  role: 'jarvis' | 'user'
  text: string
  time: string
}

type SettingsState = {
  voice: boolean
  motion: boolean
  telemetry: boolean
}

type SpeechResultEvent = { results: { 0: { 0: { transcript: string } } } }
type SpeechRecognitionInstance = {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onstart: () => void
  onresult: (event: SpeechResultEvent) => void
  onerror: () => void
  onend: () => void
  start: () => void
  stop: () => void
  abort: () => void
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const welcome: Message = {
  id: 'welcome', role: 'jarvis', time: now(),
  text: 'JARVIS online. I can inspect this browser session, run safe diagnostics, explain available commands, and help you focus. How can I assist, boss?',
}
const suggestions = ['Run full diagnostic', 'Check connection security', 'Give me a mission brief']

function readSettings(): SettingsState {
  try {
    const saved = localStorage.getItem('jarvis-settings')
    if (saved) return JSON.parse(saved)
  } catch { /* use defaults */ }
  return { voice: false, motion: !window.matchMedia('(prefers-reduced-motion: reduce)').matches, telemetry: true }
}

function readMessages(): Message[] {
  try {
    const saved = localStorage.getItem('jarvis-messages')
    if (saved) return JSON.parse(saved).slice(-30)
  } catch { /* use welcome message */ }
  return [welcome]
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>(readMessages)
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [listening, setListening] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mobilePanel, setMobilePanel] = useState(false)
  const [settings, setSettings] = useState<SettingsState>(readSettings)
  const [clock, setClock] = useState(new Date())
  const [notice, setNotice] = useState('All local systems nominal')
  const [online, setOnline] = useState(navigator.onLine)
  const inputRef = useRef<HTMLInputElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const commandRef = useRef<(command: string) => void>(() => {})
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  const cores = navigator.hardwareConcurrency || '—'
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const secure = window.isSecureContext

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000)
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      clearInterval(timer)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('jarvis-settings', JSON.stringify(settings))
    document.documentElement.classList.toggle('reduce-motion', !settings.motion)
  }, [settings])

  useEffect(() => {
    localStorage.setItem('jarvis-messages', JSON.stringify(messages.slice(-30)))
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: settings.motion ? 'smooth' : 'auto' })
  }, [messages, settings.motion])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
      if (event.key === 'Escape') {
        setSettingsOpen(false)
        setMobilePanel(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const speak = (text: string) => {
    if (!settings.voice || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.02
    utterance.pitch = 0.88
    window.speechSynthesis.speak(utterance)
  }

  const reply = (text: string) => {
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'jarvis', text, time: now() }])
    setThinking(false)
    speak(text)
  }

  const diagnosticText = () => {
    const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection
    return `Diagnostic complete. Browser is ${online ? 'online' : 'offline'}; ${cores} logical cores and ${memory ? `${memory} GB approximate device memory` : 'device memory not exposed'} detected. Connection is ${connection?.effectiveType?.toUpperCase() || 'available'}; secure context ${secure ? 'verified' : 'not available'}. No operating-system files or processes were accessed.`
  }

  const runDiagnostic = () => {
    if (scanning) return
    setScanning(true)
    setThinking(true)
    setNotice('Running non-invasive browser diagnostic')
    window.setTimeout(() => {
      setScanning(false)
      setNotice('Diagnostic complete · no issues detected')
      reply(diagnosticText())
    }, settings.motion ? 1800 : 100)
  }

  const securityText = () => `Security check complete. Secure context: ${secure ? 'yes' : 'no'}. Network: ${online ? 'connected' : 'offline'}. This page uses a browser sandbox; JARVIS cannot inspect local files, passwords, or other applications. For device protection, keep your browser and OS updated and review extensions you do not recognize.`

  const missionText = () => `Mission brief: local time ${now()}; connection ${online ? 'stable' : 'offline'}; voice responses ${settings.voice ? 'enabled' : 'muted'}; ambient motion ${settings.motion ? 'active' : 'paused'}. Suggested next step: run a full diagnostic or ask “help” to see every command.`

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        setNotice('Focus mode disengaged')
      } else {
        await document.documentElement.requestFullscreen()
        setNotice('Focus mode engaged · press Esc to exit')
      }
    } catch {
      setNotice('Fullscreen is not available in this browser')
    }
  }

  const submitCommand = (raw: string) => {
    const command = raw.trim()
    if (!command || thinking) return
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text: command, time: now() }])
    setInput('')
    setThinking(true)
    setNotice('Processing local command')
    const lower = command.toLowerCase()
    window.setTimeout(() => {
      if (/diagnostic|scan system|system status|health/.test(lower)) {
        runDiagnostic()
      } else if (/security|secure|threat|connection/.test(lower)) {
        setNotice('Security inspection complete')
        reply(securityText())
      } else if (/mission|brief|summary/.test(lower)) {
        setNotice('Mission brief ready')
        reply(missionText())
      } else if (/focus|fullscreen/.test(lower)) {
        toggleFullscreen()
        reply('Engaging focus mode where supported. Press Escape to return to the standard viewport.')
      } else if (/optimize|speed|performance/.test(lower)) {
        setNotice('Optimization guidance ready')
        reply(`This browser exposes ${cores} logical cores${memory ? ` and about ${memory} GB device memory` : ''}. I cannot safely change OS processes, but you can improve performance by closing unused tabs, disabling unnecessary extensions, and keeping ambient motion paused. I have no access to your files or applications.`)
      } else if (/time|date/.test(lower)) {
        reply(`Local system time is ${new Date().toLocaleString([], { weekday: 'long', hour: '2-digit', minute: '2-digit', month: 'long', day: 'numeric' })}.`)
      } else if (/clear|reset chat/.test(lower)) {
        setMessages([welcome])
        setThinking(false)
        setNotice('Conversation cleared')
      } else if (/help|commands|what can you do/.test(lower)) {
        reply('Available commands: run diagnostic, check security, mission brief, optimize performance, focus mode, current time, clear chat, and pause or resume motion. Everything runs locally in this browser; sensitive device control is intentionally not included.')
      } else if (/hello|hi|hey|jarvis/.test(lower)) {
        reply('At your service. All browser-local systems are standing by. Ask for a diagnostic, security check, or mission brief.')
      } else {
        reply(`I received “${command}”. This version uses a local command engine rather than a cloud AI model. Try “help” for supported commands, or ask for a diagnostic, security check, performance guidance, or mission brief.`)
      }
    }, settings.motion ? 550 : 50)
  }
  useEffect(() => { commandRef.current = submitCommand })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    submitCommand(input)
  }

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const speechWindow = window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setNotice('Voice input is not supported here · type a command instead')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => { setListening(true); setNotice('Listening · speak your command') }
    recognition.onresult = (event: SpeechResultEvent) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      commandRef.current(transcript)
    }
    recognition.onerror = () => { setListening(false); setNotice('Voice input unavailable · type a command instead') }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
  }

  const exportReport = () => {
    const report = [
      'JARVIS BROWSER DIAGNOSTIC REPORT',
      `Generated: ${new Date().toISOString()}`,
      `Network: ${online ? 'online' : 'offline'}`,
      `Secure context: ${secure}`,
      `Logical cores: ${cores}`,
      `Approximate device memory: ${memory ? `${memory} GB` : 'not exposed'}`,
      `User agent: ${navigator.userAgent}`,
      '',
      'Scope: browser-provided metadata only. No OS files, processes, credentials, or other applications were accessed.',
    ].join('\n')
    const url = URL.createObjectURL(new Blob([report], { type: 'text/plain' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'jarvis-diagnostic-report.txt'
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice('Diagnostic report exported')
  }

  const resetSession = () => {
    setMessages([welcome])
    setInput('')
    setNotice('New JARVIS session initialized')
    setSettingsOpen(false)
  }

  return (
    <main className={`jarvis-app ${settings.telemetry ? '' : 'telemetry-hidden'}`}>
      <div className="ambient-grid" aria-hidden="true" />
      <header className="topbar">
        <a className="brand" href="#command-center" aria-label="JARVIS home">
          <span className="brand-mark"><Zap size={17} fill="currentColor" /></span>
          <span><strong>J.A.R.V.I.S.</strong><small>JUST A RATHER VERY INTELLIGENT SYSTEM</small></span>
        </a>
        <div className="topbar-center" aria-label="System status">
          <span className={`status-dot ${online ? '' : 'offline'}`} />
          {online ? 'SYSTEM ONLINE' : 'OFFLINE MODE'} <span className="divider">/</span> MARK VII
        </div>
        <div className="top-actions">
          <time>{clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>
          <button className="icon-button" onClick={() => setSettings((s) => ({ ...s, voice: !s.voice }))} aria-label={settings.voice ? 'Mute voice responses' : 'Enable voice responses'} title={settings.voice ? 'Mute voice' : 'Enable voice'}>
            {settings.voice ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button className="icon-button desktop-action" onClick={() => setSettingsOpen(true)} aria-label="Open settings" title="Settings"><Settings size={18} /></button>
          <button className="icon-button mobile-menu" onClick={() => setMobilePanel(true)} aria-label="Open telemetry panel"><Menu size={19} /></button>
        </div>
      </header>

      <section id="command-center" className="command-layout">
        <aside className="left-rail" aria-label="Browser telemetry">
          <div className="rail-heading"><Activity size={15} /> LIVE TELEMETRY <span>01</span></div>
          <section className="power-module">
            <div className="module-label">ARC REACTOR <span>SIMULATION</span></div>
            <div className="power-readout"><strong>98.4</strong><span>%</span></div>
            <div className="segmented-bar" aria-label="Simulated reactor power 98.4 percent">{Array.from({ length: 18 }).map((_, i) => <i key={i} className={i > 16 ? 'dim' : ''} />)}</div>
            <p>OUTPUT STABLE <span>3.2 GW</span></p>
          </section>
          <section className="system-module">
            <div className="module-label">ENVIRONMENT</div>
            <TelemetryRow icon={<Cpu size={15} />} label="LOGICAL CORES" value={String(cores)} />
            <TelemetryRow icon={<CircleGauge size={15} />} label="DEVICE MEMORY" value={memory ? `≈ ${memory} GB` : 'N/A'} />
            <TelemetryRow icon={<Globe2 size={15} />} label="NETWORK" value={online ? 'ONLINE' : 'OFFLINE'} good={online} />
            <TelemetryRow icon={<ShieldCheck size={15} />} label="SECURE CONTEXT" value={secure ? 'VERIFIED' : 'NO'} good={secure} />
          </section>
          <section className="protocol-module">
            <div className="module-label">ACTIVE PROTOCOLS</div>
            {['Browser sandbox', 'Local command engine', 'Non-invasive diagnostics', 'Permissioned voice input'].map((item, index) => (
              <div className="protocol" key={item}><span>0{index + 1}</span>{item}<Check size={13} /></div>
            ))}
          </section>
          <div className="rail-note"><Radio size={14} /><span>Browser-provided metrics only.<br />No OS access or hidden control.</span></div>
        </aside>

        <section className="hero-console" aria-label="JARVIS interactive core">
          <div className="hero-copy">
            <span className="eyebrow"><span /> PERSONAL ASSISTANT · ONLINE</span>
            <h1>AT YOUR<br /><em>SERVICE.</em></h1>
            <p>Ask for a system check, security guidance,<br className="desktop-break" /> or simply say “Hello, JARVIS.”</p>
          </div>
          <div className="reactor-stage">
            <div className="orbital orbital-one" aria-hidden="true" />
            <div className="orbital orbital-two" aria-hidden="true" />
            <div className="orbital orbital-three" aria-hidden="true" />
            <div className="target-brackets" aria-hidden="true"><i /><i /><i /><i /></div>
            <HelmetScene paused={!settings.motion} scanning={scanning} />
            <div className="scan-beam" aria-hidden="true" />
            <div className="stage-label label-left">MARK<br /><strong>VII</strong></div>
            <div className="stage-label label-right">CORE<br /><strong>{scanning ? 'SCAN' : 'SYNC'}</strong></div>
          </div>
          <div className="hero-actions">
            <button className="primary-action" onClick={runDiagnostic} disabled={scanning || thinking}>
              <ScanLine size={17} /> {scanning ? 'SCANNING…' : 'RUN DIAGNOSTIC'} <ChevronRight size={16} />
            </button>
            <button className="text-action" onClick={toggleFullscreen}><Power size={15} /> FOCUS MODE</button>
          </div>
          <div className="core-caption"><span className={thinking ? 'pulse' : ''} />{thinking ? 'PROCESSING REQUEST' : 'AWAITING YOUR COMMAND'}<small>LOCAL ENGINE / READY</small></div>
        </section>

        <aside className="right-rail" aria-label="JARVIS conversation">
          <div className="rail-heading"><Bot size={15} /> ASSISTANT FEED <span>02</span></div>
          <div className="chat-stream" ref={chatRef} aria-live="polite">
            {messages.map((message) => (
              <article className={`message ${message.role}`} key={message.id}>
                <div className="message-meta">{message.role === 'jarvis' ? 'JARVIS' : 'YOU'} <time>{message.time}</time></div>
                <p>{message.text}</p>
              </article>
            ))}
            {thinking && <div className="thinking"><i /><i /><i /><span>ANALYZING</span></div>}
          </div>
          <div className="quick-commands">
            <div className="module-label">QUICK COMMANDS</div>
            <button onClick={() => { setThinking(true); setNotice('Inspecting browser security context'); setTimeout(() => { setNotice('Security inspection complete'); reply(securityText()) }, 250) }}><ShieldCheck size={15} /><span>Security check</span><ChevronRight size={14} /></button>
            <button onClick={() => { setThinking(true); setTimeout(() => reply(missionText()), 250) }}><Sparkles size={15} /><span>Mission brief</span><ChevronRight size={14} /></button>
            <button onClick={exportReport}><Download size={15} /><span>Export report</span><ChevronRight size={14} /></button>
          </div>
        </aside>
      </section>

      <footer className="command-dock">
        <div className="notice" role="status"><span className="status-dot" />{notice}</div>
        <form className="command-form" onSubmit={handleSubmit}>
          <Command size={19} aria-hidden="true" />
          <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask JARVIS or type “help”…" aria-label="Command JARVIS" disabled={thinking} />
          <kbd>CTRL K</kbd>
          <button type="button" className={`mic-button ${listening ? 'listening' : ''}`} onClick={toggleListening} aria-label={listening ? 'Stop listening' : 'Start voice input'}>{listening ? <MicOff size={18} /> : <Mic size={18} />}</button>
          <button className="send-button" type="submit" disabled={!input.trim() || thinking} aria-label="Send command"><Send size={18} /></button>
        </form>
        <div className="suggestions">
          {suggestions.map((suggestion) => <button key={suggestion} onClick={() => submitCommand(suggestion)} disabled={thinking}>{suggestion}</button>)}
          <button className="motion-toggle" onClick={() => setSettings((s) => ({ ...s, motion: !s.motion }))}>{settings.motion ? <Pause size={13} /> : <Play size={13} />}{settings.motion ? 'Pause motion' : 'Resume motion'}</button>
        </div>
      </footer>

      {settingsOpen && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setSettingsOpen(false) }}>
          <section className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <div className="panel-header"><div><small>SYSTEM PREFERENCES</small><h2 id="settings-title">JARVIS settings</h2></div><button className="icon-button" onClick={() => setSettingsOpen(false)} aria-label="Close settings"><X size={19} /></button></div>
            <SettingToggle label="Voice responses" description="Speak JARVIS replies using your browser voice." value={settings.voice} onChange={() => setSettings((s) => ({ ...s, voice: !s.voice }))} icon={<AudioLines size={18} />} />
            <SettingToggle label="Ambient motion" description="Helmet drift, reactor rotation, and scan animation." value={settings.motion} onChange={() => setSettings((s) => ({ ...s, motion: !s.motion }))} icon={<Activity size={18} />} />
            <SettingToggle label="Telemetry rails" description="Show live browser metrics beside the core." value={settings.telemetry} onChange={() => setSettings((s) => ({ ...s, telemetry: !s.telemetry }))} icon={<CircleGauge size={18} />} />
            <div className="privacy-note"><ShieldCheck size={18} /><p><strong>Local by design.</strong> Chat and preferences stay in this browser’s local storage. They do not sync across devices; clearing browser data removes them.</p></div>
            <a className="repo-link" href="https://github.com/mousaassom/jarvis-command-center" target="_blank" rel="noreferrer"><Github size={17} /> View source on GitHub <ChevronRight size={15} /></a>
            <button className="reset-button" onClick={resetSession}><RotateCcw size={16} /> Reset conversation</button>
          </section>
        </div>
      )}

      {mobilePanel && (
        <div className="modal-backdrop mobile-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setMobilePanel(false) }}>
          <section className="settings-panel" role="dialog" aria-modal="true" aria-label="Telemetry and settings">
            <div className="panel-header"><div><small>LIVE BROWSER DATA</small><h2>System telemetry</h2></div><button className="icon-button" onClick={() => setMobilePanel(false)} aria-label="Close telemetry"><X size={19} /></button></div>
            <TelemetryRow icon={<Cpu size={15} />} label="LOGICAL CORES" value={String(cores)} />
            <TelemetryRow icon={<CircleGauge size={15} />} label="DEVICE MEMORY" value={memory ? `≈ ${memory} GB` : 'N/A'} />
            <TelemetryRow icon={<Globe2 size={15} />} label="NETWORK" value={online ? 'ONLINE' : 'OFFLINE'} good={online} />
            <TelemetryRow icon={<ShieldCheck size={15} />} label="SECURE CONTEXT" value={secure ? 'VERIFIED' : 'NO'} good={secure} />
            <button className="reset-button" onClick={() => { setMobilePanel(false); setSettingsOpen(true) }}><Settings size={16} /> Open settings</button>
          </section>
        </div>
      )}
    </main>
  )
}

function TelemetryRow({ icon, label, value, good }: { icon: React.ReactNode; label: string; value: string; good?: boolean }) {
  return <div className="telemetry-row">{icon}<span>{label}</span><strong className={good ? 'good' : ''}>{value}</strong></div>
}

function SettingToggle({ label, description, value, onChange, icon }: { label: string; description: string; value: boolean; onChange: () => void; icon: React.ReactNode }) {
  return <button className="setting-toggle" onClick={onChange} role="switch" aria-checked={value}>{icon}<span><strong>{label}</strong><small>{description}</small></span><i className={value ? 'on' : ''}><b /></i></button>
}
