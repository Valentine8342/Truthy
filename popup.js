document.addEventListener('DOMContentLoaded', () => {
  const disclaimerToggle = document.getElementById('disclaimerToggle');
  const autoEncryptToggle = document.getElementById('autoEncryptToggle');

  chrome.storage.sync.get(['disclaimerEnabled', 'autoEncryptEnabled'], (data) => {
    disclaimerToggle.checked = data.disclaimerEnabled !== false;
    autoEncryptToggle.checked = data.autoEncryptEnabled !== false;
  });

  disclaimerToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ disclaimerEnabled: disclaimerToggle.checked });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleDisclaimer', enabled: disclaimerToggle.checked });
    });
  });

  autoEncryptToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ autoEncryptEnabled: autoEncryptToggle.checked });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleAutoEncrypt', enabled: autoEncryptToggle.checked });
    });
  });
});