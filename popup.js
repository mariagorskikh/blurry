// popup.js
// Popup controls for Live Redactor

const DEBUG = true;

function log(...args) {
  if (DEBUG) console.log('[LR Popup]', ...args);
}

// ============================================================================
// UI UPDATES
// ============================================================================

function updateUI(state) {
  const pickModeStatus = document.getElementById('pick-mode-status');
  const ruleCount = document.getElementById('rule-count');
  const toggleBtn = document.getElementById('toggle-pick-btn');
  const undoBtn = document.getElementById('undo-btn');
  const clearBtn = document.getElementById('clear-btn');
  
  if (state) {
    // Update pick mode status
    if (pickModeStatus) {
      pickModeStatus.textContent = state.pickMode ? 'Active' : 'Inactive';
      pickModeStatus.className = 'status-value ' + (state.pickMode ? 'active' : 'inactive');
    }
    
    // Update rule count
    if (ruleCount) {
      ruleCount.textContent = state.ruleCount || 0;
    }
    
    // Update toggle button
    if (toggleBtn) {
      if (state.pickMode) {
        toggleBtn.classList.add('active');
        toggleBtn.textContent = 'Stop';
      } else {
        toggleBtn.classList.remove('active');
        toggleBtn.textContent = 'Start';
      }
    }
    
    // Update undo/clear buttons
    if (undoBtn) {
      undoBtn.disabled = !state.ruleCount || state.ruleCount === 0;
    }
    if (clearBtn) {
      clearBtn.disabled = !state.ruleCount || state.ruleCount === 0;
    }
  }
}

// ============================================================================
// MESSAGING
// ============================================================================

async function sendMessageToTab(message) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      log('No active tab found');
      return null;
    }
    
    const response = await chrome.tabs.sendMessage(tab.id, message);
    log('Response from content script:', response);
    return response;
  } catch (error) {
    log('Error sending message:', error);
    return null;
  }
}

async function getState() {
  const response = await sendMessageToTab({ action: 'getState' });
  if (response) {
    updateUI(response);
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

document.getElementById('toggle-pick-btn').addEventListener('click', async () => {
  log('Toggle pick button clicked');
  const response = await sendMessageToTab({ action: 'togglePickMode' });
  if (response) {
    updateUI(response);
  }
  
  // Refresh state after a short delay
  setTimeout(getState, 100);
});

document.getElementById('undo-btn').addEventListener('click', async () => {
  log('Undo button clicked');
  await sendMessageToTab({ action: 'undo' });
  
  // Refresh state
  setTimeout(getState, 100);
});

document.getElementById('clear-btn').addEventListener('click', async () => {
  log('Clear button clicked');
  
  if (confirm('Clear all redactions for this site?')) {
    await sendMessageToTab({ action: 'clearAll' });
    
    // Refresh state
    setTimeout(getState, 100);
  }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

// Get initial state when popup opens
document.addEventListener('DOMContentLoaded', () => {
  log('Popup loaded');
  getState();
  
  // Refresh state periodically while popup is open
  const interval = setInterval(getState, 1000);
  
  // Clear interval when popup closes
  window.addEventListener('unload', () => {
    clearInterval(interval);
  });
});

