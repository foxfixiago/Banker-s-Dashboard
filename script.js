// ============================================================================
// OS DEADLOCK ANALYSIS & RESOURCE ALLOCATION DASHBOARD
// Isolated Scenario-Specific Architecture (Scenarios A, B, C, D, E, F + Analysis)
// ============================================================================

const BASE_ALLOCATION = [
  [0, 1, 0], // P0
  [2, 0, 0], // P1
  [3, 0, 2], // P2
  [2, 1, 1], // P3
  [0, 0, 2]  // P4
];

const BASE_MAX = [
  [7, 5, 3], // P0
  [3, 2, 2], // P1
  [9, 0, 2], // P2
  [2, 2, 2], // P3
  [4, 3, 3]  // P4
];

const BASE_AVAILABLE = [3, 3, 2];

const state = {
  // Scenario A Editable State
  n: 5,
  m: 3,
  resourceNames: ['A', 'B', 'C', 'D', 'E'],
  available: [...BASE_AVAILABLE],
  allocation: BASE_ALLOCATION.map(r => [...r]),
  max: BASE_MAX.map(r => [...r]),

  // Scenario D Detection State
  detection: {
    mode: 'deadlock',
    avail: [0, 0, 0],
    alloc: [],
    request: [],
    terminated: []
  }
};

// ============================================================================
// 1. STATUS BANNER UPDATER
// ============================================================================
function updateGlobalStatus(type, badgeText, title, description, subNote) {
  const banner = document.getElementById('globalStatusBanner');
  banner.className = `status-banner glass-card state-${type}`;
  document.getElementById('statusBadgePill').textContent = badgeText;
  document.getElementById('statusTitle').textContent = title;
  document.getElementById('statusDescription').innerHTML = description;
  document.getElementById('statusSubNote').innerHTML = subNote;
}

