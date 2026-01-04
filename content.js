// content.js
// Main content script: toolbar, picker, selector generation, storage, observer

const DEBUG = true;
const STORAGE_KEY = 'rulesByHost';

function log(...args) {
  if (DEBUG) console.log('[Live Redactor]', ...args);
}

// ============================================================================
// STATE
// ============================================================================
let state = {
  pickMode: false,
  currentHighlight: null,
  selectedElements: [], // Elements queued for blurring
  rules: [], // Rules for current host
  observer: null,
  toolbar: null,
  styleEl: null,
  toolbarMinimized: false
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function showToast(message) {
  // Create toast notification
  const toast = document.createElement('div');
  toast.className = 'lr-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('lr-toast-show'), 10);
  
  // Remove after 2 seconds
  setTimeout(() => {
    toast.classList.remove('lr-toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function throttle(func, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func.apply(this, args);
    }
  };
}

function getCurrentHost() {
  return window.location.hostname;
}

// ============================================================================
// SELECTOR GENERATION
// ============================================================================

function isStableClass(className) {
  // Skip classes that look like hashes or contain BEM-style hashes
  if (/[a-z0-9]{8,}/i.test(className)) return false;
  if (className.includes('__') && /[a-z0-9]{6,}/i.test(className)) return false;
  if (className.startsWith('css-')) return false;
  if (className.startsWith('_')) return false;
  return true;
}

function getStableClasses(element) {
  if (!element.className || typeof element.className !== 'string') return [];
  return element.className
    .split(/\s+/)
    .filter(cls => cls && isStableClass(cls))
    .slice(0, 2); // Max 2 stable classes
}

function getNthOfType(element) {
  const parent = element.parentElement;
  if (!parent) return 1;
  
  const siblings = Array.from(parent.children).filter(
    el => el.tagName === element.tagName
  );
  
  if (siblings.length === 1) return null; // No need for nth-of-type
  
  const index = siblings.indexOf(element) + 1;
  return index;
}

function getSelector(element) {
  // Handle container pick heuristic
  const container = findReasonableContainer(element);
  const targetEl = container || element;
  
  log('Generating PRECISE selector for:', targetEl.tagName, targetEl.className);
  
  // Check if element has background-image (LinkedIn profile pics)
  const style = window.getComputedStyle(targetEl);
  const hasBgImage = style.backgroundImage && style.backgroundImage !== 'none';
  
  // If element has a stable ID, use it (most precise!)
  if (targetEl.id && targetEl.id.length < 30 && !/[0-9]{8,}/.test(targetEl.id)) {
    log('Using stable ID:', targetEl.id);
    return `#${CSS.escape(targetEl.id)}`;
  }
  
  // Build a VERY specific selector path using nth-child for precision
  const path = [];
  let current = targetEl;
  let depth = 0;
  const maxDepth = 6; // Deeper path for more precision
  
  while (current && current !== document.body && depth < maxDepth) {
    let selector = current.tagName.toLowerCase();
    
    // Check for ID at any level (best anchor)
    if (current.id && current.id.length < 30 && !/[0-9]{8,}/.test(current.id)) {
      selector = `#${CSS.escape(current.id)}`;
      path.unshift(selector);
      break; // Stop here, ID is unique
    }
    
    // Add ALL stable classes for specificity
    const stableClasses = getStableClasses(current);
    if (stableClasses.length > 0) {
      selector += stableClasses.map(cls => `.${CSS.escape(cls)}`).join('');
    }
    
    // CRITICAL: Always add nth-child for precision (matches exact position)
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(current) + 1;
      selector += `:nth-child(${index})`;
      log(`Added :nth-child(${index}) for precision`);
    }
    
    // For images/precise elements, add extra attributes
    if (current === targetEl) {
      // Add data attributes if present
      Array.from(current.attributes).forEach(attr => {
        if (attr.name.startsWith('data-') && attr.value && attr.value.length < 50) {
          selector += `[${CSS.escape(attr.name)}="${CSS.escape(attr.value)}"]`;
          log(`Added data attribute: ${attr.name}`);
        }
      });
      
      // Add alt for images
      if (current.alt && current.alt.length > 0 && current.alt.length < 50) {
        selector += `[alt="${CSS.escape(current.alt)}"]`;
      }
      
      // Add aria-label if present
      const ariaLabel = current.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.length < 50) {
        selector += `[aria-label="${CSS.escape(ariaLabel)}"]`;
      }
    }
    
    path.unshift(selector);
    current = current.parentElement;
    depth++;
  }
  
  const finalSelector = path.join(' > ');
  
  // Test the selector to ensure it only matches ONE element
  const matches = document.querySelectorAll(finalSelector);
  log('Selector matches:', matches.length, 'elements');
  
  if (matches.length > 1) {
    log('⚠️ WARNING: Selector matches multiple elements! Adding more specificity...');
    // This selector will blur multiple elements - that's what the user sees
  }
  
  log('Generated PRECISE selector:', finalSelector);
  return finalSelector;
}

