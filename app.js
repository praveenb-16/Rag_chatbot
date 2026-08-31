/* ============================================================
   AI NEXUS — Enterprise Knowledge Assistant
   Application Logic & Interaction Layer
   ============================================================ */

'use strict';

// ============================================================
// STATE
// ============================================================
const state = {
  ragMode: true,
  currentScreen: 'chat',
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  messageCount: 0,
  conversationActive: false,
};

// ============================================================
// SCREEN MANAGEMENT
// ============================================================
function showApp(e) {
  if (e) e.preventDefault();
  document.getElementById('screen-login').classList.remove('active');
  const app = document.getElementById('screen-app');
  app.classList.add('active');
  app.style.display = 'flex';
  initKBTable();
  initHistoryList();
  initAnalytics();
  initBarChart();
  initSourceList();
}

function showScreen(screenName) {
  document.querySelectorAll('.content-screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`screen-${screenName}`);
  if (target) target.classList.add('active');
  state.currentScreen = screenName;

  // Update nav active states
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.conv-item').forEach(c => c.classList.remove('active'));

  // Close mobile sidebar
  if (window.innerWidth <= 768) {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('mobile-open');
    state.mobileSidebarOpen = false;
  }
}

// ============================================================
// SIDEBAR
// ============================================================
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth <= 768) {
    state.mobileSidebarOpen = !state.mobileSidebarOpen;
    sidebar.classList.toggle('mobile-open', state.mobileSidebarOpen);
  } else {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    sidebar.classList.toggle('collapsed', state.sidebarCollapsed);
  }
}

// ============================================================
// RAG TOGGLE
// ============================================================
function toggleRag(el) {
  el.classList.toggle('active');
  state.ragMode = el.classList.contains('active');
  const statusEl = document.querySelector('.toggle-status');
  if (statusEl) statusEl.textContent = state.ragMode ? 'ON' : 'OFF';
}

// ============================================================
// CHAT — INPUT HANDLING
// ============================================================
function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 180) + 'px';
}

function sendSuggestedPrompt(btn) {
  const text = btn.querySelector('span').textContent;
  const input = document.getElementById('chat-input');
  input.value = text;
  autoResizeTextarea(input);
  sendMessage();
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  // Hide welcome state, show messages
  const welcomeState = document.getElementById('welcome-state');
  const messagesContainer = document.getElementById('messages-container');
  if (welcomeState) {
    welcomeState.style.display = 'none';
    messagesContainer.style.flex = '1';
  }

  input.value = '';
  input.style.height = 'auto';
  state.messageCount++;
  state.conversationActive = true;

  // Add user message
  appendUserMessage(text);

  // Scroll to bottom
  scrollToBottom();

  // Simulate AI response with RAG
  await simulateAIResponse(text);
}

function appendUserMessage(text) {
  const container = document.getElementById('messages-container');
  const wrap = document.createElement('div');
  wrap.className = 'message-wrap message-user';
  wrap.innerHTML = `<div class="msg-bubble">${escapeHtml(text)}</div>`;
  container.appendChild(wrap);
}

async function simulateAIResponse(userText) {
  const container = document.getElementById('messages-container');

  // Show RAG thinking indicator
  if (state.ragMode) {
    const thinkingEl = createRAGThinkingIndicator();
    container.appendChild(thinkingEl);
    scrollToBottom();

    await animateRAGSteps(thinkingEl);
    thinkingEl.remove();
  } else {
    // Simple typing indicator
    const typingEl = document.createElement('div');
    typingEl.className = 'typing-indicator';
    typingEl.innerHTML = `<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>`;
    container.appendChild(typingEl);
    scrollToBottom();
    await sleep(1400);
    typingEl.remove();
  }

  // Pick a response
  const response = pickResponse(userText);
  appendAIMessage(response);
  scrollToBottom();
}

function createRAGThinkingIndicator() {
  const el = document.createElement('div');
  el.className = 'message-wrap message-ai';
  el.innerHTML = `
    <div class="ai-header">
      <div class="ai-avatar">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect width="14" height="14" rx="4" fill="#1B2B4B"/>
          <circle cx="7" cy="7" r="3.5" fill="none" stroke="#4A90D9" stroke-width="1"/>
          <circle cx="7" cy="7" r="1" fill="#4A90D9"/>
        </svg>
      </div>
      <span class="ai-label">AI Nexus</span>
    </div>
    <div class="rag-thinking" id="rag-thinking">
      <div class="rag-thinking-steps" id="rag-steps">
        <div class="rag-step active" id="step-1">
          <div class="rag-step-indicator"></div>
          <span>Searching knowledge base...</span>
        </div>
      </div>
      <div class="rag-progress-bar"><div class="rag-progress-fill"></div></div>
    </div>
  `;
  return el;
}