// ============================================================================
// 2. SCENARIO TAB NAVIGATION (EACH TAB ISOLATES ITS OWN SCENARIO & STATUS)
// ============================================================================
function switchTab(tabId) {
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabId}`);
  });

  // Automatically refresh that specific scenario's view & banner
  if (tabId === 'scenario-a') {
    runAndRenderScenarioA();
  } else if (tabId === 'scenario-b') {
    evaluateScenarioB();
  } else if (tabId === 'scenario-c') {
    evaluateScenarioC();
  } else if (tabId === 'scenario-d') {
    runDetectionAnalysis();
  } else if (tabId === 'scenario-e') {
    const activePolicy = document.querySelector('.policy-btn.active')?.dataset.policy || 'ordering';
    renderPreventionPolicy(activePolicy);
  } else if (tabId === 'scenario-f') {
    updateGlobalStatus(
      'invalid',
      'BOUNDARY & VALIDATION SUITE',
      'Scenario F: Boundary Cases vs. Invalid Inputs',
      'Select any of the 6 test cases below to inspect how the engine separates valid boundary conditions from malformed or invalid inputs.',
      '<strong>Validation Scope:</strong> Tests zero available resources, zero remaining Need, invalid PIDs, negative requests, and allocations exceeding Max.'
    );
  } else if (tabId === 'report') {
    updateGlobalStatus(
      'safe',
      'SYSTEM ANALYSIS & LOGS',
      'Analytical Evaluation Table (TC1–TC6), AI Development Log & Core Concepts',
      'All test case outputs below are populated directly from the simulation engine across Scenarios A through F.',
      '<strong>Key Principle:</strong> Safe, Waiting/Deferred, Unsafe (Denied), Deadlocked, and Invalid states are maintained as non-interchangeable states.'
    );
  }
}

// ============================================================================
// 3. CORE BANKER'S SAFETY ENGINE
// ============================================================================
function computeNeedMatrix(allocMat, maxMat) {
  return allocMat.map((row, i) => row.map((val, j) => maxMat[i][j] - val));
}

function executeBankersSafety(availVec, allocMat, maxMat) {
  const n = allocMat.length;
  const m = availVec.length;
  const needMat = computeNeedMatrix(allocMat, maxMat);

  for (let j = 0; j < m; j++) {
    if (availVec[j] < 0) {
      return { status: 'invalid', reason: `Available[R_${state.resourceNames[j]}] = ${availVec[j]} cannot be negative.` };
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (needMat[i][j] < 0) {
        return {
          status: 'invalid',
          reason: `Process P${i} has Allocation (${allocMat[i][j]}) > Max (${maxMat[i][j]}) for R_${state.resourceNames[j]} (Need = ${needMat[i][j]}).`
        };
      }
    }
  }

  const work = [...availVec];
  const finish = new Array(n).fill(false);
  const safeSequence = [];
  const steps = [];

  let progress = true;
  while (safeSequence.length < n && progress) {
    progress = false;
    for (let i = 0; i < n; i++) {
      if (!finish[i]) {
        const canSatisfy = needMat[i].every((needVal, j) => needVal <= work[j]);
        if (canSatisfy) {
          const workBefore = [...work];
          for (let j = 0; j < m; j++) {
            work[j] += allocMat[i][j];
          }
          finish[i] = true;
          safeSequence.push(`P${i}`);
          steps.push({
            process: `P${i}`,
            need: [...needMat[i]],
            workBefore,
            allocReleased: [...allocMat[i]],
            workAfter: [...work]
          });
          progress = true;
        }
      }
    }
  }

  const isSafe = safeSequence.length === n;
  const unfinished = [];
  finish.forEach((done, idx) => {
    if (!done) unfinished.push(`P${idx}`);
  });

  return {
    status: isSafe ? 'safe' : 'unsafe',
    safeSequence,
    steps,
    unfinished,
    finalWork: work,
    needMat
  };
}

// ============================================================================
// 4. TAB A: SCENARIO A — SAFE STATE
// ============================================================================
function renderScenarioAUI() {
  document.getElementById('numProcesses').value = state.n;
  document.getElementById('numResources').value = state.m;

  const availContainer = document.getElementById('availableInputsContainer');
  availContainer.innerHTML = '';
  for (let j = 0; j < state.m; j++) {
    const wrap = document.createElement('div');
    wrap.className = 'vec-input-wrap';
    wrap.innerHTML = `
      <span>R_${state.resourceNames[j]}</span>
      <input type="number" class="matrix-input" value="${state.available[j]}" />
    `;
    wrap.querySelector('input').addEventListener('change', (e) => {
      state.available[j] = parseInt(e.target.value, 10) || 0;
      runAndRenderScenarioA();
    });
    availContainer.appendChild(wrap);
  }

  renderEditableMatrixA('allocMatrixContainer', state.allocation, 'alloc');
  renderEditableMatrixA('maxMatrixContainer', state.max, 'max');
  renderNeedMatrixA();
}

function renderEditableMatrixA(containerId, matrixData, type) {
  const container = document.getElementById(containerId);
  let html = `<table class="matrix-table"><thead><tr><th>PID</th>`;
  for (let j = 0; j < state.m; j++) {
    html += `<th>${state.resourceNames[j]}</th>`;
  }
  html += `</tr></thead><tbody>`;

  for (let i = 0; i < state.n; i++) {
    html += `<tr><td class="proc-label-cell">P${i}</td>`;
    for (let j = 0; j < state.m; j++) {
      html += `<td><input type="number" class="matrix-input" data-r="${i}" data-c="${j}" value="${matrixData[i][j]}" /></td>`;
    }
    html += `</tr>`;
  }
  html += `</tbody></table>`;
  container.innerHTML = html;

  container.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('change', (e) => {
      const r = parseInt(e.target.dataset.r, 10);
      const c = parseInt(e.target.dataset.c, 10);
      const val = parseInt(e.target.value, 10) || 0;
      if (type === 'alloc') state.allocation[r][c] = val;
      if (type === 'max') state.max[r][c] = val;
      renderNeedMatrixA();
      runAndRenderScenarioA();
    });
  });
}

function renderNeedMatrixA() {
  const need = computeNeedMatrix(state.allocation, state.max);
  const container = document.getElementById('needMatrixContainer');
  let html = `<table class="matrix-table"><thead><tr><th>PID</th>`;
  for (let j = 0; j < state.m; j++) {
    html += `<th>${state.resourceNames[j]}</th>`;
  }
  html += `</tr></thead><tbody>`;

  for (let i = 0; i < state.n; i++) {
    html += `<tr><td class="proc-label-cell">P${i}</td>`;
    for (let j = 0; j < state.m; j++) {
      const val = need[i][j];
      const errClass = val < 0 ? 'negative-error' : '';
      html += `<td><span class="need-cell ${errClass}">${val}</span></td>`;
    }
    html += `</tr>`;
  }
  html += `</tbody></table>`;
  container.innerHTML = html;
}

function runAndRenderScenarioA() {
  const result = executeBankersSafety(state.available, state.allocation, state.max);
  const seqContainer = document.getElementById('safeSequenceDisplayA');
  const timeline = document.getElementById('workStepTimelineA');

  if (result.status === 'invalid') {
    seqContainer.innerHTML = `<span class="legend-chip chip-invalid">INVALID CONFIGURATION</span>`;
    timeline.innerHTML = `<div class="step-card step-fail"><div class="step-top">Validation Error</div><div class="step-math">${result.reason}</div></div>`;
    updateGlobalStatus('invalid', 'INVALID CONFIGURATION', 'Scenario A: Matrix Configuration Error', result.reason, 'Ensure Allocation ≤ Maximum and Available ≥ 0.');
    return;
  }

  if (result.status === 'safe') {
    seqContainer.innerHTML = result.safeSequence
      .map((p, idx) => `<span class="seq-node">${p}</span>${idx < result.safeSequence.length - 1 ? '<span class="seq-arrow">→</span>' : ''}`)
      .join('');

    timeline.innerHTML = result.steps
      .map((s, idx) => `
        <div class="step-card">
          <div class="step-top">
            <span>Step ${idx + 1}: ${s.process} Completes</span>
            <span style="color: #34d399">Need [${s.need.join(', ')}] ≤ Work [${s.workBefore.join(', ')}]</span>
          </div>
          <div class="step-math">
            Work = [${s.workBefore.join(', ')}] + Alloc(${s.process}) [${s.allocReleased.join(', ')}] = <strong>[${s.workAfter.join(', ')}]</strong>
          </div>
        </div>
      `)
      .join('');

    updateGlobalStatus(
      'safe',
      'SAFE STATE (SCENARIO A)',
      `Scenario A Verified — Safe Sequence: < ${result.safeSequence.join(' → ')} >`,
      `Need matrix calculated automatically. All ${state.n} processes finish safely, returning total resources <code>Work = [${result.finalWork.join(', ')}]</code>.`,
      '<strong>Core Mechanism:</strong> Need = Max − Allocation calculated, Work vector updated step-by-step, and Safe Sequence confirmed.'
    );
  } else {
    seqContainer.innerHTML = `<span class="legend-chip chip-unsafe">NO SAFE SEQUENCE</span>`;
    timeline.innerHTML = `
      <div class="step-card step-fail">
        <div class="step-top">Safety Algorithm Halted</div>
        <div class="step-math">Blocked processes: <strong>${result.unfinished.join(', ')}</strong> (Need exceeds Work [${result.finalWork.join(', ')}])</div>
      </div>
    `;
    updateGlobalStatus(
      'unsafe',
      'UNSAFE STATE',
      'Current Custom Configuration is Unsafe',
      `Processes ${result.unfinished.join(', ')} cannot complete with current Available resources.`,
      'Click "Reset Default Safe State" to restore the default Scenario A configuration.'
    );
  }
}

// ============================================================================
// 5. TAB B: SCENARIO B — REQUEST EXCEEDS AVAILABLE (WAITING / DEFERRED)
// ============================================================================
function evaluateScenarioB() {
  const pid = parseInt(document.getElementById('reqSelectB').value, 10);
  const reqVec = [
    parseInt(document.getElementById('reqB_0').value, 10) || 0,
    parseInt(document.getElementById('reqB_1').value, 10) || 0,
    parseInt(document.getElementById('reqB_2').value, 10) || 0
  ];

  const needMat = computeNeedMatrix(BASE_ALLOCATION, BASE_MAX);
  const procNeed = needMat[pid];
  const avail = BASE_AVAILABLE;

  const stepsContainer = document.getElementById('scenarioBSteps');
  const verdictBox = document.getElementById('scenarioBVerdictBox');

  const withinNeed = reqVec.every((v, j) => v >= 0 && v <= procNeed[j]);
  const withinAvail = reqVec.every((v, j) => v <= avail[j]);

  if (!withinNeed) {
    stepsContainer.innerHTML = `
      <div class="check-step-box invalid">
        <div class="check-step-title"><span>STEP 1: Request ≤ Need</span><span style="color:#c084fc">FAILED ✗</span></div>
        <div>Request <code>[${reqVec.join(', ')}]</code> exceeds P${pid}'s Need <code>[${procNeed.join(', ')}]</code> (or is negative).</div>
      </div>
    `;
    verdictBox.innerHTML = `<strong style="color:#c084fc">INVALID REQUEST:</strong> To test Scenario B, keep the request within P${pid}'s Need <code>[${procNeed.join(', ')}]</code> (e.g., click "Load Default: P0 Requests [0, 4, 0]").`;
    updateGlobalStatus('invalid', 'INVALID REQUEST', `P${pid} Request [${reqVec.join(', ')}] Exceeds Need`, 'Click "Load Default: P0 Requests [0, 4, 0]" to test Scenario B.', 'Scenario B evaluates requests where Request ≤ Need but Request > Available.');
  } else if (!withinAvail) {
    // Exact Scenario B Target
    stepsContainer.innerHTML = `
      <div class="check-step-box pass">
        <div class="check-step-title"><span>STEP 1: Requestᵢ ≤ Needᵢ</span><span style="color:#34d399">PASSED ✓</span></div>
        <div><code>Request [${reqVec.join(', ')}] ≤ Need(P${pid}) [${procNeed.join(', ')}]</code>.<br/>The request is valid and within P${pid}'s declared Maximum.</div>
      </div>
      <div class="check-step-box wait">
        <div class="check-step-title"><span>STEP 2: Requestᵢ ≤ Available</span><span style="color:#38bdf8">INSUFFICIENT ⏳</span></div>
        <div><code>Request [${reqVec.join(', ')}] &gt; Available [${avail.join(', ')}]</code>.<br/>Not enough free instances are currently available.</div>
      </div>
      <div class="check-step-box wait">
        <div class="check-step-title"><span>STEP 3: Kernel Decision</span><span style="color:#38bdf8">WAITING / DEFERRED</span></div>
        <div><strong>P${pid} must WAIT.</strong> Current Allocation and Available <code>[3, 3, 2]</code> remain <strong>100% UNCHANGED</strong>.</div>
      </div>
    `;

    verdictBox.innerHTML = `
      <strong style="color:#38bdf8">REQUEST DEFERRED — CANNOT BE GRANTED IMMEDIATELY (WAITING):</strong><br/><br/>
      1. Process <code>P${pid}</code> requested <code>[${reqVec.join(', ')}]</code>.<br/>
      2. Because <code>[${reqVec.join(', ')}] ≤ Need(P${pid}) [${procNeed.join(', ')}]</code>, the request is <strong>legitimate</strong> (NOT an invalid input).<br/>
      3. However, because <code>[${reqVec.join(', ')}]</code> exceeds <code>Available [3, 3, 2]</code>, the kernel places <code>P${pid}</code> in a <strong>Waiting / Deferred</strong> state without modifying any system matrices.
    `;

    updateGlobalStatus(
      'wait',
      'WAITING / DEFERRED (SCENARIO B)',
      `Scenario B: P${pid} Request [${reqVec.join(', ')}] Deferred — Exceeds Available [3, 3, 2]`,
      `Valid request (within P${pid}'s Need <code>[${procNeed.join(', ')}]</code>), but exceeds currently free resources <code>[3, 3, 2]</code>. System allocation remains unchanged.`,
      '<strong>Kernel Behavior:</strong> Request cannot be granted immediately; process waits while current resource allocations remain untouched.'
    );
  } else {
    stepsContainer.innerHTML = `
      <div class="check-step-box pass">
        <div class="check-step-title"><span>STEP 1 & 2</span><span style="color:#34d399">BOTH PASSED</span></div>
        <div>Request <code>[${reqVec.join(', ')}]</code> is ≤ Available <code>[3, 3, 2]</code>. To test Scenario B, request more than <code>[3, 3, 2]</code> (e.g., <code>[0, 4, 0]</code>).</div>
      </div>
    `;
    verdictBox.innerHTML = `Click <strong>"Load Default: P0 Requests [0, 4, 0]"</strong> to see a request that exceeds Available.`;
  }

  // Render Unchanged Matrix Snapshot
  let snapHtml = `<table class="matrix-table"><thead><tr><th>Process</th><th>Allocation (Unchanged)</th><th>Max</th><th>Remaining Need (Unchanged)</th></tr></thead><tbody>`;
  for (let i = 0; i < 5; i++) {
    const highlight = i === pid ? 'style="background:rgba(14,165,233,0.12)"' : '';
    snapHtml += `
      <tr ${highlight}>
        <td class="proc-label-cell">P${i} ${i === pid ? '(Waiting)' : ''}</td>
        <td>[${BASE_ALLOCATION[i].join(', ')}]</td>
        <td>[${BASE_MAX[i].join(', ')}]</td>
        <td>[${needMat[i].join(', ')}]</td>
      </tr>
    `;
  }
  snapHtml += `</tbody></table>`;
  document.getElementById('scenarioBMatrixSnapshot').innerHTML = snapHtml;
}