function findReasonableContainer(element) {
  // NEVER climb up for these precise elements - blur exactly what user clicked
  const preciseElements = ['IMG', 'VIDEO', 'CANVAS', 'IFRAME', 'INPUT', 'TEXTAREA', 'SELECT'];
  
  if (preciseElements.includes(element.tagName)) {
    log('Precise element detected:', element.tagName, '- not climbing up');
    return null; // Blur this exact element
  }
  
  // For tiny text/icon elements, climb up to find a reasonable container
  const tinyTags = ['PATH', 'CIRCLE', 'RECT', 'G'];
  
  if (!tinyTags.includes(element.tagName)) {
    return null; // Already reasonable size
  }
  
  // Only climb up for SVG sub-elements
  const containerTags = ['DIV', 'LI', 'SECTION', 'ARTICLE', 'BUTTON', 'HEADER', 'FOOTER', 'NAV', 'ASIDE'];
  
  let current = element.parentElement;
  let depth = 0;
  
  while (current && depth < 3) { // Reduced from 5 to 3 for more precision
    if (containerTags.includes(current.tagName)) {
      return current;
    }
    current = current.parentElement;
    depth++;
  }
  
  return element.parentElement || null;
}

// ============================================================================
// STORAGE
// ============================================================================

async function loadRules() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const allRules = result[STORAGE_KEY] || {};
      const host = getCurrentHost();
      state.rules = allRules[host] || [];
      log('Loaded rules for', host, ':', state.rules);
      resolve(state.rules);
    });
  });
}

async function saveRules() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const allRules = result[STORAGE_KEY] || {};
      const host = getCurrentHost();
      allRules[host] = state.rules;
      
      chrome.storage.local.set({ [STORAGE_KEY]: allRules }, () => {
        log('Saved rules for', host, ':', state.rules);
        resolve();
      });
    });
  });
}

async function addRule(selector) {
  const rule = {
    id: generateUUID(),
    selector: selector,
    createdAt: Date.now()
  };
  
  state.rules.push(rule);
  await saveRules();
  log('Added rule:', rule);
  return rule;
}

async function removeRule(ruleId) {
  state.rules = state.rules.filter(r => r.id !== ruleId);
  await saveRules();
  log('Removed rule:', ruleId);
}

async function undoLastRule() {
  if (state.rules.length === 0) return;
  
  const lastRule = state.rules.pop();
  await saveRules();
  log('Undone rule:', lastRule);
  return lastRule;
}

async function clearAllRules() {
  state.rules = [];
  await saveRules();
  log('Cleared all rules');
}

// ============================================================================
// BLUR APPLICATION
// ============================================================================

function applyBlur(element) {
  if (!element.classList.contains('lr-redact-blur')) {
    element.classList.add('lr-redact-blur');
    log('Applied blur to:', element);
  }
}

function removeBlur(element) {
  if (element.classList.contains('lr-redact-blur')) {
    element.classList.remove('lr-redact-blur');
    log('Removed blur from:', element);
  }
}

function applyAllBlurs() {
  log('Applying all blurs for', state.rules.length, 'rules');
  
  state.rules.forEach(rule => {
    try {
      const elements = document.querySelectorAll(rule.selector);
      elements.forEach(el => {
        // Don't blur toolbar
        if (!el.closest('#lr-toolbar')) {
          applyBlur(el);
        }
      });
    } catch (error) {
      log('Error applying blur for selector', rule.selector, ':', error);
    }
  });
}