async function animateRAGSteps(el) {
  const stepsContainer = el.querySelector('#rag-steps');
  const steps = [
    { text: 'Searching knowledge base...', delay: 600 },
    { text: 'Retrieving relevant documents', delay: 500 },
    { text: 'Ranking by relevance...', delay: 500 },
    { text: 'Generating response...', delay: 500 },
  ];

  const firstStep = stepsContainer.querySelector('#step-1');
  firstStep.querySelector('span').textContent = steps[0].text;
  await sleep(steps[0].delay);

  for (let i = 1; i < steps.length; i++) {
    // Mark previous as done
    const prevSteps = stepsContainer.querySelectorAll('.rag-step');
    prevSteps.forEach(s => {
      if (s.classList.contains('active')) {
        s.classList.remove('active');
        s.classList.add('done');
        s.querySelector('.rag-step-indicator').innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#22C55E" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      }
    });

    const newStep = document.createElement('div');
    newStep.className = 'rag-step active';
    newStep.style.animationDelay = `${i * 0.1}s`;
    newStep.innerHTML = `<div class="rag-step-indicator"></div><span>${steps[i].text}</span>`;
    stepsContainer.appendChild(newStep);

    await sleep(steps[i].delay);
  }

  await sleep(300);
}

function appendAIMessage(response) {
  const container = document.getElementById('messages-container');
  const wrap = document.createElement('div');
  wrap.className = 'message-wrap message-ai';

  const sourcesHTML = state.ragMode ? buildSourcesHTML(response.sources) : '';

  wrap.innerHTML = `
    <div class="ai-header">
      <div class="ai-avatar">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect width="14" height="14" rx="4" fill="#1B2B4B"/>
          <circle cx="7" cy="7" r="3.5" fill="none" stroke="#4A90D9" stroke-width="1"/>
          <circle cx="7" cy="7" r="1" fill="#4A90D9"/>
        </svg>
      </div>
      <span class="ai-label">AI Nexus</span>
      ${state.ragMode ? `<div class="sources-count"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="1" y="1" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.2"/></svg>${response.sources.length} documents found</div>` : ''}
    </div>
    <div class="msg-bubble-ai">
      ${response.html}
      ${sourcesHTML}
    </div>
    <div class="msg-actions">
      <button class="msg-action-btn" onclick="copyResponse(this)" title="Copy">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M4 3H3a1 1 0 01-1-1V3a1 1 0 011-1h4a1 1 0 011 1v1" stroke="currentColor" stroke-width="1.2"/></svg>
        Copy
      </button>
      <button class="msg-action-btn" onclick="regenerateResponse(this)" title="Regenerate">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6a4 4 0 017-2.65M10 6a4 4 0 01-7 2.65" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M9 3l.65 1.5L11 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Regenerate
      </button>
      <div class="feedback-btns">
        <button class="msg-action-btn" onclick="giveFeedback(this, 'up')" title="Good response">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 11V5.5L7 1l.5.5v3h3l-.5 5.5H4zM1 5.5h3V11H1V5.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>
        </button>
        <button class="msg-action-btn" onclick="giveFeedback(this, 'down')" title="Bad response">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 1v5.5L5 11l-.5-.5V7.5H1.5l.5-5.5H8zM11 6.5H8V1h3v5.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>
        </button>
      </div>
    </div>
  `;
  container.appendChild(wrap);
}

function buildSourcesHTML(sources) {
  if (!sources || sources.length === 0) return '';

  const chips = sources.map(s => `
    <button class="source-chip" onclick="openSourceModal('${escapeHtml(s.name)}')">
      <div class="source-chip-icon ${s.type}">
        ${s.type === 'pdf'
          ? `<svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1 1h4.5L8 3.5V8H1V1z" stroke="#DC2626" stroke-width="1" rx="0.5"/><path d="M5.5 1v2.5H8" stroke="#DC2626" stroke-width="1"/></svg>`
          : `<svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M2 2h5M2 4.5h5M2 7h3" stroke="#16A34A" stroke-width="1" stroke-linecap="round"/></svg>`
        }
      </div>
      ${escapeHtml(s.name)}
      ${s.page ? `<span class="source-chip-page">pg. ${s.page}</span>` : ''}
    </button>
  `).join('');

  const relevance = sources[0].relevance || 91;

  return `
    <div class="sources-section">
      <div class="sources-header">
        <div class="sources-title">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1.5" y="1.5" width="10" height="10" rx="2" stroke="currentColor" stroke-width="1.2"/><path d="M4 4.5h5M4 6.5h5M4 8.5h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
          Retrieved Sources
        </div>
        <button class="view-sources-btn" onclick="openSourceModal('${escapeHtml(sources[0].name)}')">View sources →</button>
      </div>
      <div class="source-chips">${chips}</div>
      <div class="relevance-bar">
        <span>Avg. Relevance</span>
        <div class="relevance-track"><div class="relevance-fill" style="width:${relevance}%"></div></div>
        <strong style="color:var(--navy);font-size:11.5px">${relevance}%</strong>
      </div>
    </div>
  `;
}

// ============================================================
// RESPONSE BANK
// ============================================================
const responses = [
  {
    keywords: ['technolog', 'tech stack', 'technologies', 'system', 'architecture'],
    html: `
      <h3>Technology Stack — AI Nexus Project</h3>
      <p>The project employs a modern, enterprise-grade AI architecture specifically designed for scalable knowledge retrieval:</p>
      <ul>
        <li><strong>Large Language Model:</strong> GPT-4o via Azure OpenAI Service</li>
        <li><strong>Vector Database:</strong> Pinecone (1536-dimensional embeddings)</li>
        <li><strong>Embedding Model:</strong> <code>text-embedding-3-large</code></li>
        <li><strong>Retrieval Pipeline:</strong> Hybrid RAG (Semantic + BM25 keyword search)</li>
        <li><strong>Backend API:</strong> FastAPI (Python 3.11)</li>
        <li><strong>Frontend:</strong> React 18 + TypeScript</li>
        <li><strong>Orchestration:</strong> LangChain + LlamaIndex</li>
        <li><strong>Infrastructure:</strong> Docker, Kubernetes (GKE)</li>
      </ul>
      <p>The system follows a <strong>Retrieval-Augmented Generation (RAG)</strong> architecture, ensuring all responses are grounded in the organization's internal knowledge base rather than relying solely on model training data.</p>
    `,
    sources: [
      { name: 'AI_Architecture.pdf', type: 'pdf', page: 7, relevance: 96 },
      { name: 'System_Architecture.pdf', type: 'pdf', page: 3, relevance: 91 },
      { name: 'Technical_Documentation.md', type: 'md', page: null, relevance: 87 },
    ]
  },
  {
    keywords: ['summar', 'documentation', 'project doc', 'overview', 'latest'],
    html: `
      <h3>Project Documentation Summary</h3>
      <p>The AI Nexus project documentation covers four primary domains:</p>
      <ol>
        <li><strong>System Design (Pages 1–15):</strong> High-level architecture, component interactions, and data flow diagrams for the RAG pipeline.</li>
        <li><strong>API Reference (Pages 16–38):</strong> Complete REST API documentation with endpoint specifications, request/response schemas, and authentication flows.</li>
        <li><strong>Deployment Guide (Pages 39–52):</strong> Infrastructure setup, environment configuration, CI/CD pipelines, and rollback procedures.</li>
        <li><strong>Performance Benchmarks (Pages 53–60):</strong> Retrieval latency, accuracy metrics, and load testing results across different document corpus sizes.</li>
      </ol>
      <blockquote style="border-left:3px solid var(--blue);padding:10px 14px;background:var(--blue-pale);border-radius:0 6px 6px 0;margin:12px 0;font-size:13px;color:var(--navy)">
        <strong>Key Highlight:</strong> The system achieves 94.7% retrieval accuracy with an average response latency of 1.8 seconds on a 248-document corpus.
      </blockquote>
    `,
    sources: [
      { name: 'Project_Documentation.pdf', type: 'pdf', page: 1, relevance: 98 },
      { name: 'Architecture_Overview.pdf', type: 'pdf', page: 12, relevance: 89 },
    ]
  },
  {
    keywords: ['hr', 'policy', 'leave', 'employ', 'onboard', 'recruit', 'hire'],
    html: `
      <h3>HR Policies — Key Highlights</h3>
      <p>Based on the HR Handbook and Policy Documents, here are the key policies for reference:</p>
      <table>
        <thead><tr><th>Policy Area</th><th>Details</th></tr></thead>
        <tbody>
          <tr><td>Annual Leave</td><td>21 days per year, accrued monthly</td></tr>
          <tr><td>Probation Period</td><td>3 months for all new hires</td></tr>
          <tr><td>Remote Work</td><td>Hybrid model — 3 days office, 2 days remote</td></tr>
          <tr><td>Health Insurance</td><td>Comprehensive coverage from Day 1</td></tr>
          <tr><td>Learning Budget</td><td>₹50,000 per employee per year</td></tr>
        </tbody>
      </table>
      <p>All policies are subject to updates and department-specific variations. Please refer to the full HR handbook for binding information.</p>
    `,
    sources: [
      { name: 'HR_Handbook_2024.pdf', type: 'pdf', page: 14, relevance: 95 },
      { name: 'Employee_Policy.pdf', type: 'pdf', page: 6, relevance: 88 },
      { name: 'Benefits_Guide.md', type: 'md', page: null, relevance: 82 },
    ]
  },
  {
    keywords: ['compare', 'solution', 'difference', 'vs', 'versus', 'option'],
    html: `
      <h3>Comparison — Available AI Solutions</h3>
      <p>The knowledge base documents outline three primary architectural approaches evaluated during the design phase:</p>
      <table>
        <thead>
          <tr><th>Approach</th><th>Accuracy</th><th>Latency</th><th>Cost</th><th>Verdict</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>RAG (Hybrid)</strong></td><td>94.7%</td><td>1.8s</td><td>Medium</td><td style="color:var(--green)">✓ Selected</td></tr>
          <tr><td>Fine-tuned LLM</td><td>88.2%</td><td>1.1s</td><td>High</td><td style="color:var(--text-muted)">Rejected</td></tr>
          <tr><td>Keyword Search</td><td>71.5%</td><td>0.3s</td><td>Low</td><td style="color:var(--text-muted)">Rejected</td></tr>
        </tbody>
      </table>
      <p>The <strong>Hybrid RAG approach</strong> was selected for its superior accuracy and strong balance between cost and performance.</p>
      <pre><code># Hybrid Retrieval Pipeline
results = vector_search(query, k=5)       # Semantic
bm25_results = bm25_search(query, k=5)   # Keyword
final = reciprocal_rank_fusion(results, bm25_results)</code></pre>
    `,
    sources: [
      { name: 'Solution_Comparison.pdf', type: 'pdf', page: 4, relevance: 93 },
      { name: 'Research_Analysis.pdf', type: 'pdf', page: 18, relevance: 86 },
    ]
  },
  {
    keywords: ['ai project', 'information', 'research', 'what', 'find', 'tell'],
    html: `
      <h3>AI Nexus — Project Overview</h3>
      <p>AI Nexus is an enterprise-grade <strong>Retrieval-Augmented Generation (RAG)</strong> system designed to make organizational knowledge instantly accessible. Here is what the project covers:</p>
      <ul>
        <li><strong>Problem Solved:</strong> Organizations have vast knowledge silos — thousands of documents, reports, and manuals that are difficult to query efficiently.</li>
        <li><strong>Core Innovation:</strong> Combines state-of-the-art language models with semantic vector search to provide precise, source-cited answers.</li>
        <li><strong>Current Scale:</strong> 248 documents, 18,420 indexed chunks, 99.8% uptime.</li>
        <li><strong>Users:</strong> HR teams, project managers, researchers, and technical staff.</li>
      </ul>
      <p>The project is built on a three-layer architecture: <strong>Document Ingestion Layer</strong> → <strong>Vector Retrieval Layer</strong> → <strong>LLM Response Generation Layer</strong>.</p>
    `,
    sources: [
      { name: 'AI_Project_Report.pdf', type: 'pdf', page: 2, relevance: 94 },
      { name: 'Knowledge_Base.md', type: 'md', page: null, relevance: 88 },
    ]
  }
];

const defaultResponse = {
  html: `
    <p>I searched the knowledge base and found relevant information to answer your query. Based on the retrieved documents:</p>
    <ul>
      <li>The information you requested spans multiple documents in the knowledge base.</li>
      <li>I have retrieved the most relevant sections and synthesized them into this response.</li>
      <li>All key claims are grounded in the source documents listed below.</li>
    </ul>
    <p>If you need more specific details or want me to focus on a particular aspect of this topic, please let me know and I'll refine the search query accordingly.</p>
  `,
  sources: [
    { name: 'Knowledge_Base.md', type: 'md', page: null, relevance: 85 },
    { name: 'General_Documentation.pdf', type: 'pdf', page: 5, relevance: 79 },
  ]
};

function pickResponse(text) {
  const lc = text.toLowerCase();
  for (const r of responses) {
    if (r.keywords.some(kw => lc.includes(kw))) return r;
  }
  return defaultResponse;
}

// ============================================================
// MESSAGE ACTIONS
// ============================================================
function copyResponse(btn) {
  const bubble = btn.closest('.message-ai').querySelector('.msg-bubble-ai');
  const text = bubble ? bubble.innerText : '';
  navigator.clipboard.writeText(text).catch(() => {});
  btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#22C55E" stroke-width="1.5" stroke-linecap="round"/></svg> Copied!`;
  btn.style.color = 'var(--green)';
  setTimeout(() => {
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M4 3H3a1 1 0 01-1-1V3a1 1 0 011-1h4a1 1 0 011 1v1" stroke="currentColor" stroke-width="1.2"/></svg> Copy`;
    btn.style.color = '';
  }, 2000);
}

async function regenerateResponse(btn) {
  const messageWrap = btn.closest('.message-ai');
  const bubble = messageWrap.querySelector('.msg-bubble-ai');
  const actions = messageWrap.querySelector('.msg-actions');
  if (bubble) {
    bubble.style.opacity = '0.5';
    bubble.innerHTML = `<div class="typing-indicator" style="display:inline-flex"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
    await sleep(1200);
    bubble.style.opacity = '1';
    bubble.innerHTML = defaultResponse.html + buildSourcesHTML(defaultResponse.sources);
  }
}

function giveFeedback(btn, type) {
  const allBtns = btn.closest('.feedback-btns').querySelectorAll('.msg-action-btn');
  allBtns.forEach(b => b.style.color = '');
  btn.style.color = type === 'up' ? 'var(--green)' : 'var(--red)';
}

// ============================================================
// SOURCE MODAL
// ============================================================
function openSourceModal(docName) {
  const modal = document.getElementById('source-modal');
  if (docName) {
    const subtitle = modal.querySelector('.modal-subtitle');
    if (subtitle) subtitle.textContent = docName + ' — Preview';
  }
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSourceModal() {
  const modal = document.getElementById('source-modal');
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

function closeModal(e) {
  if (e.target === e.currentTarget) closeSourceModal();
}

// ============================================================
// KNOWLEDGE BASE TABLE
// ============================================================
const kbDocuments = [
  { name: 'AI_Architecture.pdf', type: 'pdf', chunks: 342, status: 'indexed', updated: '2m ago' },
  { name: 'System_Architecture.pdf', type: 'pdf', chunks: 289, status: 'indexed', updated: '5m ago' },
  { name: 'HR_Handbook_2024.pdf', type: 'pdf', chunks: 1204, status: 'indexed', updated: '1h ago' },
  { name: 'Technical_Documentation.md', type: 'md', chunks: 587, status: 'indexed', updated: '2h ago' },
  { name: 'Project_Report_Q3.pdf', type: 'pdf', chunks: 412, status: 'indexed', updated: '3h ago' },
  { name: 'Research_Paper_RAG.pdf', type: 'pdf', chunks: 198, status: 'indexed', updated: '6h ago' },
  { name: 'Employee_Policy.pdf', type: 'pdf', chunks: 654, status: 'indexed', updated: '1d ago' },
  { name: 'API_Reference.md', type: 'md', chunks: 893, status: 'processing', updated: '2d ago' },
  { name: 'Deployment_Guide.docx', type: 'docx', chunks: 0, status: 'processing', updated: 'Just now' },
  { name: 'Analytics_Report.csv', type: 'csv', chunks: 0, status: 'failed', updated: '3d ago' },
];

function initKBTable() {
  const tbody = document.getElementById('kb-table-body');
  if (!tbody) return;
  tbody.innerHTML = kbDocuments.map(doc => `
    <tr>
      <td><input type="checkbox" /></td>
      <td>
        <div class="doc-name">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M3 2h6.5L12 4.5V13H3V2z" stroke="currentColor" stroke-width="1.2"/>
            <path d="M9 2v2.5h2.5" stroke="currentColor" stroke-width="1.2"/>
          </svg>
          ${escapeHtml(doc.name)}
        </div>
      </td>
      <td><span class="doc-type-badge ${doc.type}">${doc.type.toUpperCase()}</span></td>
      <td>${doc.chunks > 0 ? doc.chunks.toLocaleString() : '—'}</td>
      <td>
        <span class="status-badge ${doc.status}">
          ${doc.status === 'indexed' ? '●' : doc.status === 'processing' ? '◐' : '✕'} ${capitalize(doc.status)}
        </span>
      </td>
      <td style="color:var(--text-muted);font-size:12px">${doc.updated}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="msg-action-btn" onclick="openSourceModal('${escapeHtml(doc.name)}')">View</button>
          <button class="msg-action-btn">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ============================================================
// HISTORY
// ============================================================
const historyData = [
  { title: 'AI Architecture Overview', preview: 'What technologies are used in our AI project? — The project employs a modern enterprise-grade architecture...', time: '2 hours ago', sources: 3, msgs: 8 },
  { title: 'HR Policy Queries', preview: 'What is the leave policy for new employees? — Based on the HR Handbook, new employees receive 21 days...', time: 'Yesterday', sources: 2, msgs: 5 },
  { title: 'Project Technical Stack', preview: 'Summarize the latest project documentation — The documentation covers four primary domains...', time: '2 days ago', sources: 4, msgs: 12 },
  { title: 'Research Paper Analysis', preview: 'Compare the RAG approaches mentioned in the research — Three approaches were evaluated: Hybrid RAG...', time: '3 days ago', sources: 5, msgs: 7 },
  { title: 'Onboarding Documentation', preview: 'Find information about onboarding for new engineers — The onboarding process spans 30 days...', time: '4 days ago', sources: 2, msgs: 4 },
  { title: 'Q3 Performance Review', preview: 'What are the KPIs for Q3 2024? — The Q3 report outlines five primary KPIs...', time: '1 week ago', sources: 3, msgs: 9 },
];

function initHistoryList() {
  const container = document.getElementById('history-list');
  if (!container) return;
  container.innerHTML = historyData.map(h => `
    <div class="history-item" onclick="showScreen('chat')">
      <div class="history-item-header">
        <div class="history-item-title">${escapeHtml(h.title)}</div>
        <div class="history-item-time">${h.time}</div>
      </div>
      <div class="history-item-preview">${escapeHtml(h.preview)}</div>
      <div class="history-item-footer">
        <span class="history-source-count">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="1" y="1" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.1"/></svg>
          ${h.sources} sources
        </span>
        <span style="font-size:11px;color:var(--text-light)">${h.msgs} messages</span>
        <span style="margin-left:auto;font-size:11.5px;color:var(--blue);cursor:pointer">Resume →</span>
      </div>
    </div>
  `).join('');
}

// ============================================================
// ANALYTICS
// ============================================================
function initAnalytics() {
  // source list rendered in initSourceList
}

function initBarChart() {
  const chart = document.getElementById('bar-chart');
  if (!chart) return;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const data = [
    { queries: 55, resolved: 48 },
    { queries: 72, resolved: 65 },
    { queries: 61, resolved: 55 },
    { queries: 90, resolved: 82 },
    { queries: 84, resolved: 78 },
    { queries: 42, resolved: 38 },
    { queries: 38, resolved: 35 },
  ];
  const max = Math.max(...data.map(d => d.queries));
  chart.innerHTML = data.map((d, i) => `
    <div class="bar-group">
      <div class="bar-track">
        <div class="bar queries" style="height:${(d.queries/max)*100}%" title="${d.queries} queries"></div>
        <div class="bar resolved" style="height:${(d.resolved/max)*100}%" title="${d.resolved} resolved"></div>
      </div>
      <div class="bar-label">${days[i]}</div>
    </div>
  `).join('');
}

function initSourceList() {
  const list = document.getElementById('source-list');
  if (!list) return;
  const sources = [
    { name: 'AI_Architecture.pdf', pct: 28 },
    { name: 'HR_Handbook_2024.pdf', pct: 22 },
    { name: 'Technical_Documentation.md', pct: 18 },
    { name: 'Project_Report_Q3.pdf', pct: 14 },
    { name: 'Employee_Policy.pdf', pct: 10 },
    { name: 'Other Documents', pct: 8 },
  ];
  list.innerHTML = sources.map(s => `
    <div class="source-usage-item">
      <div class="source-usage-row">
        <span class="source-usage-name">${escapeHtml(s.name)}</span>
        <span class="source-usage-pct">${s.pct}%</span>
      </div>
      <div class="source-usage-bar">
        <div class="source-usage-fill" style="width:${s.pct * 3.2}%"></div>
      </div>
    </div>
  `).join('');
}

// ============================================================
// DOCUMENT UPLOAD SIMULATION
// ============================================================
function simulateUpload() {
  const fileNames = [
    { name: 'AI_Research_2024.pdf', size: '4.2 MB', type: 'pdf', progress: 100 },
    { name: 'Employee_Handbook.docx', size: '2.8 MB', type: 'docx', progress: 60 },
    { name: 'Technical_Notes.md', size: '0.5 MB', type: 'md', progress: 30 },
  ];

  const container = document.getElementById('upload-items');
  if (!container) return;
  container.innerHTML = '';

  fileNames.forEach((file, i) => {
    const item = document.createElement('div');
    item.className = 'upload-item';
    item.innerHTML = `
      <div class="upload-item-icon ${file.type === 'pdf' ? 'doc-type-badge pdf' : file.type === 'docx' ? 'doc-type-badge docx' : 'doc-type-badge md'}" style="font-size:10px;font-weight:700;width:36px;height:36px;border-radius:6px;display:flex;align-items:center;justify-content:center">
        ${file.type.toUpperCase()}
      </div>
      <div class="upload-item-progress" style="flex:1">
        <div class="upload-item-name">${escapeHtml(file.name)}</div>
        <div class="upload-item-size" style="font-size:11.5px;color:var(--text-muted)">${file.size}</div>
        <div class="progress-bar" style="margin-top:6px">
          <div class="progress-fill" id="prog-${i}" style="width:0%"></div>
        </div>
      </div>
      <span id="status-${i}" style="font-size:11px;color:var(--text-muted);min-width:50px;text-align:right">0%</span>
    `;
    container.appendChild(item);

    // Animate progress
    let progress = 0;
    const target = file.progress;
    const interval = setInterval(() => {
      progress = Math.min(progress + Math.random() * 8, target);
      const bar = document.getElementById(`prog-${i}`);
      const status = document.getElementById(`status-${i}`);
      if (bar) bar.style.width = progress + '%';
      if (status) {
        status.textContent = progress >= target ? (target === 100 ? '✓ Done' : 'Processing...') : Math.round(progress) + '%';
        status.style.color = progress >= target && target === 100 ? 'var(--green)' : 'var(--text-muted)';
      }
      if (progress >= target) clearInterval(interval);
    }, 80 + i * 40);
  });
}

function handleDrop(e) {
  e.preventDefault();
  const area = document.getElementById('upload-area');
  area.classList.remove('dragover');
  simulateUpload();
}

// ============================================================
// UTILITIES
// ============================================================
function scrollToBottom() {
  const area = document.getElementById('chat-area');
  if (area) requestAnimationFrame(() => area.scrollTop = area.scrollHeight);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================
// DRAG & DROP HIGHLIGHT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const uploadArea = document.getElementById('upload-area');
  if (uploadArea) {
    uploadArea.addEventListener('dragover', () => uploadArea.classList.add('dragover'));
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
  }

  // Settings nav items
  document.querySelectorAll('.settings-nav-item').forEach(item => {
    item.addEventListener('click', function() {
      document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Modal tabs
  document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Range slider
  const rangeInput = document.querySelector('.range-input');
  const rangeValue = document.querySelector('.range-value');
  if (rangeInput && rangeValue) {
    rangeInput.addEventListener('input', function() {
      rangeValue.textContent = (this.value / 100).toFixed(2);
    });
  }
});

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeSourceModal();
    if (window.innerWidth <= 768) {
      const sidebar = document.getElementById('sidebar');
      sidebar.classList.remove('mobile-open');
      state.mobileSidebarOpen = false;
    }
  }
  // Ctrl/Cmd + K — focus search or new chat
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    if (input && state.currentScreen === 'chat') input.focus();
  }
});