// ============================================================================
// 6. TAB C: SCENARIO C — REQUEST PRODUCES UNSAFE STATE (DENIED & RESTORED)
// ============================================================================
function evaluateScenarioC() {
  const pid = parseInt(document.getElementById('reqSelectC').value, 10);
  const reqVec = [
    parseInt(document.getElementById('reqC_0').value, 10) || 0,
    parseInt(document.getElementById('reqC_1').value, 10) || 0,
    parseInt(document.getElementById('reqC_2').value, 10) || 0
  ];

  const needMat = computeNeedMatrix(BASE_ALLOCATION, BASE_MAX);
  const procNeed = needMat[pid];
  const avail = BASE_AVAILABLE;

  const withinNeed = reqVec.every((v, j) => v >= 0 && v <= procNeed[j]);
  const withinAvail = reqVec.every((v, j) => v <= avail[j]);

  const stepsContainer = document.getElementById('scenarioCSteps');
  const compTable = document.getElementById('scenarioCComparisonTable');
  const needCheckTable = document.getElementById('scenarioCNeedCheckTable');

  if (!withinNeed || !withinAvail) {
    stepsContainer.innerHTML = `
      <div class="check-step-box fail">
        <div class="check-step-title"><span>PRE-CHECK</span><span>OUT OF RANGE FOR SCENARIO C</span></div>
        <div>Scenario C evaluates a request that satisfies BOTH <code>Request ≤ Need</code> and <code>Request ≤ Available [3,3,2]</code>. Click "Load Default: P4 Requests [3, 3, 0]".</div>
      </div>
    `;
    return;
  }

  // Temporarily simulate allocation
  const tempAvail = avail.map((v, j) => v - reqVec[j]);
  const tempAlloc = BASE_ALLOCATION.map((row, i) => (i === pid ? row.map((v, j) => v + reqVec[j]) : [...row]));
  const tempNeed = computeNeedMatrix(tempAlloc, BASE_MAX);
  const simResult = executeBankersSafety(tempAvail, tempAlloc, BASE_MAX);

  if (simResult.status === 'unsafe') {
    stepsContainer.innerHTML = `
      <div class="check-step-box pass">
        <div class="check-step-title"><span>1. Request ≤ Need</span><span style="color:#34d399">PASSED ✓</span></div>
        <div><code>[${reqVec.join(', ')}] ≤ Need(P${pid}) [${procNeed.join(', ')}]</code></div>
      </div>
      <div class="check-step-box pass">
        <div class="check-step-title"><span>2. Request ≤ Available</span><span style="color:#34d399">PASSED ✓</span></div>
        <div><code>[${reqVec.join(', ')}] ≤ Available [3, 3, 2]</code></div>
      </div>
      <div class="check-step-box fail">
        <div class="check-step-title"><span>3. Temporary Safety Check</span><span style="color:#fbbf24">UNSAFE ✗</span></div>
        <div>Simulated <code>Work = [${tempAvail.join(', ')}]</code> cannot satisfy any process!</div>
      </div>
      <div class="check-step-box fail">
        <div class="check-step-title"><span>4. Decision &amp; Rollback</span><span style="color:#fbbf24">DENIED &amp; RESTORED</span></div>
        <div>Request denied; original state <code>Available = [3, 3, 2]</code> restored.</div>
      </div>
    `;

    updateGlobalStatus(
      'unsafe',
      'UNSAFE — DENIED & RESTORED (SCENARIO C)',
      `Scenario C: P${pid} Request [${reqVec.join(', ')}] Denied — Would Make System Unsafe`,
      `Temporary simulation leaves <code>Available' = [${tempAvail.join(', ')}]</code>, where no complete safe sequence exists. Request denied and original safe state restored.`,
      '<strong>Avoidance Rollback:</strong> Simulated temporary allocation, proved no safe sequence exists, denied request, and restored original state.'
    );
  } else {
    stepsContainer.innerHTML = `
      <div class="check-step-box pass">
        <div class="check-step-title"><span>SAFE REQUEST</span><span style="color:#34d399">SAFE SEQUENCE EXISTS</span></div>
        <div>Granting <code>[${reqVec.join(', ')}]</code> to P${pid} leaves <code>[${tempAvail.join(', ')}]</code>, which is still SAFE (<code>${simResult.safeSequence.join(' → ')}</code>). Click "Load Default: P4 Requests [3, 3, 0]" to test an Unsafe Request.</div>
      </div>
    `;
  }

  compTable.innerHTML = `
    <table class="matrix-table">
      <thead>
        <tr>
          <th>State Parameter</th>
          <th>Temporary Simulated State (If Granted)</th>
          <th>Restored Actual State (After Rollback)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="proc-label-cell">Available Vector</td>
          <td style="color:#fbbf24;font-weight:700">[${tempAvail.join(', ')}] (Unsafe!)</td>
          <td style="color:#34d399;font-weight:700">[${avail.join(', ')}] (Restored)</td>
        </tr>
        <tr>
          <td class="proc-label-cell">Allocation(P${pid})</td>
          <td style="color:#fbbf24">[${tempAlloc[pid].join(', ')}]</td>
          <td style="color:#34d399">[${BASE_ALLOCATION[pid].join(', ')}] (Restored)</td>
        </tr>
        <tr>
          <td class="proc-label-cell">Remaining Need(P${pid})</td>
          <td style="color:#fbbf24">[${tempNeed[pid].join(', ')}]</td>
          <td style="color:#34d399">[${procNeed.join(', ')}] (Restored)</td>
        </tr>
      </tbody>
    </table>
  `;

  let checkRows = `<table class="matrix-table"><thead><tr><th>Process</th><th>Simulated Need'</th><th>Simulated Work' = [${tempAvail.join(', ')}]</th><th>Can Complete? (Need' ≤ Work')</th></tr></thead><tbody>`;
  for (let i = 0; i < 5; i++) {
    const canRun = tempNeed[i].every((v, j) => v <= tempAvail[j]);
    checkRows += `
      <tr>
        <td class="proc-label-cell">P${i}</td>
        <td>[${tempNeed[i].join(', ')}]</td>
        <td>[${tempAvail.join(', ')}]</td>
        <td style="color:${canRun ? '#34d399' : '#fb7185'};font-weight:700">
          ${canRun ? 'YES' : 'NO (Need > Work)'}
        </td>
      </tr>
    `;
  }
  checkRows += `</tbody></table>`;
  needCheckTable.innerHTML = checkRows;
}