function removeAllBlurs() {
  const blurred = document.querySelectorAll('.lr-redact-blur');
  blurred.forEach(el => removeBlur(el));
  log('Removed all blurs');
}

function reapplyBlurs() {
  // Remove all blurs first, then reapply
  removeAllBlurs();
  applyAllBlurs();
}

// ============================================================================
// MUTATION OBSERVER (SPA Support)
// ============================================================================

function startObserver() {
  if (state.observer) return;
  
  state.observer = new MutationObserver(throttle(() => {
    log('DOM mutation detected');
    
    // Check if toolbar still exists, recreate if needed
    if (!document.getElementById('lr-toolbar')) {
      log('Toolbar was removed by SPA, recreating...');
      createToolbar();
      updateToolbar();
    }
    
    // Reapply blurs
    applyAllBlurs();
  }, 300));
  
  state.observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  log('MutationObserver started');
}

function stopObserver() {
  if (state.observer) {
    state.observer.disconnect();
    state.observer = null;
    log('MutationObserver stopped');
  }
}

// ============================================================================
// HIGHLIGHTING
// ============================================================================

function highlightElement(element) {
  // Avoid re-highlighting the same element
  if (state.currentHighlight === element) return;
  
  // Remove previous highlight
  if (state.currentHighlight) {
    state.currentHighlight.classList.remove('lr-redact-highlight');
  }
  
  // Don't highlight toolbar or its children
  if (element.id === 'lr-toolbar' || element.closest('#lr-toolbar')) {
    state.currentHighlight = null;
    return;
  }
  
  // Highlight the element (already determined by handleMouseMove)
  element.classList.add('lr-redact-highlight');
  state.currentHighlight = element;
  
  // Log for debugging
  if (DEBUG) {
    log('Highlighting:', element.tagName, element.className);
  }
}

function removeHighlight() {
  if (state.currentHighlight) {
    state.currentHighlight.classList.remove('lr-redact-highlight');
    state.currentHighlight = null;
  }
}

// ============================================================================
// PICK MODE EVENT HANDLERS
// ============================================================================

function handleMouseMove(event) {
  if (!state.pickMode) return;
  
  // Use elementsFromPoint to find what's actually under the cursor
  const elementsAtPoint = document.elementsFromPoint(event.clientX, event.clientY);
  const validElements = elementsAtPoint.filter(el => 
    el.id !== 'lr-toolbar' && 
    !el.closest('#lr-toolbar') &&
    el.tagName !== 'BODY' &&
    el.tagName !== 'HTML'
  );
  
  // Find the best element to highlight (same logic as click)
  let targetToHighlight = null;
  
  // Look for IMG tags (profile picture size)
  const imgCandidates = validElements.filter(el => {
    if (el.tagName !== 'IMG') return false;
    const rect = el.getBoundingClientRect();
    return rect.width >= 24 && rect.width <= 150 && rect.height >= 24 && rect.height <= 150;
  });
  
  if (imgCandidates.length > 0) {
    targetToHighlight = imgCandidates[0];
  } else {
    // Look for background-image elements (profile pics)
    const bgImageCandidates = validElements.filter(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      
      if (!style.backgroundImage || style.backgroundImage === 'none') return false;
      if (rect.width < 24 || rect.width > 150) return false;
      if (rect.height < 24 || rect.height > 150) return false;
      
      return true;
    });
    
    if (bgImageCandidates.length > 0) {
      // Prefer rounded elements
      const rounded = bgImageCandidates.find(el => {
        const style = window.getComputedStyle(el);
        const br = parseFloat(style.borderRadius);
        return br > 5 || style.borderRadius.includes('%');
      });
      targetToHighlight = rounded || bgImageCandidates[0];
    }
  }
  
  // Fallback to smallest element
  if (!targetToHighlight) {
    const smallElements = validElements.filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width >= 20 && rect.width <= 200 && rect.height >= 20 && rect.height <= 200;
    }).sort((a, b) => {
      const aSize = a.getBoundingClientRect().width * a.getBoundingClientRect().height;
      const bSize = b.getBoundingClientRect().width * b.getBoundingClientRect().height;
      return aSize - bSize;
    });
    
    targetToHighlight = smallElements[0] || event.target;
  }
  
  if (targetToHighlight) {
    requestAnimationFrame(() => {
      highlightElement(targetToHighlight);
    });
  }
}

