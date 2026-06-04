// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const exportBtn = document.getElementById('exportBtn');
  const clearBtn = document.getElementById('clearBtn');
  const stepCount = document.getElementById('stepCount');
  const indicator = document.getElementById('indicator');

  let currentSteps = [];

  // Initialize UI based on background state
  chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
    updateUI(response.isRecording, response.macroSteps);
  });

  function updateUI(isRecording, steps) {
    currentSteps = steps || [];
    stepCount.textContent = currentSteps.length;

    if (isRecording) {
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      exportBtn.style.display = 'none';
      indicator.style.display = 'block';
    } else {
      startBtn.style.display = 'block';
      stopBtn.style.display = 'none';
      indicator.style.display = 'none';
      
      if (currentSteps.length > 0) {
        exportBtn.style.display = 'block';
      } else {
        exportBtn.style.display = 'none';
      }
    }
  }

  startBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'startRecording' }, (response) => {
      updateUI(true, []);
    });
  });

  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stopRecording' }, (response) => {
      updateUI(false, response.steps);
    });
  });

  clearBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'clearRecording' }, (response) => {
      updateUI(false, []);
    });
  });

  exportBtn.addEventListener('click', () => {
    const macro = {
      name: "SECORA Authentication Macro",
      createdAt: new Date().toISOString(),
      steps: currentSteps
    };

    const blob = new Blob([JSON.stringify(macro, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
      url: url,
      filename: `secora-macro-${Date.now()}.json`,
      saveAs: true
    });
  });
});