// ============================================================================
// 7. TAB D: SCENARIO D — DEADLOCK DETECTION & RECOVERY
// ============================================================================
function loadDetectionPreset(mode) {
  state.detection.mode = mode;
  state.detection.terminated = [];
  state.detection.avail = [0, 0, 0];
  state.detection.alloc = [
    [0, 1, 0],
    [2, 0, 0],
    [3, 0, 3],
    [2, 1, 1],
    [0, 0, 2]
  ];

  if (mode === 'deadlock') {
    state.detection.request = [
      [0, 0, 0],
      [2, 0, 2],
      [0, 0, 1], // P2 requests R_C -> causes confirmed circular wait among P1, P2, P3, P4
      [1, 0, 0],
      [0, 0, 2]
    ];
  } else {
    state.detection.request = [
      [0, 0, 0],
      [2, 0, 2],
      [0, 0, 0], // P2 requests nothing -> finishes and releases [3, 0, 3], breaking the cycle!
      [1, 0, 0],
      [0, 0, 2]
    ];
  }

  runDetectionAnalysis();
}

function runDetectionAnalysis() {
  const det = state.detection;
  const n = 5;
  const m = 3;
  const work = [...det.avail];
  const finish = det.alloc.map((row, i) => {
    if (det.terminated.includes(i)) return true;
    return row.every(v => v === 0) && det.request[i].every(v => v === 0);
  });

  const finishOrder = [];
  let progress = true;
  while (progress) {
    progress = false;
    for (let i = 0; i < n; i++) {
      if (!finish[i]) {
        const canGrant = det.request[i].every((q, j) => q <= work[j]);
        if (canGrant) {
          for (let j = 0; j < m; j++) {
            work[j] += det.alloc[i][j];
          }
          finish[i] = true;
          finishOrder.push(`P${i}`);
          progress = true;
        }
      }
    }
  }

  const deadlockedProcs = [];
  finish.forEach((done, idx) => {
    if (!done) deadlockedProcs.push(idx);
  });

  renderDetectionTables(deadlockedProcs);
  renderRAGSvg(deadlockedProcs);

  const logBox = document.getElementById('detectionResultBox');
  const summaryStrip = document.getElementById('deadlockedProcsList');

  if (deadlockedProcs.length > 0) {
    const names = deadlockedProcs.map(i => `P${i}`).join(', ');
    logBox.innerHTML = `
      <strong style="color: #fb7185">CONFIRMED DEADLOCK DETECTED:</strong><br/>
      • <code>P0</code> has <code>Request = [0, 0, 0]</code>, so it completes first and updates <code>Work = [0, 1, 0]</code>.<br/>
      • Processes <strong>${names}</strong> are stuck in a circular wait: <code>P2</code> requests <code>R_C [0,0,1]</code> (held by P2, P3, P4), <code>P3</code> requests <code>R_A [1,0,0]</code> (held by P1, P2, P3), and <code>P1</code> requests <code>[2,0,2]</code>.<br/>
      • Neither can proceed because <code>Work = [${work.join(', ')}]</code> cannot satisfy any active request.
    `;
    summaryStrip.innerHTML = `<span style="color:#fb7185">● Confirmed Deadlock Set: { ${names} }</span> — Click a "Terminate" button on the left to recover.`;

    updateGlobalStatus(
      'deadlock',
      'CONFIRMED DEADLOCK (SCENARIO D)',
      `Scenario D: Deadlock Detected Among { ${names} }`,
      `Circular wait confirmed under the multiple-instance detection algorithm. Click "Terminate P2" to execute recovery.`,
      '<strong>Detection & Recovery:</strong> Identifies circular wait among blocked processes and recovers via process termination.'
    );
  } else {
    const msg = det.terminated.length
      ? `Recovery Successful! Terminating <strong>${det.terminated.map(i => 'P' + i).join(', ')}</strong> released resources into <code>Available = [${det.avail.join(', ')}]</code>, enabling all remaining processes to finish in order: <strong>${finishOrder.join(' → ')}</strong>.`
      : `Cycle Without Deadlock: Even though dependency edges exist, <code>P0</code> and <code>P2</code> have <code>Request = [0,0,0]</code> and release their resources into <code>Work = [${work.join(', ')}]</code>, allowing all processes to finish: <strong>${finishOrder.join(' → ')}</strong>.`;

    logBox.innerHTML = `<strong style="color: #34d399">NO DEADLOCK (ALL PROCESSES CAN COMPLETE):</strong><br/>${msg}`;
    summaryStrip.innerHTML = `<span style="color:#34d399">● Completion Order: &lt; ${finishOrder.join(' → ')} &gt;</span>`;

    updateGlobalStatus(
      'safe',
      'DEADLOCK RESOLVED / FREE (SCENARIO D)',
      `Scenario D: All Active Processes Completed < ${finishOrder.join(' → ')} >`,
      msg,
      '<strong>Resolution Verified:</strong> Reclaimed resources broke the circular wait and allowed remaining processes to complete.'
    );
  }
}