function handleClick(event) {
  if (!state.pickMode) return;
  
  const target = event.target;
  
  // Don't process clicks on toolbar - check BEFORE stopping event!
  if (target.id === 'lr-toolbar' || target.closest('#lr-toolbar')) {
    log('Click on toolbar, ignoring');
    return;
  }
  
  // Now stop the event for page elements
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  
  // CRITICAL: Use elementsFromPoint to get ALL elements at click position
  // This finds elements BEHIND buttons/overlays!
  const clickX = event.clientX;
  const clickY = event.clientY;
  const elementsAtPoint = document.elementsFromPoint(clickX, clickY);
  
  log('=== CLICK ANALYSIS ===');
  log('Click at:', clickX, clickY);
  log('Total elements at point:', elementsAtPoint.length);
  
  // Analyze each element with detailed info
  elementsAtPoint.forEach((el, i) => {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    const hasBg = style.backgroundImage && style.backgroundImage !== 'none';
    const borderRadius = style.borderRadius;
    log(`  [${i}] ${el.tagName}.${el.className || '(no class)'}`);
    log(`      Size: ${Math.round(rect.width)}x${Math.round(rect.height)}px`);
    log(`      Has bg-image: ${hasBg}`);
    log(`      Border-radius: ${borderRadius}`);
  });
  
  // Find the best element to blur from the stack
  let elementToBlur = null;
  
  // Filter out toolbar elements and body/html
  const validElements = elementsAtPoint.filter(el => 
    el.id !== 'lr-toolbar' && 
    !el.closest('#lr-toolbar') &&
    el.tagName !== 'BODY' &&
    el.tagName !== 'HTML'
  );
  
  // Strategy 1: Look for IMG tags with profile picture size (30-100px typical)
  const imgCandidates = validElements.filter(el => {
    if (el.tagName !== 'IMG') return false;
    const rect = el.getBoundingClientRect();
    return rect.width >= 24 && rect.width <= 150 && rect.height >= 24 && rect.height <= 150;
  });
  
  if (imgCandidates.length > 0) {
    elementToBlur = imgCandidates[0];
    log('✓ Found IMG element:', elementToBlur, 'size:', Math.round(elementToBlur.getBoundingClientRect().width));
    showToast(`Blurred img`);
  }
  // Strategy 2: Look for circular/square elements with background-image (profile pics)
  else {
    const bgImageCandidates = validElements.filter(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      
      // Must have background-image
      if (!style.backgroundImage || style.backgroundImage === 'none') return false;
      
      // Profile pic size: 24px to 150px (typical range)
      if (rect.width < 24 || rect.width > 150) return false;
      if (rect.height < 24 || rect.height > 150) return false;
      
      // Prefer circular/rounded elements (profile pics usually are)
      const br = parseFloat(style.borderRadius);
      const isRounded = br > 5 || style.borderRadius.includes('%');
      
      log('  Candidate:', el.tagName, el.className, 
          `${Math.round(rect.width)}x${Math.round(rect.height)}`, 
          `rounded: ${isRounded}`);
      
      return true;
    });
    
    if (bgImageCandidates.length > 0) {
      // Prefer rounded elements first
      const rounded = bgImageCandidates.find(el => {
        const style = window.getComputedStyle(el);
        const br = parseFloat(style.borderRadius);
        return br > 5 || style.borderRadius.includes('%');
      });
      
      elementToBlur = rounded || bgImageCandidates[0];
      log('✓ Found background-image element:', elementToBlur);
      showToast(`Blurred profile pic`);
    }
  }
  
  // Fallback: if nothing found, use the smallest reasonable element
  if (!elementToBlur) {
    log('⚠ No profile pic found, looking for smallest element...');
    
    const smallElements = validElements.filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width >= 20 && rect.width <= 200 && rect.height >= 20 && rect.height <= 200;
    }).sort((a, b) => {
      const aSize = a.getBoundingClientRect().width * a.getBoundingClientRect().height;
      const bSize = b.getBoundingClientRect().width * b.getBoundingClientRect().height;
      return aSize - bSize; // Smallest first
    });
    
    if (smallElements.length > 0) {
      elementToBlur = smallElements[0];
      const rect = elementToBlur.getBoundingClientRect();
      log('Using smallest element:', elementToBlur.tagName, 
          `${Math.round(rect.width)}x${Math.round(rect.height)}`);
    } else {
      // Last resort: use clicked target
      elementToBlur = target;
      log('⚠ Using clicked target as fallback');
    }
    
    showToast(`Blurred ${elementToBlur.tagName.toLowerCase()}`);
  }
  
  log('=== FINAL CHOICE ===');
  log('Will blur:', elementToBlur.tagName, elementToBlur.className);
  log('==================');
  
  // Check if element is already blurred - clicking it unblurs it
  if (elementToBlur.classList.contains('lr-redact-blur')) {
    const selector = getSelector(elementToBlur);
    const matchingRule = state.rules.find(r => r.selector === selector);
    
    if (matchingRule) {
      removeRule(matchingRule.id).then(() => {
        reapplyBlurs();
        updateToolbar();
        log('Unblurred element:', elementToBlur);
      });
    } else {
      removeBlur(elementToBlur);
      log('Removed blur class from element:', elementToBlur);
    }
    return;
  }
  
  // Normal click: Blur immediately (no green selection)
  const selector = getSelector(elementToBlur);
  const elementType = elementToBlur.tagName.toLowerCase();
  log('Generated selector:', selector);
  log('Adding rule and blurring element...');
  
  addRule(selector).then(() => {
    log('Rule added. Total rules:', state.rules.length);
    applyAllBlurs();
    updateToolbar();
    
    // Show feedback for what was blurred
    const feedbackMsg = elementType === 'img' || elementType === 'video' 
      ? `Blurred ${elementType}`
      : `Blurred ${elementType}`;
    showToast(feedbackMsg);
    
    log('Blur applied and toolbar updated');
  });
}

