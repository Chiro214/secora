// content.js
let isRecording = false;

chrome.storage.local.get(['isRecording'], (result) => {
  isRecording = result.isRecording || false;
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.isRecording) {
    isRecording = changes.isRecording.newValue;
  }
});

function getCssSelector(el) {
  if (el.tagName.toLowerCase() === 'html') return 'html';
  
  let selector = el.tagName.toLowerCase();
  
  if (el.id) {
    return \`\${selector}#\${el.id}\`;
  }
  
  if (el.className && typeof el.className === 'string') {
    const classes = el.className.split(' ').filter(c => c).join('.');
    if (classes) {
      selector += \`.\${classes}\`;
    }
  }
  
  // If we have a name attribute (useful for forms)
  if (el.name) {
    selector += \`[name="\${el.name}"]\`;
  }
  
  // Add nth-child to ensure uniqueness if needed
  let parent = el.parentNode;
  if (parent && parent.tagName !== 'HTML') {
    let index = 1;
    for (let sibling of parent.children) {
      if (sibling === el) break;
      if (sibling.tagName === el.tagName) index++;
    }
    if (index > 1) {
      selector += \`:nth-of-type(\${index})\`;
    }
  }
  
  return selector;
}

// Intercept Clicks
document.addEventListener('click', (e) => {
  if (!isRecording) return;
  
  const target = e.target;
  const selector = getCssSelector(target);
  
  chrome.runtime.sendMessage({
    action: 'recordStep',
    step: {
      action: 'click',
      selector: selector,
      timestamp: Date.now()
    }
  });
}, true);

// Intercept Input/Change (Debounced)
let typeTimeout;
document.addEventListener('input', (e) => {
  if (!isRecording) return;
  
  const target = e.target;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
    const selector = getCssSelector(target);
    const value = target.value;
    
    clearTimeout(typeTimeout);
    typeTimeout = setTimeout(() => {
      chrome.runtime.sendMessage({
        action: 'recordStep',
        step: {
          action: 'type',
          selector: selector,
          value: value,
          timestamp: Date.now()
        }
      });
    }, 500); // Debounce typing so we don't record every single keystroke
  }
}, true);
