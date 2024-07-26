chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "encode") {
    const encoded = caesarCipher(request.text, 3);
    const appendedMessage = request.includeDisclaimer ? "\n\nTruthy.Network" : "";
    sendResponse({ encoded: `ENCODED:${encoded}${appendedMessage}` });
  } else if (request.action === "decode") {
    if (request.text.startsWith("ENCODED:")) {
      const fullText = request.text.substring(8);
      const splitIndex = fullText.lastIndexOf("\n\nTruthy.Network");
      const encodedText = splitIndex !== -1 ? fullText.substring(0, splitIndex) : fullText;
      const appendedMessage = splitIndex !== -1 ? fullText.substring(splitIndex) : "";
      const decodedMessage = caesarCipher(encodedText.trim(), -3);
      sendResponse({ decoded: `${decodedMessage}${appendedMessage}` });
    } else {
      sendResponse({ decoded: request.text });
    }
  }
});

/**
 * Applies a Caesar cipher to the given text, preserving line breaks.
 *
 * @param {string} text - The text to encode or decode.
 * @param {number} shift - The number of characters to shift.
 * @returns {string} - The encoded or decoded text.
 */
function caesarCipher(text, shift) {
  return text.split('').map(char => {
    if (char === '\n') {
      return '\n';
    }
    const code = char.charCodeAt(0);
    if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
      const base = code >= 97 ? 97 : 65;
      return String.fromCharCode(((code - base + shift + 26) % 26) + base);
    } else {
      return char;
    }
  }).join('');
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'encryptText',
    title: 'Encrypt Text',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'encryptText') {
    chrome.tabs.sendMessage(tab.id, { action: 'contextMenuEncrypt' });
  }
});