function handleKeyDown(event) {
  if (!state.pickMode) return;
  
  if (event.key === 'Escape') {
    event.preventDefault();
    togglePickMode();
  }
}

// ============================================================================
// PICK MODE TOGGLE
// ============================================================================

function enablePickMode() {
  state.pickMode = true;
  
  // Add event listeners with capture to intercept before site handlers
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown, true);
  
  // Update toolbar button
  updateToolbar();
  showToast('Pick mode active');
  
  log('Pick mode enabled');
}

function disablePickMode() {
  state.pickMode = false;
  
  // Remove event listeners
  document.removeEventListener('mousemove', handleMouseMove, true);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('keydown', handleKeyDown, true);
  
  // Remove highlight
  removeHighlight();
  
  // Update toolbar button
  updateToolbar();
  showToast('Pick mode stopped');
  
  log('Pick mode disabled');
}

function togglePickMode() {
  if (state.pickMode) {
    disablePickMode();
  } else {
    enablePickMode();
  }
}

// ============================================================================
// TOOLBAR UI
// ============================================================================

function createToolbar() {
  // Remove existing toolbar if it exists (in case of SPA navigation)
  const existingToolbar = document.getElementById('lr-toolbar');
  if (existingToolbar) {
    log('Removing existing toolbar');
    existingToolbar.remove();
  }
  
  // Check if toolbar was minimized
  const wasMinimized = localStorage.getItem('lr-toolbar-minimized') === 'true';
  state.toolbarMinimized = wasMinimized;
  
  const toolbar = document.createElement('div');
  toolbar.id = 'lr-toolbar';
  toolbar.className = wasMinimized ? 'lr-minimized' : '';
  toolbar.innerHTML = `
    <div class="lr-toolbar-header">
      <span class="lr-toolbar-title">Live Redactor</span>
      <button id="lr-minimize-btn" class="lr-btn-icon" title="${wasMinimized ? 'Maximize' : 'Minimize'}">${wasMinimized ? '□' : '–'}</button>
    </div>
    <div class="lr-toolbar-content">
      <button id="lr-pick-btn" class="lr-btn lr-btn-primary" title="Click elements to blur/unblur (ESC to exit)">
        <span id="lr-pick-status">Start</span>
      </button>
      <button id="lr-undo-btn" class="lr-btn" title="Remove last redaction">Undo</button>
      <button id="lr-clear-btn" class="lr-btn" title="Clear all redactions for this site">Clear All</button>
    </div>
  `;
  
  document.body.appendChild(toolbar);
  state.toolbar = toolbar;
  
  // Attach event listeners
  const pickBtn = document.getElementById('lr-pick-btn');
  const minimizeBtn = document.getElementById('lr-minimize-btn');
  const undoBtn = document.getElementById('lr-undo-btn');
  const clearBtn = document.getElementById('lr-clear-btn');
  
  if (!pickBtn || !minimizeBtn || !undoBtn || !clearBtn) {
    log('ERROR: Could not find toolbar buttons!');
    return;
  }
  
  pickBtn.addEventListener('click', () => {
    log('Start/Stop button clicked. Current pickMode:', state.pickMode);
    togglePickMode();
    log('After toggle, pickMode:', state.pickMode);
  });
  
  minimizeBtn.addEventListener('click', () => {
    toggleToolbarMinimize();
  });
  
  undoBtn.addEventListener('click', async () => {
    log('Undo button clicked');
    const rulesCountBefore = state.rules.length;
    log('Rules before undo:', rulesCountBefore);
    
    if (rulesCountBefore === 0) {
      log('No rules to undo');
      showToast('Nothing to undo');
      return;
    }
    
    await undoLastRule();
    
    const rulesCountAfter = state.rules.length;
    log('Rules after undo:', rulesCountAfter);
    
    reapplyBlurs();
    updateToolbar();
    showToast('Undone');
    
    log('Undo complete');
  });
  
  clearBtn.addEventListener('click', async () => {
    log('Clear All button clicked');
    const rulesCount = state.rules.length;
    log('Rules to clear:', rulesCount);
    
    if (rulesCount === 0) {
      log('No rules to clear');
      showToast('Nothing to clear');
      return;
    }
    
    if (confirm('Clear all redactions for this site?')) {
      await clearAllRules();
      removeAllBlurs();
      updateToolbar();
      showToast('All cleared');
      log('All rules cleared');
    } else {
      log('Clear cancelled by user');
    }
  });
  
  log('Toolbar created and event listeners attached');
}