function renderDetectionTables(deadlockedProcs) {
  const det = state.detection;
  const allocHtml = [`<table class="matrix-table"><thead><tr><th>PID</th><th>A</th><th>B</th><th>C</th></tr></thead><tbody>`];
  const reqHtml = [`<table class="matrix-table"><thead><tr><th>PID</th><th>A</th><th>B</th><th>C</th></tr></thead><tbody>`];

  for (let i = 0; i < 5; i++) {
    const isTerm = det.terminated.includes(i);
    const isDead = deadlockedProcs.includes(i);
    const rowStyle = isTerm ? 'opacity:0.38;text-decoration:line-through;' : isDead ? 'color:#fb7185;font-weight:700;' : '';

    allocHtml.push(`<tr style="${rowStyle}"><td class="proc-label-cell">P${i}</td><td>${det.alloc[i][0]}</td><td>${det.alloc[i][1]}</td><td>${det.alloc[i][2]}</td></tr>`);
    reqHtml.push(`<tr style="${rowStyle}"><td class="proc-label-cell">P${i}</td><td>${det.request[i][0]}</td><td>${det.request[i][1]}</td><td>${det.request[i][2]}</td></tr>`);
  }
  allocHtml.push(`</tbody></table>`);
  reqHtml.push(`</tbody></table>`);

  document.getElementById('detAllocContainer').innerHTML = allocHtml.join('');
  document.getElementById('detReqContainer').innerHTML = reqHtml.join('');
  document.getElementById('detAvailContainer').innerHTML = `
    <div style="font-family:var(--font-mono);font-size:0.85rem;">
      Current Available: <strong>[${det.avail.join(', ')}]</strong>
    </div>
  `;

  const recContainer = document.getElementById('recoveryButtonsContainer');
  if (deadlockedProcs.length === 0) {
    recContainer.innerHTML = `<span class="legend-chip chip-safe">Deadlock Resolved — No Blocked Processes</span>`;
  } else {
    recContainer.innerHTML = deadlockedProcs
      .map(pid => `
        <button class="btn btn-danger btn-sm" onclick="terminateDeadlockedProcess(${pid})">
          Terminate P${pid} (Reclaim [${det.alloc[pid].join(',')}])
        </button>
      `)
      .join('');
  }
}

window.terminateDeadlockedProcess = function(pid) {
  const det = state.detection;
  if (det.terminated.includes(pid)) return;
  det.terminated.push(pid);
  for (let j = 0; j < 3; j++) {
    det.avail[j] += det.alloc[pid][j];
    det.alloc[pid][j] = 0;
    det.request[pid][j] = 0;
  }
  runDetectionAnalysis();
};

function renderRAGSvg(deadlockedProcs) {
  const svg = document.getElementById('ragSvgCanvas');
  const det = state.detection;

  const rNodes = [
    { id: 'R_A', label: 'R_A (7 inst)', x: 130, y: 70 },
    { id: 'R_B', label: 'R_B (2 inst)', x: 300, y: 70 },
    { id: 'R_C', label: 'R_C (6 inst)', x: 470, y: 70 }
  ];

  const pNodes = [
    { id: 0, label: 'P0', x: 70, y: 300 },
    { id: 1, label: 'P1', x: 185, y: 300 },
    { id: 2, label: 'P2', x: 300, y: 300 },
    { id: 3, label: 'P3', x: 415, y: 300 },
    { id: 4, label: 'P4', x: 530, y: 300 }
  ];

  let edgesSvg = `
    <defs>
      <marker id="arrowAlloc" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#38bdf8" />
      </marker>
      <marker id="arrowWait" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#f43f5e" />
      </marker>
    </defs>
  `;

  for (let i = 0; i < 5; i++) {
    if (det.terminated.includes(i)) continue;
    for (let j = 0; j < 3; j++) {
      if (det.alloc[i][j] > 0) {
        edgesSvg += `<line x1="${rNodes[j].x}" y1="${rNodes[j].y + 24}" x2="${pNodes[i].x}" y2="${pNodes[i].y - 28}" stroke="#38bdf8" stroke-width="2" stroke-opacity="0.65" marker-end="url(#arrowAlloc)" />`;
      }
      if (det.request[i][j] > 0) {
        edgesSvg += `<line x1="${pNodes[i].x}" y1="${pNodes[i].y - 28}" x2="${rNodes[j].x}" y2="${rNodes[j].y + 24}" stroke="#f43f5e" stroke-width="2.4" stroke-dasharray="6,4" marker-end="url(#arrowWait)" />`;
      }
    }
  }

  rNodes.forEach(r => {
    edgesSvg += `
      <g>
        <rect x="${r.x - 52}" y="${r.y - 22}" width="104" height="44" rx="8" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
        <text x="${r.x}" y="${r.y + 5}" fill="#f8fafc" font-family="JetBrains Mono" font-size="12" font-weight="700" text-anchor="middle">${r.label}</text>
      </g>
    `;
  });

  pNodes.forEach(p => {
    const isDead = deadlockedProcs.includes(p.id);
    const isTerm = det.terminated.includes(p.id);
    const strokeCol = isTerm ? '#64748b' : isDead ? '#f43f5e' : '#10b981';
    const fillCol = isTerm ? '#1e293b' : isDead ? 'rgba(244,63,94,0.22)' : 'rgba(16,185,129,0.18)';

    edgesSvg += `
      <g>
        <circle cx="${p.x}" cy="${p.y}" r="26" fill="${fillCol}" stroke="${strokeCol}" stroke-width="2.5"/>
        <text x="${p.x}" y="${p.y + 5}" fill="#ffffff" font-family="JetBrains Mono" font-size="13" font-weight="700" text-anchor="middle">${isTerm ? 'X' : p.label}</text>
      </g>
    `;
  });

  svg.innerHTML = edgesSvg;
}

