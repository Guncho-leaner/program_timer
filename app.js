/**
 * FLOWTIMER - APPLICATION LOGIC
 * Features: High-precision timing, Web Audio API sound synthesis, Light/Dark theme toggling,
 * LocalStorage state persistence, sequence manipulation, and accessible modal flow.
 */

// -------------------------------------------------------------
// 1. STATE & CONSTANTS
// -------------------------------------------------------------
const CONFIG = {
  maxTimers: 10,
  circleCircumference: 785.4, // 2 * PI * r (125)
  // Pastel color mapping for HSL variables
  colors: {
    coral: 'var(--col-coral)',
    orange: 'var(--col-orange)',
    yellow: 'var(--col-yellow)',
    sage: 'var(--col-sage)',
    teal: 'var(--col-teal)',
    sky: 'var(--col-sky)',
    purple: 'var(--col-purple)',
    pink: 'var(--col-pink)'
  }
};

// Global App State
let state = {
  timers: [],           // Array of timers: { id, name, minutes, seconds, totalSeconds, color }
  currentIndex: 0,      // Index of currently active timer
  status: 'idle',       // 'idle' | 'running' | 'paused' | 'finished'
  timeLeft: 0,          // Remaning seconds (float for accuracy)
  originalTimeLeft: 0,  // Stored time at start of this count session
  lastTickTimestamp: 0, // High-res time track
  rafHandle: null,      // requestAnimationFrame handle
  selectedColor: 'coral',
  volumeMuted: false,
  audioContext: null,   // Initialized lazily on first user interaction
  editingId: null       // Track which list item is currently in inline edit mode
};

let completionAlarmInterval = null; // Repeating alert handle

