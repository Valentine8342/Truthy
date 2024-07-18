document.addEventListener('DOMContentLoaded', () => {
  const encryptionToggle = document.getElementById('encryptionToggle');
  const disclaimerToggle = document.getElementById('disclaimerToggle');

  chrome.storage.sync.get(['encryptionEnabled', 'disclaimerEnabled'], (data) => {
    encryptionToggle.checked = data.encryptionEnabled !== false;
    disclaimerToggle.checked = data.disclaimerEnabled !== false;
  });

  encryptionToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ encryptionEnabled: encryptionToggle.checked });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleEncryption', enabled: encryptionToggle.checked });
    });
  });

  disclaimerToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ disclaimerEnabled: disclaimerToggle.checked });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleDisclaimer', enabled: disclaimerToggle.checked });
    });
  });
});