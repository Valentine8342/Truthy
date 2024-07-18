document.addEventListener('DOMContentLoaded', () => {
    const toggleSwitch = document.getElementById('encryptionToggle');
    chrome.storage.sync.get('encryptionEnabled', (data) => {
      toggleSwitch.checked = data.encryptionEnabled !== false;
    });
    toggleSwitch.addEventListener('change', () => {
      chrome.storage.sync.set({ encryptionEnabled: toggleSwitch.checked });
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleEncryption', enabled: toggleSwitch.checked });
      });
    });
  });