// -------------------------------------------------------------
// 2. WEB AUDIO API SYNTHESIZER (No external assets required!)
// -------------------------------------------------------------
function getAudioContext() {
  if (!state.audioContext) {
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume context if suspended (common browser restriction)
  if (state.audioContext.state === 'suspended') {
    state.audioContext.resume();
  }
  return state.audioContext;
}

/**
 * Plays a clear, pleasant double-buzzer tone for intermediary timer transitions.
 * Detuned dual triangle wave oscillators provide rich texture without a harsh popping sound.
 */
function playTransitionBeep() {
  if (state.volumeMuted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    function playDoubleBuzzer(pitch, start, duration) {
      // Osc 1 (triangle)
      const osc1 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(pitch, start);
      
      // Osc 2 (triangle detuned by +4Hz for pleasant richness)
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(pitch + 4, start);
      
      // Gain envelope
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.35, start + 0.015);
      gain.gain.setValueAtTime(0.35, start + duration - 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start(start);
      osc2.start(start);
      osc1.stop(start + duration);
      osc2.stop(start + duration);
    }
    
    // Play double buzz: first at now, second delayed by 0.20s
    playDoubleBuzzer(587.33, now, 0.14); // D5 note
    playDoubleBuzzer(587.33, now + 0.20, 0.22);
  } catch (e) {
    console.error('Audio synthesis failed:', e);
  }
}

/**
 * Plays a highly sophisticated, futuristic sci-fi chime when the entire program completes.
 * Uses an elegant F# Major 9th / F#sus2 chord arpeggio with three oscillators per note 
 * (pure sine + detuned tri chorus), an organic physical attack transient (pitch sweep),
 * a resonant lowpass filter, and a feedback delay loop for luxurious ambient echoes.
 */
function playCompletionChime() {
  if (state.volumeMuted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Create feedback delay line for a stunning, spacious trailing echo
    const delayNode = ctx.createDelay(1.0);
    delayNode.delayTime.setValueAtTime(0.22, now); // 220ms delay time
    
    const feedbackNode = ctx.createGain();
    feedbackNode.gain.setValueAtTime(0.32, now); // 32% feedback for 3-4 nice echoes
    
    // Connect feedback loop
    delayNode.connect(feedbackNode);
    feedbackNode.connect(delayNode);
    
    // Lowpass filter for warm, high-end, premium acoustic cabinet resonance
    const filterNode = ctx.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(1600, now);
    filterNode.Q.setValueAtTime(3.5, now);
    
    // Main chime volume node
    const mainVolume = ctx.createGain();
    mainVolume.gain.setValueAtTime(0.65, now);
    
    // Signal routing: Oscillators -> Filter -> MainVolume -> Destination
    // And also send from MainVolume to the Delay loop for wet effects
    filterNode.connect(mainVolume);
    mainVolume.connect(ctx.destination);
    
    mainVolume.connect(delayNode);
    delayNode.connect(ctx.destination);
    
    // F# Major 9 / F#sus2: Airy, futuristic, optimistic, and luxury brand quality
    // F#4 (369.99Hz), C#5 (554.37Hz), F#5 (739.99Hz), G#5 (830.61Hz), C#6 (1108.73Hz)
    const notes = [369.99, 554.37, 739.99, 830.61, 1108.73];
    const delays = [0, 0.06, 0.12, 0.18, 0.24];
    const durations = [0.8, 0.8, 0.8, 0.9, 1.0];
    
    notes.forEach((freq, i) => {
      const startTime = now + delays[i];
      const duration = durations[i];
      
      // Three sound sources per note for deep multi-timbral synthesis:
      // 1. Sine wave: Sweet, clean, pure fundamental tone
      const oscSine = ctx.createOscillator();
      oscSine.type = 'sine';
      oscSine.frequency.setValueAtTime(freq, startTime);
      
      // 2. Triangle Wave 1 (detuned -5 cents) for warm, wide chorusing
      const oscTri1 = ctx.createOscillator();
      oscTri1.type = 'triangle';
      oscTri1.frequency.setValueAtTime(freq, startTime);
      oscTri1.detune.setValueAtTime(-5, startTime);
      
      // 3. Triangle Wave 2 (detuned +5 cents) for wide analogue texture
      const oscTri2 = ctx.createOscillator();
      oscTri2.type = 'triangle';
      oscTri2.frequency.setValueAtTime(freq, startTime);
      oscTri2.detune.setValueAtTime(5, startTime);
      
      // Note envelope
      const noteGain = ctx.createGain();
      noteGain.gain.setValueAtTime(0, startTime);
      noteGain.gain.linearRampToValueAtTime(0.18, startTime + 0.015); // Fast attack
      noteGain.gain.setValueAtTime(0.18, startTime + 0.04);
      noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Smooth decay
      
      // Fast pitch slide (25ms) down from +2% pitch for beautiful acoustic "mallet strike" transient!
      oscSine.frequency.setValueAtTime(freq * 1.02, startTime);
      oscSine.frequency.exponentialRampToValueAtTime(freq, startTime + 0.025);
      
      oscTri1.frequency.setValueAtTime(freq * 1.02, startTime);
      oscTri1.frequency.exponentialRampToValueAtTime(freq, startTime + 0.025);
      
      oscTri2.frequency.setValueAtTime(freq * 1.02, startTime);
      oscTri2.frequency.exponentialRampToValueAtTime(freq, startTime + 0.025);
      
      // Connect components
      oscSine.connect(noteGain);
      oscTri1.connect(noteGain);
      oscTri2.connect(noteGain);
      noteGain.connect(filterNode);
      
      // Trigger oscillators
      oscSine.start(startTime);
      oscTri1.start(startTime);
      oscTri2.start(startTime);
      
      oscSine.stop(startTime + duration);
      oscTri1.stop(startTime + duration);
      oscTri2.stop(startTime + duration);
    });
  } catch (e) {
    console.error('Audio synthesis failed:', e);
  }
}

// -------------------------------------------------------------
// 3. CORE TIMER ENGINE (High-precision requestAnimationFrame)
// -------------------------------------------------------------
function startTimerLoop() {
  state.lastTickTimestamp = performance.now();
  
  function tick(timestamp) {
    if (state.status !== 'running') return;
    
    // Measure precise difference in milliseconds
    const elapsedMs = timestamp - state.lastTickTimestamp;
    state.lastTickTimestamp = timestamp;
    
    // Decrement time left accurately
    state.timeLeft -= (elapsedMs / 1000);
    
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      handleTimerComplete();
      return;
    }
    
    updateDisplay();
    state.rafHandle = requestAnimationFrame(tick);
  }
  
  state.rafHandle = requestAnimationFrame(tick);
}

function pauseTimerLoop() {
  if (state.rafHandle) {
    cancelAnimationFrame(state.rafHandle);
    state.rafHandle = null;
  }
}

/**
 * Handles completing the active timer card
 */
