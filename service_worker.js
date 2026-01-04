// service_worker.js
// Handles extension icon clicks and toggles pick mode

const DEBUG = false;

function log(...args) {
  if (DEBUG) console.log('[LR Service Worker]', ...args);
}

// Listen for action icon clicks
chrome.action.onClicked.addListener(async (tab) => {
  log('Action clicked for tab:', tab.id);
  
  // Send toggle message to content script
  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'togglePickMode' });
    log('Toggle message sent to tab:', tab.id);
  } catch (error) {
    log('Error sending message:', error);
    // Content script might not be loaded yet, try injecting
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      log('Content script injected');
    } catch (injectError) {
      log('Error injecting content script:', injectError);
    }
  }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log('Message received:', message, 'from:', sender);
  
  if (message.action === 'getActiveTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tab: tabs[0] });
    });
    return true; // Keep channel open for async response
  }
  
  return false;
});

log('Service worker initialized');

