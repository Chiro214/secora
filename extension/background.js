// background.js
let isRecording = false;
let macroSteps = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startRecording') {
    isRecording = true;
    macroSteps = [];
    
    // Add initial goto step based on current tab
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs.length > 0 && tabs[0].url) {
        macroSteps.push({
          action: 'goto',
          url: tabs[0].url,
          timestamp: Date.now()
        });
      }
    });
    
    chrome.storage.local.set({ isRecording, macroSteps });
    sendResponse({ status: 'started' });
  } 
  
  else if (request.action === 'stopRecording') {
    isRecording = false;
    chrome.storage.local.set({ isRecording });
    sendResponse({ status: 'stopped', steps: macroSteps });
  } 
  
  else if (request.action === 'clearRecording') {
    isRecording = false;
    macroSteps = [];
    chrome.storage.local.set({ isRecording, macroSteps });
    sendResponse({ status: 'cleared' });
  }
  
  else if (request.action === 'recordStep') {
    if (isRecording) {
      // Avoid duplicate clicks or types in quick succession (debounce if needed)
      macroSteps.push(request.step);
      chrome.storage.local.set({ macroSteps });
      console.log('Recorded step:', request.step);
    }
    sendResponse({ status: 'recorded' });
  }

  else if (request.action === 'getState') {
    sendResponse({ isRecording, macroSteps });
  }
});

// Record navigation events
chrome.webNavigation.onCompleted.addListener((details) => {
  if (isRecording && details.frameId === 0) { // Only main frame
    macroSteps.push({
      action: 'waitForNavigation',
      url: details.url,
      timestamp: Date.now()
    });
    chrome.storage.local.set({ macroSteps });
  }
});