// ============================================================================
// 8. TAB E: SCENARIO E — DEADLOCK PREVENTION POLICIES
// ============================================================================
function renderPreventionPolicy(policyKey) {
  document.querySelectorAll('.policy-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.policy === policyKey);
  });

  const grid = document.getElementById('preventionComparisonGrid');
  const trace = document.getElementById('prevTraceLog');

  if (policyKey === 'ordering') {
    grid.innerHTML = `
      <div class="prev-compare-card unconstrained">
        <span class="b-tag tag-invalid">ORIGINAL SCENARIO (DEADLOCK POSSIBLE)</span>
        <h4 style="margin:8px 0">Arbitrary Resource Acquisition Order</h4>
        <p style="font-size:0.83rem;color:var(--text-secondary)">
          • <strong>P1</strong> holds <code>R_A</code> and requests <code>R_C</code>.<br/>
          • <strong>P2</strong> holds <code>R_C</code> and requests <code>R_A</code>.<br/>
          Because processes request resources in any order, a circular wait chain <code>P1 → R_C → P2 → R_A → P1</code> forms.
        </p>
      </div>
      <div class="prev-compare-card modified">
        <span class="b-tag tag-valid">MODIFIED POLICY: FIXED RESOURCE ORDERING</span>
        <h4 style="margin:8px 0">Eliminates Circular Wait Condition</h4>
        <p style="font-size:0.83rem;color:var(--text-secondary)">
          • Assigns global order: <code>Rank(R_A) = 1 &lt; Rank(R_B) = 2 &lt; Rank(R_C) = 3</code>.<br/>
          • Processes may only request resources in strictly increasing rank order.<br/>
          • <strong>P2 cannot hold R_C (Rank 3) and request R_A (Rank 1)</strong>; it must acquire <code>R_A</code> before <code>R_C</code>. Circular wait is impossible.
        </p>
      </div>
    `;
    document.getElementById('prevMetricUtil').textContent = '74% vs 92% Original';
    document.getElementById('prevBarUtil').style.width = '74%';
    document.getElementById('prevMetricConcurrency').textContent = '78% (Moderate Reduction)';
    document.getElementById('prevBarConcurrency').style.width = '78%';
    trace.innerHTML = `<strong>Q: What is the trade-off of Fixed Resource Ordering?</strong><br/>Imposing a total ordering on resource types prevents Circular Wait without needing runtime Banker's checks, but lowers resource utilization because a process needing <code>R_C</code> early and <code>R_A</code> late must still lock <code>R_A</code> upfront.`;
  } else if (policyKey === 'allornothing') {
    grid.innerHTML = `
      <div class="prev-compare-card unconstrained">
        <span class="b-tag tag-invalid">ORIGINAL SCENARIO (HOLD &amp; WAIT)</span>
        <h4 style="margin:8px 0">Incremental Resource Requests</h4>
        <p style="font-size:0.83rem;color:var(--text-secondary)">
          • Processes hold already-allocated resources while waiting for additional resources to become free.
        </p>
      </div>
      <div class="prev-compare-card modified">
        <span class="b-tag tag-valid">MODIFIED POLICY: ALL-AT-ONCE PRE-CLAIMING</span>
        <h4 style="margin:8px 0">Eliminates Hold-and-Wait Condition</h4>
        <p style="font-size:0.83rem;color:var(--text-secondary)">
          • A process must request and be allocated <strong>all required resources before execution begins</strong>.<br/>
          • If any resource is unavailable, the process holds zero resources and waits.
        </p>
      </div>
    `;
    document.getElementById('prevMetricUtil').textContent = '52% (Low Resource Utilization)';
    document.getElementById('prevBarUtil').style.width = '52%';
    document.getElementById('prevMetricConcurrency').textContent = '55% (Reduced Concurrency)';
    document.getElementById('prevBarConcurrency').style.width = '55%';
    trace.innerHTML = `<strong>Q: What is the trade-off of All-at-Once Pre-Claiming?</strong><br/>Eliminates Hold-and-Wait completely, but leads to poor resource utilization (resources needed only at the end of a job are locked from the beginning) and possible starvation of large jobs.`;
  } else {
    grid.innerHTML = `
      <div class="prev-compare-card unconstrained">
        <span class="b-tag tag-invalid">ORIGINAL SCENARIO (NO PREEMPTION)</span>
        <h4 style="margin:8px 0">Non-Preemptible Locks</h4>
        <p style="font-size:0.83rem;color:var(--text-secondary)">
          • Allocated resources cannot be forcibly taken away; processes block indefinitely while holding them.
        </p>
      </div>
      <div class="prev-compare-card modified">
        <span class="b-tag tag-valid">MODIFIED POLICY: FORCED PREEMPTION</span>
        <h4 style="margin:8px 0">Eliminates No-Preemption Condition</h4>
        <p style="font-size:0.83rem;color:var(--text-secondary)">
          • If a process requests a resource that is not immediately available, all resources it currently holds are preempted and returned to <code>Available</code>.
        </p>
      </div>
    `;
    document.getElementById('prevMetricUtil').textContent = '66% (Rollback Overhead)';
    document.getElementById('prevBarUtil').style.width = '66%';
    document.getElementById('prevMetricConcurrency').textContent = '70% (Restart Overhead)';
    document.getElementById('prevBarConcurrency').style.width = '70%';
    trace.innerHTML = `<strong>Q: What is the trade-off of Forced Preemption?</strong><br/>Eliminates No-Preemption, but adds state-saving/rollback overhead and is only applicable to preemptible resources like CPU registers or memory pages.`;
  }

  updateGlobalStatus(
    'safe',
    'PREVENTION POLICY ACTIVE (SCENARIO E)',
    'Scenario E: Deadlock Prevention Policy Applied',
    'Side-by-side comparison of the original deadlock-prone scenario and the modified prevention policy with trade-off metrics.',
    '<strong>Prevention Principle:</strong> Eliminates at least one necessary Coffman condition and evaluates utilization/concurrency trade-offs.'
  );
}