function handleTimerComplete() {
  pauseTimerLoop();
  
  const isLastTimer = state.currentIndex === state.timers.length - 1;
  
  if (isLastTimer) {
    // 1. Play grand completion chime
    playCompletionChime();
    
    // Start repeating chime alarm every 2.5 seconds until user handles interaction
    if (completionAlarmInterval) clearInterval(completionAlarmInterval);
    completionAlarmInterval = setInterval(() => {
      if (state.status === 'finished') {
        playCompletionChime();
      } else {
        stopCompletionAlarm();
      }
    }, 2500);
    
    // 2. Halt execution, change status to finished
    state.status = 'finished';
    state.timeLeft = 0;
    
    // 3. Pop Dialog modal triggering user actions
    const dialog = document.getElementById('completion-dialog');
    dialog.showModal();
    
    // Visual indicators
    updateDisplay();
  } else {
    // 1. Play shorter transition double-beep
    playTransitionBeep();
    
    // 2. Shift to next timer index
    state.currentIndex++;
    const nextTimer = state.timers[state.currentIndex];
    state.timeLeft = nextTimer.totalSeconds;
    state.originalTimeLeft = nextTimer.totalSeconds;
    
    // 3. Instantly fire and resume ticking
    state.status = 'running';
    startTimerLoop();
    updateDisplay();
  }
}

function stopCompletionAlarm() {
  if (completionAlarmInterval) {
    clearInterval(completionAlarmInterval);
    completionAlarmInterval = null;
  }
}