function toggleToolbarMinimize() {
  state.toolbarMinimized = !state.toolbarMinimized;
  const toolbar = document.getElementById('lr-toolbar');
  const minimizeBtn = document.getElementById('lr-minimize-btn');
  
  if (state.toolbarMinimized) {
    toolbar.classList.add('lr-minimized');
    minimizeBtn.textContent = '▢';
    minimizeBtn.title = 'Maximize';
    localStorage.setItem('lr-toolbar-minimized', 'true');
  } else {
    toolbar.classList.remove('lr-minimized');
    minimizeBtn.textContent = '−';
    minimizeBtn.title = 'Minimize';
    localStorage.setItem('lr-toolbar-minimized', 'false');
  }
  
  log('Toolbar minimized:', state.toolbarMinimized);
}

function updateToolbar() {
  // Check if toolbar exists first
  if (!document.getElementById('lr-toolbar')) {
    log('Toolbar not found in updateToolbar, skipping update');
    return;
  }
  
  const pickStatus = document.getElementById('lr-pick-status');
  const pickBtn = document.getElementById('lr-pick-btn');
  const undoBtn = document.getElementById('lr-undo-btn');
  const clearBtn = document.getElementById('lr-clear-btn');
  
  if (pickStatus) {
    pickStatus.textContent = state.pickMode ? 'Stop' : 'Start';
  }
  
  if (pickBtn) {
    if (state.pickMode) {
      pickBtn.classList.add('lr-active');
    } else {
      pickBtn.classList.remove('lr-active');
    }
  }
  
  if (undoBtn) {
    undoBtn.disabled = state.rules.length === 0;
  }
  
  if (clearBtn) {
    clearBtn.disabled = state.rules.length === 0;
  }
}

// ============================================================================
// STYLES
// ============================================================================