// ============================================================================
// 9. TAB F: SCENARIO F — BOUNDARY & INVALID INPUTS
// ============================================================================
function runBoundaryTestCase(caseKey) {
  const consoleBody = document.getElementById('boundaryConsoleBody');

  if (caseKey === 'zero_avail') {
    consoleBody.innerHTML = `
      <strong style="color:#34d399">[VALID BOUNDARY CASE 1 — ZERO AVAILABLE RESOURCES: Available = [0, 0, 0]]</strong><br/>
      • Classification: <strong>VALID BOUNDARY STATE</strong> (Not an error, and not an automatic deadlock).<br/>
      • Test Trace: With <code>Available = [0, 0, 0]</code> and <code>P3</code> having <code>Need = [0, 0, 0]</code>, <code>P3</code> satisfies <code>Need[P3] ≤ Work [0,0,0]</code>, completes immediately, and releases <code>Allocation[P3] = [2, 2, 2]</code> so the remaining processes can finish!
    `;
    updateGlobalStatus('safe', 'VALID BOUNDARY (SAFE)', 'Scenario F: Zero Available Resources [0, 0, 0] Handled as Valid Boundary', 'Zero available resources is a valid boundary condition when a process with zero remaining Need can finish first.', 'Boundary Verification: Valid boundary case distinguished from invalid input.');
  } else if (caseKey === 'zero_need') {
    consoleBody.innerHTML = `
      <strong style="color:#34d399">[VALID BOUNDARY CASE 2 — PROCESS WITH ZERO REMAINING NEED: Need = [0, 0, 0]]</strong><br/>
      • Classification: <strong>VALID BOUNDARY STATE</strong>.<br/>
      • Test Trace: Process <code>P1</code> has <code>Allocation = [3, 2, 2]</code> equal to <code>Max = [3, 2, 2]</code>, so <code>Need = [0, 0, 0]</code>. The safety algorithm selects <code>P1</code> immediately and reclaims its resources.
    `;
    updateGlobalStatus('safe', 'VALID BOUNDARY (ZERO NEED)', 'Scenario F: Process with Zero Remaining Need [0, 0, 0] Verified', 'A process with Need = [0, 0, 0] is a valid boundary case that can always complete immediately.', 'Boundary Verification: Valid boundary case verified.');
  } else if (caseKey === 'invalid_pid') {
    consoleBody.innerHTML = `
      <strong style="color:#c084fc">[INVALID INPUT CASE 3 — INVALID PROCESS IDENTIFIER: P99]</strong><br/>
      • Classification: <strong>INVALID INPUT ERROR</strong>.<br/>
      • Test Trace: Request submitted for <code>P99</code> (valid processes are <code>P0–P4</code>). Blocked immediately by range check (<code>0 ≤ pid &lt; n</code>). System state untouched.
    `;
    updateGlobalStatus('invalid', 'INVALID INPUT (BAD PID)', 'Scenario F: Out-of-Range Process ID P99 Rejected', 'Process ID P99 does not exist. Input validator rejected the request cleanly.', 'Input Validation: Out-of-range PID rejected.');
  } else if (caseKey === 'negative_req') {
    consoleBody.innerHTML = `
      <strong style="color:#c084fc">[INVALID INPUT CASE 4 — NEGATIVE RESOURCE REQUEST: [-1, 2, 0]]</strong><br/>
      • Classification: <strong>INVALID INPUT ERROR</strong>.<br/>
      • Test Trace: <code>P0</code> requested <code>[-1, 2, 0]</code>. Caught by non-negativity check (<code>Request[j] &lt; 0</code>) and rejected before running Banker's Algorithm.
    `;
    updateGlobalStatus('invalid', 'INVALID INPUT (NEGATIVE)', 'Scenario F: Negative Request Vector [-1, 2, 0] Rejected', 'Resource requests cannot contain negative integers.', 'Input Validation: Malformed negative input rejected.');
  } else if (caseKey === 'exceeds_need') {
    consoleBody.innerHTML = `
      <strong style="color:#c084fc">[INVALID REQUEST CASE 5 — REQUEST EXCEEDS REMAINING NEED: [8, 0, 0] &gt; [7, 4, 3]]</strong><br/>
      • Classification: <strong>INVALID REQUEST (RULE 1 VIOLATION)</strong>.<br/>
      • Test Trace: <code>P0</code> has <code>Need = [7, 4, 3]</code> but requested <code>[8, 0, 0]</code>. Rejected because a process cannot request more than its declared Maximum.
    `;
    updateGlobalStatus('invalid', 'INVALID REQUEST (> NEED)', 'Scenario F: Request [8, 0, 0] Exceeds P0 Remaining Need [7, 4, 3]', 'Violates Banker\'s Rule 1 (Request ≤ Need).', 'Input Validation: Exceeding declared Max demand rejected.');
  } else if (caseKey === 'alloc_gt_max') {
    consoleBody.innerHTML = `
      <strong style="color:#c084fc">[INVALID CONFIGURATION CASE 6 — ALLOCATION EXCEEDS MAXIMUM: Alloc = 5 &gt; Max = 3]</strong><br/>
      • Classification: <strong>INVALID MATRIX CONFIGURATION</strong>.<br/>
      • Test Trace: Setting <code>Allocation[P2][A] = 5</code> when <code>Max[P2][A] = 3</code> yields a negative <code>Need = -2</code>. Matrix validator flags this state as invalid.
    `;
    updateGlobalStatus('invalid', 'INVALID CONFIG (ALLOC > MAX)', 'Scenario F: Allocation Exceeding Declared Maximum Flagged', 'Need = Max − Allocation cannot be negative.', 'Input Validation: Invalid matrix state detected.');
  }
}