// -------------------------------------------------------------
// 4. DISPLAY & UI UPDATES
// -------------------------------------------------------------
function formatTime(secondsFloat) {
  const totalSeconds = Math.ceil(secondsFloat);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updateDisplay() {
  const countdownEl = document.getElementById('timer-countdown');
  const titleEl = document.getElementById('timer-title');
  const statusEl = document.getElementById('active-timer-status');
  const progressCircle = document.getElementById('progress-circle');
  const progressInfoEl = document.getElementById('program-progress-info');
  
  // UI Controls Elements
  const btnPlayPause = document.getElementById('ctrl-play-pause');
  const btnPrev = document.getElementById('ctrl-prev');
  const btnSkip = document.getElementById('ctrl-skip');
  const btnReset = document.getElementById('ctrl-reset');
  const btnClearAll = document.getElementById('btn-clear-all');
  
  if (state.timers.length === 0) {
    countdownEl.textContent = '00:00';
    titleEl.textContent = 'プログラムを設定してください';
    statusEl.textContent = '待機中';
    statusEl.style.borderColor = 'var(--border-color)';
    statusEl.style.color = 'var(--text-muted)';
    statusEl.style.background = 'var(--btn-secondary-bg)';
    progressInfoEl.textContent = 'タスク 0 / 0';
    
    progressCircle.style.strokeDashoffset = CONFIG.circleCircumference;
    progressCircle.style.stroke = 'var(--brand-accent)';
    
    btnPlayPause.disabled = true;
    btnPlayPause.innerHTML = '<svg class="icon-play" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    btnPrev.disabled = true;
    btnSkip.disabled = true;
    btnReset.disabled = true;
    if (btnClearAll) btnClearAll.disabled = true;
    renderSequenceList();
    return;
  }
  
  const currentTimer = state.timers[state.currentIndex];
  
  // Update texts
  countdownEl.textContent = formatTime(state.timeLeft);
  titleEl.textContent = currentTimer.name;
  progressInfoEl.textContent = `タスク ${state.currentIndex + 1} / ${state.timers.length}`;
  
  // Set Active visual accent colors
  const activeColorValue = CONFIG.colors[currentTimer.color];
  progressCircle.style.stroke = activeColorValue;
  
  // Calculate SVG circular stroke offset
  const ratio = state.timeLeft / state.originalTimeLeft;
  const offset = CONFIG.circleCircumference - (ratio * CONFIG.circleCircumference);
  progressCircle.style.strokeDashoffset = isNaN(offset) ? 0 : offset;
  
  // Status tag design
  statusEl.style.borderColor = activeColorValue;
  statusEl.style.color = activeColorValue;
  statusEl.style.background = `rgba(from ${activeColorValue} r g b / 0.08)`;
  
  if (state.status === 'running') {
    statusEl.textContent = '稼働中';
    btnPlayPause.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    btnPlayPause.classList.add('pulse');
  } else if (state.status === 'paused') {
    statusEl.textContent = '一時停止中';
    btnPlayPause.innerHTML = '<svg class="icon-play" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    btnPlayPause.classList.remove('pulse');
  } else if (state.status === 'finished') {
    statusEl.textContent = '全プログラム完了';
    btnPlayPause.innerHTML = '<svg class="icon-play" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    btnPlayPause.classList.remove('pulse');
  } else {
    statusEl.textContent = '待機中';
    btnPlayPause.innerHTML = '<svg class="icon-play" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    btnPlayPause.classList.remove('pulse');
  }
  
  // Disable / Enable control bar based on context
  btnPlayPause.disabled = (state.status === 'finished');
  btnPrev.disabled = (state.currentIndex === 0);
  btnSkip.disabled = (state.currentIndex === state.timers.length - 1);
  btnReset.disabled = false;
  if (btnClearAll) btnClearAll.disabled = (state.status === 'running');
  
  // Sync the sequence list DOM highlights
  renderSequenceList();
}

/**
 * Renders the HTML listing of all sequence items
 */
function renderSequenceList() {
  const listEl = document.getElementById('sequence-list');
  const emptyStateEl = document.getElementById('empty-state');
  const counterEl = document.getElementById('timer-counter');
  const btnAdd = document.getElementById('btn-add-timer');
  
  counterEl.textContent = `${state.timers.length} / ${CONFIG.maxTimers}`;
  
  if (state.timers.length === 0) {
    emptyStateEl.style.display = 'flex';
    listEl.style.display = 'none';
    btnAdd.disabled = false;
    listEl.innerHTML = '';
    return;
  }
  
  emptyStateEl.style.display = 'none';
  listEl.style.display = 'flex';
  
  // Enforce Max 10 limit rule
  btnAdd.disabled = state.timers.length >= CONFIG.maxTimers;
  
  const fragment = document.createDocumentFragment();
  
  state.timers.forEach((timer, idx) => {
    // If this timer is currently being edited inline
    if (timer.id === state.editingId) {
      const item = document.createElement('div');
      item.className = 'timer-item editing';
      item.style.setProperty('--tag-color', CONFIG.colors[timer.color]);
      
      // Inline Header
      const editHeader = document.createElement('div');
      editHeader.className = 'inline-edit-header';
      
      const editTitle = document.createElement('span');
      editTitle.className = 'inline-edit-title';
      editTitle.textContent = 'タイマーの編集';
      editHeader.appendChild(editTitle);
      item.appendChild(editHeader);
      
      // Inline Fields
      const editFields = document.createElement('div');
      editFields.className = 'inline-edit-fields';
      
      // Name Field
      const nameGroup = document.createElement('div');
      nameGroup.className = 'inline-edit-group';
      const nameLabel = document.createElement('label');
      nameLabel.textContent = '名前';
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'inline-edit-input inline-edit-name';
      nameInput.value = timer.name;
      nameInput.maxLength = 20;
      nameInput.required = true;
      nameInput.placeholder = '（例: ワークアウト）';
      nameGroup.appendChild(nameLabel);
      nameGroup.appendChild(nameInput);
      editFields.appendChild(nameGroup);
      
      // Time Fields (Minutes / Seconds)
      const timeGroup = document.createElement('div');
      timeGroup.className = 'inline-edit-group';
      const timeLabel = document.createElement('label');
      timeLabel.textContent = '時間';
      
      const timeInputs = document.createElement('div');
      timeInputs.className = 'inline-edit-time-inputs';
      
      const minWrapper = document.createElement('div');
      minWrapper.className = 'inline-edit-number-wrapper';
      const minInput = document.createElement('input');
      minInput.type = 'number';
      minInput.className = 'inline-edit-input';
      minInput.min = '0';
      minInput.max = '99';
      minInput.value = timer.minutes;
      minInput.required = true;
      const minUnit = document.createElement('span');
      minUnit.className = 'unit';
      minUnit.textContent = '分';
      minWrapper.appendChild(minInput);
      minWrapper.appendChild(minUnit);
      
      const secWrapper = document.createElement('div');
      secWrapper.className = 'inline-edit-number-wrapper';
      const secInput = document.createElement('input');
      secInput.type = 'number';
      secInput.className = 'inline-edit-input';
      secInput.min = '0';
      secInput.max = '59';
      secInput.step = '5';
      secInput.value = timer.seconds;
      secInput.required = true;
      const secUnit = document.createElement('span');
      secUnit.className = 'unit';
      secUnit.textContent = '秒';
      secWrapper.appendChild(secInput);
      secWrapper.appendChild(secUnit);
      
      timeInputs.appendChild(minWrapper);
      timeInputs.appendChild(secWrapper);
      timeGroup.appendChild(timeLabel);
      timeGroup.appendChild(timeInputs);
      editFields.appendChild(timeGroup);
      
      // Color picker
      const colorGroup = document.createElement('div');
      colorGroup.className = 'inline-edit-group';
      const colorLabel = document.createElement('label');
      colorLabel.textContent = 'テーマカラー';
      colorGroup.appendChild(colorLabel);
      
      const colorPicker = document.createElement('div');
      colorPicker.className = 'inline-edit-color-picker';
      
      let localSelectedColor = timer.color;
      
      Object.keys(CONFIG.colors).forEach(colorKey => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'inline-edit-color-dot';
        if (colorKey === localSelectedColor) {
          dot.classList.add('active');
        }
        dot.style.setProperty('--dot-color', CONFIG.colors[colorKey]);
        dot.ariaLabel = colorKey;
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          localSelectedColor = colorKey;
          colorPicker.querySelectorAll('.inline-edit-color-dot').forEach(d => d.classList.remove('active'));
          dot.classList.add('active');
          item.style.setProperty('--tag-color', CONFIG.colors[colorKey]);
        });
        colorPicker.appendChild(dot);
      });
      colorGroup.appendChild(colorPicker);
      editFields.appendChild(colorGroup);
      
      item.appendChild(editFields);
      
      // Inline Footer Buttons
      const editFooter = document.createElement('div');
      editFooter.className = 'inline-edit-footer';
      
      const btnCancel = document.createElement('button');
      btnCancel.type = 'button';
      btnCancel.className = 'inline-edit-btn cancel';
      btnCancel.textContent = 'キャンセル';
      btnCancel.addEventListener('click', (e) => {
        e.stopPropagation();
        cancelInlineEdit();
      });
      
      const btnSave = document.createElement('button');
      btnSave.type = 'button';
      btnSave.className = 'inline-edit-btn save';
      btnSave.textContent = '保存';
      btnSave.addEventListener('click', (e) => {
        e.stopPropagation();
        const name = nameInput.value.trim();
        const m = parseInt(minInput.value, 10) || 0;
        const s = parseInt(secInput.value, 10) || 0;
        
        if (!name) {
          alert('名前を入力してください。');
          return;
        }
        if (m * 60 + s <= 0) {
          alert('無効な時間です。分または秒に0より大きい数値を入力してください。');
          return;
        }
        
        saveInlineEdit(timer.id, name, m, s, localSelectedColor);
      });
      
      editFooter.appendChild(btnCancel);
      editFooter.appendChild(btnSave);
      item.appendChild(editFooter);
      
      fragment.appendChild(item);
      return;
    }

    const item = document.createElement('div');
    item.className = 'timer-item';
    if (idx === state.currentIndex && state.status !== 'idle' && state.status !== 'finished') {
      item.classList.add('active');
    }
    if (idx < state.currentIndex) {
      item.classList.add('completed');
    }
    
    item.style.setProperty('--tag-color', CONFIG.colors[timer.color]);
    
    // Details
    const tag = document.createElement('div');
    tag.className = 'timer-item-tag';
    
    const details = document.createElement('div');
    details.className = 'timer-item-details';
    
    const name = document.createElement('span');
    name.className = 'timer-item-name';
    name.textContent = timer.name;
    
    const duration = document.createElement('span');
    duration.className = 'timer-item-duration';
    duration.textContent = `${timer.minutes}分 ${timer.seconds}秒`;
    
    details.appendChild(name);
    details.appendChild(duration);
    
    // Reorder buttons (Move Up, Move Down) & Delete Button
    const actions = document.createElement('div');
    actions.className = 'timer-item-actions';
    
    // Move Up Button
    const btnUp = document.createElement('button');
    btnUp.className = 'timer-item-btn';
    btnUp.type = 'button';
    btnUp.disabled = (idx === 0 || state.status === 'running');
    btnUp.ariaLabel = '上に移動';
    btnUp.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>';
    btnUp.addEventListener('click', (e) => {
      e.stopPropagation();
      moveTimer(idx, idx - 1);
    });
    
    // Move Down Button
    const btnDown = document.createElement('button');
    btnDown.className = 'timer-item-btn';
    btnDown.type = 'button';
    btnDown.disabled = (idx === state.timers.length - 1 || state.status === 'running');
    btnDown.ariaLabel = '下に移動';
    btnDown.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
    btnDown.addEventListener('click', (e) => {
      e.stopPropagation();
      moveTimer(idx, idx + 1);
    });
    
    // Copy Button
    const btnCopy = document.createElement('button');
    btnCopy.className = 'timer-item-btn';
    btnCopy.type = 'button';
    btnCopy.disabled = (state.status === 'running');
    btnCopy.ariaLabel = 'コピー';
    btnCopy.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    btnCopy.addEventListener('click', (e) => {
      e.stopPropagation();
      duplicateTimer(idx);
    });

    // Edit Button (Pencil Icon)
    const btnEdit = document.createElement('button');
    btnEdit.className = 'timer-item-btn';
    btnEdit.type = 'button';
    btnEdit.disabled = (state.status === 'running');
    btnEdit.ariaLabel = '編集';
    btnEdit.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/></svg>';
    btnEdit.addEventListener('click', (e) => {
      e.stopPropagation();
      startEditTimer(timer.id);
    });
    
    // Delete Button
    const btnDelete = document.createElement('button');
    btnDelete.className = 'timer-item-btn danger-hover';
    btnDelete.type = 'button';
    btnDelete.disabled = (state.status === 'running');
    btnDelete.ariaLabel = '削除';
    btnDelete.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
    btnDelete.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTimer(idx);
    });
    
    actions.appendChild(btnUp);
    actions.appendChild(btnDown);
    actions.appendChild(btnCopy);
    actions.appendChild(btnEdit);
    actions.appendChild(btnDelete);
    
    item.appendChild(tag);
    item.appendChild(details);
    item.appendChild(actions);
    
    // Click item to jump directly to this timer when sequence is idle/paused
    item.addEventListener('click', () => {
      if (state.status === 'idle' || state.status === 'paused') {
        jumpToTimer(idx);
      }
    });
    
    fragment.appendChild(item);
  });
  
  listEl.innerHTML = '';
  listEl.appendChild(fragment);
}