function injectStyles() {
  if (document.getElementById('lr-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'lr-styles';
  style.textContent = `
    /* Redaction blur effect */
    .lr-redact-blur {
      filter: blur(12px) !important;
      background: rgba(255, 255, 255, 0.15) !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      user-select: none !important;
      pointer-events: auto !important;
      opacity: 0.92 !important;
      overflow: hidden !important;
      position: relative !important;
    }
    
    /* Extra blur for images to ensure they're properly obscured */
    img.lr-redact-blur,
    video.lr-redact-blur,
    canvas.lr-redact-blur {
      filter: blur(15px) saturate(0.5) !important;
      opacity: 0.85 !important;
    }
    
    /* Blur elements with background-images (LinkedIn profile pics use this) */
    .lr-redact-blur[style*="background-image"],
    .lr-redact-blur[style*="backgroundImage"] {
      filter: blur(15px) saturate(0.5) !important;
      opacity: 0.85 !important;
    }
    
    /* Extra coverage for background images */
    .lr-redact-blur::before {
      content: '' !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      background: rgba(255, 255, 255, 0.2) !important;
      pointer-events: none !important;
    }
    
    /* Highlight during pick mode (hover) */
    .lr-redact-highlight {
      outline: 2px solid rgba(0, 0, 0, 0.35) !important;
      outline-offset: 1px !important;
      cursor: crosshair !important;
      box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.06) !important;
      position: relative !important;
    }
    
    /* Stronger highlight for precise elements (images, etc) */
    img.lr-redact-highlight,
    video.lr-redact-highlight,
    canvas.lr-redact-highlight {
      outline: 3px solid rgba(0, 0, 0, 0.5) !important;
      outline-offset: 0px !important;
      box-shadow: 0 0 0 6px rgba(0, 0, 0, 0.1) !important;
    }
    
    /* Toolbar - Apple Liquid Glass Style */
    #lr-toolbar {
      position: fixed !important;
      top: 16px !important;
      right: 16px !important;
      z-index: 2147483647 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif !important;
      font-size: 13px !important;
      background: rgba(255, 255, 255, 0.72) !important;
      backdrop-filter: blur(40px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(40px) saturate(180%) !important;
      border: 0.5px solid rgba(0, 0, 0, 0.08) !important;
      border-radius: 16px !important;
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.08),
        0 1px 3px rgba(0, 0, 0, 0.04),
        inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
      padding: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      min-width: 180px !important;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
      overflow: hidden !important;
    }
    
    #lr-toolbar.lr-minimized .lr-toolbar-content {
      display: none !important;
    }
    
    #lr-toolbar.lr-minimized {
      min-width: auto !important;
    }
    
    .lr-toolbar-header {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 12px 14px !important;
      background: transparent !important;
      color: rgba(0, 0, 0, 0.85) !important;
      font-weight: 500 !important;
      border-bottom: 0.5px solid rgba(0, 0, 0, 0.06) !important;
      user-select: none !important;
      letter-spacing: -0.01em !important;
    }
    
    .lr-toolbar-title {
      font-size: 13px !important;
      font-weight: 500 !important;
      letter-spacing: -0.01em !important;
    }
    
    .lr-toolbar-content {
      display: flex !important;
      flex-direction: column !important;
      gap: 8px !important;
      padding: 12px !important;
    }
    
    .lr-btn {
      background: rgba(0, 0, 0, 0.04) !important;
      border: none !important;
      border-radius: 8px !important;
      padding: 8px 16px !important;
      font-size: 13px !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
      color: rgba(0, 0, 0, 0.85) !important;
      white-space: nowrap !important;
      outline: none !important;
      text-align: center !important;
      letter-spacing: -0.01em !important;
      position: relative !important;
    }
    
    .lr-btn:hover:not(:disabled) {
      background: rgba(0, 0, 0, 0.08) !important;
      transform: scale(0.98) !important;
    }
    
    .lr-btn:active:not(:disabled) {
      background: rgba(0, 0, 0, 0.12) !important;
      transform: scale(0.96) !important;
    }
    
    .lr-btn:disabled {
      opacity: 0.3 !important;
      cursor: not-allowed !important;
    }
    
    .lr-btn-primary {
      background: rgba(0, 0, 0, 0.85) !important;
      color: rgba(255, 255, 255, 0.95) !important;
      font-weight: 500 !important;
    }
    
    .lr-btn-primary:hover:not(:disabled) {
      background: rgba(0, 0, 0, 0.92) !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
    }
    
    .lr-btn-primary.lr-active {
      background: rgba(0, 0, 0, 0.92) !important;
      box-shadow: 
        0 0 0 2px rgba(0, 0, 0, 0.1),
        inset 0 0 0 1px rgba(255, 255, 255, 0.1) !important;
    }
    
    .lr-btn-primary.lr-active:hover {
      background: rgba(0, 0, 0, 0.96) !important;
    }
    
    .lr-btn-icon {
      background: transparent !important;
      border: none !important;
      font-size: 18px !important;
      line-height: 1 !important;
      cursor: pointer !important;
      color: rgba(0, 0, 0, 0.6) !important;
      padding: 4px !important;
      transition: all 0.2s ease !important;
      font-weight: 300 !important;
      width: 24px !important;
      height: 24px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      border-radius: 6px !important;
    }
    
    .lr-btn-icon:hover {
      background: rgba(0, 0, 0, 0.06) !important;
      color: rgba(0, 0, 0, 0.85) !important;
    }
    
    /* Toast Notification */
    .lr-toast {
      position: fixed !important;
      bottom: 24px !important;
      left: 50% !important;
      transform: translateX(-50%) translateY(100px) !important;
      background: rgba(0, 0, 0, 0.85) !important;
      backdrop-filter: blur(20px) !important;
      -webkit-backdrop-filter: blur(20px) !important;
      color: white !important;
      padding: 12px 20px !important;
      border-radius: 12px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      z-index: 2147483647 !important;
      opacity: 0 !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      pointer-events: none !important;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2) !important;
    }
    
    .lr-toast-show {
      opacity: 1 !important;
      transform: translateX(-50%) translateY(0) !important;
    }
  `;
  
  document.head.appendChild(style);
  state.styleEl = style;
  log('Styles injected');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

async function init() {
  log('Initializing Live Redactor on', getCurrentHost());
  
  // Wait for body to be ready
  if (!document.body) {
    log('Waiting for document.body...');
    await new Promise(resolve => {
      const observer = new MutationObserver(() => {
        if (document.body) {
          observer.disconnect();
          resolve();
        }
      });
      observer.observe(document.documentElement, { childList: true });
    });
  }
  
  log('Document body ready');
  
  // Inject styles
  injectStyles();
  
  // Load rules from storage
  await loadRules();
  
  // Apply existing blurs
  applyAllBlurs();
  
  // Start mutation observer for SPA support
  startObserver();
  
  // Create toolbar
  createToolbar();
  updateToolbar();
  
  // Reapply blurs on scroll and resize (throttled)
  window.addEventListener('scroll', throttle(() => {
    applyAllBlurs();
  }, 500), { passive: true });
  
  window.addEventListener('resize', throttle(() => {
    applyAllBlurs();
  }, 500), { passive: true });
  
  // Periodic check to ensure toolbar exists (for SPAs that might remove it)
  setInterval(() => {
    if (!document.getElementById('lr-toolbar')) {
      log('Toolbar missing, recreating...');
      createToolbar();
      updateToolbar();
    }
  }, 2000);
  
  log('Live Redactor initialized successfully');
}

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log('Message received:', message);
  
  if (message.action === 'togglePickMode') {
    togglePickMode();
    sendResponse({ success: true, pickMode: state.pickMode });
  } else if (message.action === 'getState') {
    sendResponse({
      pickMode: state.pickMode,
      ruleCount: state.rules.length
    });
  } else if (message.action === 'clearAll') {
    clearAllRules().then(() => {
      removeAllBlurs();
      updateToolbar();
      sendResponse({ success: true });
    });
    return true; // Keep channel open for async response
  } else if (message.action === 'undo') {
    undoLastRule().then(() => {
      reapplyBlurs();
      updateToolbar();
      sendResponse({ success: true });
    });
    return true;
  }
  
  return false;
});

// ============================================================================
// START
// ============================================================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