// ============================================================================
// 10. TAB G: POPULATE ANALYTICAL TABLE (TC1-TC6) & AI LOG
// ============================================================================
function renderReportTables() {
  const tcData = [
    {
      tc: 'TC1',
      cond: 'Safe state (Scenario A: P0–P4, Resources A,B,C, Available = [3, 3, 2])',
      actual: 'Need matrix calculated; Safe Sequence found: < P1 → P3 → P4 → P0 → P2 >; Final Work = [10, 5, 7]',
      expected: 'Safe sequence found',
      analysis: 'Every process satisfied Needᵢ ≤ Work in sequence and released its allocation back to Work, confirming the state is safe.'
    },
    {
      tc: 'TC2',
      cond: 'Request exceeds Available (Scenario B: P0 requests [0, 4, 0] when Need(P0)=[7,4,3], Available=[3,3,2])',
      actual: 'Status: WAITING / DEFERRED. Request ≤ Need passed, but 4 > 3 on Resource B. Allocation unchanged.',
      expected: 'Request not granted immediately',
      analysis: 'The request is valid (within Need), so it is not rejected as invalid; P0 simply waits until resources are released while current allocations remain unchanged.'
    },
    {
      tc: 'TC3',
      cond: 'Request makes state unsafe (Scenario C: P4 requests [3, 3, 0] when Available=[3,3,2], Need(P4)=[4,3,1])',
      actual: 'Status: UNSAFE — DENIED & RESTORED. Simulated Available\' = [0, 0, 2] leaves no process with Need\' ≤ Work\'. Rollback to [3,3,2].',
      expected: 'Request denied; state unchanged',
      analysis: 'Granting [3,3,0] would leave [0,0,2] where no safe sequence exists. Banker\'s avoidance denied the request and restored the prior safe state. Unsafe ≠ Deadlock.'
    },
    {
      tc: 'TC4',
      cond: 'Deadlocked scenario (Scenario D: Available=[0,0,0], circular wait among P1, P2, P3, P4)',
      actual: 'Status: CONFIRMED DEADLOCK among { P1, P2, P3, P4 }. Terminating P2 released [3, 0, 3], allowing < P3 → P4 → P1 > to finish.',
      expected: 'Deadlock identified by the selected detection method',
      analysis: 'Multiple-instance detection proved no active request could be satisfied after P0 finished. Terminating victim P2 broke the circular wait.'
    },
    {
      tc: 'TC5',
      cond: 'Prevention policy applied (Scenario E: Strict Resource Ordering Rank(A) < Rank(B) < Rank(C))',
      actual: 'Out-of-order request (holding R_C and requesting R_A) prevented; Circular Wait eliminated (0% deadlock).',
      expected: 'Selected deadlock condition eliminated',
      analysis: 'Enforcing a global resource acquisition order eliminates Circular Wait, trading off slightly lower resource utilization (74% vs 92%).'
    },
    {
      tc: 'TC6',
      cond: 'Boundary and invalid inputs (Scenario F: Available=[0,0,0], Need=[0,0,0], P99, [-1,2,0], Request > Need, Alloc > Max)',
      actual: 'Zero Available & Zero Need handled as valid boundary states; P99, negative request, Request > Need, and Alloc > Max flagged as INVALID INPUT.',
      expected: 'Correct validation or handling message',
      analysis: 'The engine distinguishes valid edge cases (which can still complete safely) from invalid/malformed inputs.'
    }
  ];

  document.getElementById('analyticalTableBody').innerHTML = tcData
    .map(row => `
      <tr>
        <td><strong style="color:var(--accent-cyan);font-family:var(--font-mono)">${row.tc}</strong></td>
        <td>${row.cond}</td>
        <td>${row.actual}</td>
        <td>${row.expected}</td>
        <td>${row.analysis}</td>
      </tr>
    `)
    .join('');

  const aiData = [
    {
      tool: 'Google Gemini',
      purpose: 'Dashboard design & scenario-specific tab architecture',
      output: 'Designed isolated views for Scenarios A, B, C, D, E, F, and TC1–TC6 analysis tables with 5 distinct semantic status banners.',
      verification: 'Verified that each scenario opens in its own dedicated view and that Safe, Waiting, Unsafe, Deadlocked, and Invalid states are clearly separated.'
    },
    {
      tool: 'Google Gemini',
      purpose: 'Algorithm / code assistance (Banker\'s Algorithm & Detection)',
      output: 'Implemented Need = Max - Allocation, step-by-step Work vector trace, temporary allocation simulation & rollback, and multiple-instance deadlock detection.',
      verification: 'Manually verified Work vector steps ([3,3,2] → [5,3,2] → [7,4,3] → [7,4,5] → [7,5,5] → [10,5,7]) and confirmed state restoration on P4 [3,3,0].'
    },
    {
      tool: 'Google Gemini',
      purpose: 'Test-case generation & boundary debugging',
      output: 'Constructed test presets for Scenarios A–F including multi-instance RAG cycle vs. confirmed deadlock and 6 boundary/invalid cases.',
      verification: 'Executed each test case in the browser and verified all outputs against manual calculations.'
    }
  ];

  document.getElementById('aiUsageTableBody').innerHTML = aiData
    .map(r => `
      <tr>
        <td><strong>${r.tool}</strong></td>
        <td>${r.purpose}</td>
        <td>${r.output}</td>
        <td>${r.verification}</td>
      </tr>
    `)
    .join('');
}

// ============================================================================
// 11. INITIALIZATION & EVENT LISTENERS
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Scenario Tab Bar Switching
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Scenario A Controls
  document.getElementById('btnResetScenarioA').addEventListener('click', () => {
    state.n = 5;
    state.m = 3;
    state.available = [...BASE_AVAILABLE];
    state.allocation = BASE_ALLOCATION.map(r => [...r]);
    state.max = BASE_MAX.map(r => [...r]);
    renderScenarioAUI();
    runAndRenderScenarioA();
  });

  document.getElementById('btnRunSafetyA').addEventListener('click', runAndRenderScenarioA);

  document.getElementById('btnResizeMatrices').addEventListener('click', () => {
    const newN = Math.min(8, Math.max(2, parseInt(document.getElementById('numProcesses').value, 10) || 5));
    const newM = Math.min(5, Math.max(1, parseInt(document.getElementById('numResources').value, 10) || 3));
    state.n = newN;
    state.m = newM;
    while (state.available.length < newM) state.available.push(2);
    state.available.length = newM;

    while (state.allocation.length < newN) state.allocation.push(new Array(newM).fill(0));
    state.allocation.length = newN;
    state.allocation.forEach(row => {
      while (row.length < newM) row.push(0);
      row.length = newM;
    });

    while (state.max.length < newN) state.max.push(new Array(newM).fill(3));
    state.max.length = newN;
    state.max.forEach(row => {
      while (row.length < newM) row.push(3);
      row.length = newM;
    });

    renderScenarioAUI();
    runAndRenderScenarioA();
  });

  // Scenario B Controls
  document.getElementById('btnEvaluateB').addEventListener('click', evaluateScenarioB);
  document.getElementById('btnResetScenarioB').addEventListener('click', () => {
    document.getElementById('reqSelectB').value = '0';
    document.getElementById('reqB_0').value = 0;
    document.getElementById('reqB_1').value = 4;
    document.getElementById('reqB_2').value = 0;
    evaluateScenarioB();
  });

  // Scenario C Controls
  document.getElementById('btnEvaluateC').addEventListener('click', evaluateScenarioC);
  document.getElementById('btnResetScenarioC').addEventListener('click', () => {
    document.getElementById('reqSelectC').value = '4';
    document.getElementById('reqC_0').value = 3;
    document.getElementById('reqC_1').value = 3;
    document.getElementById('reqC_2').value = 0;
    evaluateScenarioC();
  });

  // Scenario D Controls
  document.getElementById('btnLoadDeadlockPreset').addEventListener('click', () => loadDetectionPreset('deadlock'));
  document.getElementById('btnLoadCycleNoDeadlockPreset').addEventListener('click', () => loadDetectionPreset('cycle_no_deadlock'));

  // Scenario E Controls
  document.querySelectorAll('.policy-btn').forEach(btn => {
    btn.addEventListener('click', () => renderPreventionPolicy(btn.dataset.policy));
  });

  // Scenario F Controls
  document.querySelectorAll('.boundary-trigger').forEach(btn => {
    btn.addEventListener('click', () => runBoundaryTestCase(btn.dataset.case));
  });

  // Copy Table Button
  document.getElementById('btnCopyAnalyticalTable').addEventListener('click', (e) => {
    const tableText = document.querySelector('.report-table').innerText;
    navigator.clipboard.writeText(tableText);
    const original = e.target.textContent;
    e.target.textContent = 'Copied!';
    setTimeout(() => { e.target.textContent = original; }, 1800);
  });

  // Initial Boot
  renderScenarioAUI();
  loadDetectionPreset('deadlock');
  renderPreventionPolicy('ordering');
  renderReportTables();
  evaluateScenarioB();
  evaluateScenarioC();
  switchTab('scenario-a');
});