// -------------------------------------------------------------
// 5. TIMER STATE MODIFIERS
// -------------------------------------------------------------
function startEditTimer(id) {
  state.editingId = id;
  updateDisplay();
}

function cancelInlineEdit() {
  state.editingId = null;
  updateDisplay();
}

function saveInlineEdit(id, newName, newMin, newSec, newColor) {
  const timerIndex = state.timers.findIndex(t => t.id === id);
  if (timerIndex === -1) return;
  
  const totalSeconds = (newMin * 60) + newSec;
  if (totalSeconds <= 0) return;
  
  const timer = state.timers[timerIndex];
  timer.name = newName;
  timer.minutes = newMin;
  timer.seconds = newSec;
  timer.totalSeconds = totalSeconds;
  timer.color = newColor;
  
  // If the edited timer is the active one, sync the countdown hero
  if (timerIndex === state.currentIndex) {
    state.timeLeft = totalSeconds;
    state.originalTimeLeft = totalSeconds;
    
    // Smooth scroll back to the active timer area on mobile screens
    if (window.innerWidth <= 768) {
      const timerSection = document.querySelector('.active-timer-section');
      if (timerSection) {
        timerSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }
  
  state.editingId = null;
  saveState();
  updateDisplay();
}

function addTimer(name, minutes, seconds, color) {
  if (state.timers.length >= CONFIG.maxTimers) return false;
  
  const totalSeconds = (minutes * 60) + seconds;
  if (totalSeconds <= 0) return false;
  
  const timer = {
    id: 'timer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    name,
    minutes,
    seconds,
    totalSeconds,
    color
  };
  
  state.timers.push(timer);
  saveState();
  
  // If first timer added, load it automatically to the hero countdown
  if (state.timers.length === 1) {
    jumpToTimer(0);
  } else {
    updateDisplay();
  }
  return true;
}

function duplicateTimer(index) {
  if (state.status === 'running') return;
  if (state.timers.length >= CONFIG.maxTimers) {
    alert(`タイマーは最大${CONFIG.maxTimers}個までしか追加できません。`);
    return;
  }
  const original = state.timers[index];
  const clone = {
    id: 'timer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    name: original.name + ' (コピー)',
    minutes: original.minutes,
    seconds: original.seconds,
    totalSeconds: original.totalSeconds,
    color: original.color
  };
  
  // Insert cloned timer directly below the duplicated item
  state.timers.splice(index + 1, 0, clone);
  
  // Adjust index if duplicating a timer before or at current active timer
  if (index < state.currentIndex) {
    state.currentIndex++;
  }
  
  saveState();
  updateDisplay();
}

function deleteTimer(index) {
  if (state.status === 'running') return;
  
  const deletedTimer = state.timers[index];
  if (deletedTimer && deletedTimer.id === state.editingId) {
    state.editingId = null;
  }
  
  state.timers.splice(index, 1);
  
  // If we deleted the current active timer or emptied the program, reset pointers
  if (state.timers.length === 0) {
    state.currentIndex = 0;
    state.timeLeft = 0;
    state.originalTimeLeft = 0;
    updateDisplay();
  } else if (state.currentIndex >= state.timers.length) {
    jumpToTimer(state.timers.length - 1);
  } else {
    // If we deleted a timer before the active one, shift active index down
    if (index < state.currentIndex) {
      state.currentIndex--;
    }
    jumpToTimer(state.currentIndex);
  }
  
  saveState();
}

function moveTimer(fromIndex, toIndex) {
  if (state.status === 'running') return;
  if (toIndex < 0 || toIndex >= state.timers.length) return;
  
  // Swap items in state array
  const temp = state.timers[fromIndex];
  state.timers[fromIndex] = state.timers[toIndex];
  state.timers[toIndex] = temp;
  
  // Keep focus on the same swapped timer
  if (state.currentIndex === fromIndex) {
    state.currentIndex = toIndex;
  } else if (state.currentIndex === toIndex) {
    state.currentIndex = fromIndex;
  }
  
  saveState();
  updateDisplay();
}

function jumpToTimer(index) {
  if (index < 0 || index >= state.timers.length) return;
  
  pauseTimerLoop();
  state.currentIndex = index;
  const current = state.timers[index];
  state.timeLeft = current.totalSeconds;
  state.originalTimeLeft = current.totalSeconds;
  
  // Keep play/pause status or reset to paused
  if (state.status === 'running') {
    startTimerLoop();
  } else {
    state.status = 'idle';
  }
  
  updateDisplay();
}

function togglePlayPause() {
  if (state.timers.length === 0) return;
  
  // Lazy initialize AudioContext on user action
  getAudioContext();
  
  if (state.status === 'running') {
    pauseTimerLoop();
    state.status = 'paused';
  } else {
    state.status = 'running';
    startTimerLoop();
  }
  
  updateDisplay();
}

function resetSequence() {
  stopCompletionAlarm();
  pauseTimerLoop();
  state.status = 'idle';
  state.currentIndex = 0;
  if (state.timers.length > 0) {
    state.timeLeft = state.timers[0].totalSeconds;
    state.originalTimeLeft = state.timers[0].totalSeconds;
  } else {
    state.timeLeft = 0;
    state.originalTimeLeft = 0;
  }
  updateDisplay();
}

function nextTimer() {
  if (state.currentIndex < state.timers.length - 1) {
    jumpToTimer(state.currentIndex + 1);
  }
}

function prevTimer() {
  if (state.currentIndex > 0) {
    jumpToTimer(state.currentIndex - 1);
  }
}

function clearAllTimers() {
  if (state.status === 'running') return;
  if (confirm('すべてのタイマーを消去してよろしいですか？')) {
    state.editingId = null;
    state.timers = [];
    resetSequence();
    saveState();
  }
}

// -------------------------------------------------------------
// 6. PERSISTENCE & THEME
// -------------------------------------------------------------
function saveState() {
  localStorage.setItem('flowtimer_sequence', JSON.stringify(state.timers));
}

function loadState() {
  // Load saved sequence program
  const savedSeq = localStorage.getItem('flowtimer_sequence');
  if (savedSeq) {
    try {
      state.timers = JSON.parse(savedSeq);
    } catch (e) {
      state.timers = [];
    }
  }
  
  // Load audio settings
  const savedMuted = localStorage.getItem('flowtimer_muted');
  if (savedMuted !== null) {
    state.volumeMuted = savedMuted === 'true';
    updateVolumeIcon();
  }
  
  // Load saved theme
  const savedTheme = localStorage.getItem('flowtimer_theme') || 'dark'; // Dark theme default for stunning look
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  resetSequence();
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', nextTheme);
  localStorage.setItem('flowtimer_theme', nextTheme);
}

function toggleVolume() {
  state.volumeMuted = !state.volumeMuted;
  localStorage.setItem('flowtimer_muted', state.volumeMuted);
  updateVolumeIcon();
}

function updateVolumeIcon() {
  const volumeBtn = document.getElementById('volume-toggle');
  if (state.volumeMuted) {
    volumeBtn.innerHTML = `
      <svg class="icon-volume-muted" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <line x1="23" y1="9" x2="17" y2="15"/>
        <line x1="17" y1="9" x2="23" y2="15"/>
      </svg>
    `;
    volumeBtn.setAttribute('aria-label', '音声をオンにする');
  } else {
    volumeBtn.innerHTML = `
      <svg class="icon-volume" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
      </svg>
    `;
    volumeBtn.setAttribute('aria-label', '音声をミュートにする');
  }
}

// -------------------------------------------------------------
// 7. EVENT LISTENERS & SETUP
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Load State
  loadState();
  
  // Element selectors
  const addTimerForm = document.getElementById('add-timer-form');
  const inputName = document.getElementById('input-name');
  const inputMinutes = document.getElementById('input-minutes');
  const inputSeconds = document.getElementById('input-seconds');
  const colorPicker = document.getElementById('color-picker');
  
  // Controller elements
  const btnPlayPause = document.getElementById('ctrl-play-pause');
  const btnPrev = document.getElementById('ctrl-prev');
  const btnSkip = document.getElementById('ctrl-skip');
  const btnReset = document.getElementById('ctrl-reset');
  const btnClearAll = document.getElementById('btn-clear-all');
  const btnThemeToggle = document.getElementById('theme-toggle');
  const btnVolumeToggle = document.getElementById('volume-toggle');
  
  // Dialog elements
  const completionDialog = document.getElementById('completion-dialog');
  const dialogBtnRepeat = document.getElementById('dialog-btn-repeat');
  const dialogBtnStop = document.getElementById('dialog-btn-stop');
  
  // A. Color Picker selector logic
  colorPicker.addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList.contains('color-dot')) {
      // Remove active from all dots
      colorPicker.querySelectorAll('.color-dot').forEach(dot => dot.classList.remove('active'));
      target.classList.add('active');
      state.selectedColor = target.getAttribute('data-color');
    }
  });
  
  // B. Add Timer Form Submission
  addTimerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Lazy activate audio context to ensure first click works
    getAudioContext();
    
    const name = inputName.value.trim();
    const min = parseInt(inputMinutes.value, 10) || 0;
    const sec = parseInt(inputSeconds.value, 10) || 0;
    
    if (addTimer(name, min, sec, state.selectedColor)) {
      // Reset form controls except numbers presets
      inputName.value = '';
      inputName.focus();
      
      // Smooth scroll back to the active timer area on mobile screens
      if (window.innerWidth <= 768) {
        const timerSection = document.querySelector('.active-timer-section');
        if (timerSection) {
          timerSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } else {
      alert('無効な時間です。分または秒に0より大きい数値を入力してください。');
    }
  });
  
  // C. Main Control Actions
  btnPlayPause.addEventListener('click', togglePlayPause);
  btnPrev.addEventListener('click', prevTimer);
  btnSkip.addEventListener('click', nextTimer);
  btnReset.addEventListener('click', resetSequence);
  btnClearAll.addEventListener('click', clearAllTimers);
  btnThemeToggle.addEventListener('click', toggleTheme);
  btnVolumeToggle.addEventListener('click', toggleVolume);
  
  // D. Completion Modal Control logic
  dialogBtnRepeat.addEventListener('click', () => {
    completionDialog.close();
    resetSequence();
    togglePlayPause(); // Start playing sequence automatically
  });
  
  dialogBtnStop.addEventListener('click', () => {
    completionDialog.close();
    resetSequence();
  });
  
  // E. Modern Dialog Light-dismiss (Outside click fallback) for Safari
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    completionDialog.addEventListener('click', (event) => {
      if (event.target !== completionDialog) return;
      
      const rect = completionDialog.getBoundingClientRect();
      const isInside = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      
      if (!isInside) {
        completionDialog.close();
        resetSequence();
      }
    });
  }
  
  // F. Audio Context setup on generic interaction
  document.body.addEventListener('click', () => {
    if (state.timers.length > 0) {
      getAudioContext();
    }
  }, { once: true });

  // G. Mobile Tabs Toggle logic
  const mobileTabs = document.getElementById('mobile-tabs');
  const appMain = document.querySelector('.app-main');
  
  if (mobileTabs && appMain) {
    mobileTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      
      // Update tab button active class
      mobileTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update main panel class
      const tab = btn.getAttribute('data-tab');
      if (tab === 'timer') {
        appMain.classList.remove('show-sequence');
        appMain.classList.add('show-timer');
      } else if (tab === 'sequence') {
        appMain.classList.remove('show-timer');
        appMain.classList.add('show-sequence');
      }
    });
  }
});
