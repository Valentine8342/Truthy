let disclaimerEnabled = true;
let autoEncryptEnabled = true;
let selectedText = '';

chrome.storage.sync.get(['disclaimerEnabled', 'autoEncryptEnabled'], (data) => {
  disclaimerEnabled = data.disclaimerEnabled !== false;
  autoEncryptEnabled = data.autoEncryptEnabled !== false;
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleDisclaimer') {
    disclaimerEnabled = request.enabled;
  } else if (request.action === 'toggleAutoEncrypt') {
    autoEncryptEnabled = request.enabled;
  } else if (request.action === 'contextMenuEncrypt') {
    const selection = window.getSelection();
    selectedText = selection.toString();
    if (selectedText) {
      const range = selection.getRangeAt(0);
      chrome.runtime.sendMessage({ action: 'encode', text: selectedText, includeDisclaimer: disclaimerEnabled }, (response) => {
        replaceTextInDOM(selectedText, response.encoded);
      });
    }
  }
});

const config = { childList: true, subtree: true };
let typingTimer;
const typingInterval = 1600;
const encodingMessageDelay = 4000;

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      const commentBox = document.querySelector('div[contenteditable="true"]');
      decodeAllEncodedMessages();

      if (commentBox && !commentBox.dataset.observed) {
        commentBox.dataset.observed = 'true';
        commentBox.addEventListener('input', () => {
          if (autoEncryptEnabled) {
            handleCommentBoxChange(commentBox);
          }
        });

        commentBox.addEventListener('paste', (event) => {
          handlePasteEvent(event, commentBox);
        });
      }
    }
  });
});

observer.observe(document.body, config);

window.addEventListener('scroll', decodeAllEncodedMessages);
document.addEventListener('DOMContentLoaded', decodeAllEncodedMessages);

function decodeAllEncodedMessages() {
  const encodedElements = document.evaluate(
    '//*[contains(text(), "ENCODED:")]',
    document,
    null,
    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
    null
  );

  for (let i = 0; i < encodedElements.snapshotLength; i++) {
    const element = encodedElements.snapshotItem(i);
    if (!element.dataset.decoded) {
      decodeElement(element);
    }
  }
}

function decodeElement(element) {
  const encodedText = element.textContent.trim();
  if (encodedText.startsWith("ENCODED:")) {
    chrome.runtime.sendMessage({ action: "decode", text: encodedText }, (response) => {
      if (response.decoded !== encodedText) {
        const decodedLines = response.decoded.split('\n');
        const decodedHtml = decodedLines.map(line => 
          line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        ).join('<br>');
        element.innerHTML = decodedHtml;
        element.dataset.decoded = 'true';
      }
    });
  }
}

function showEncodingMessage(inputElement) {
  const originalText = inputElement.value || inputElement.innerText;
  if (inputElement.tagName === 'INPUT' || inputElement.tagName === 'TEXTAREA') {
    inputElement.value = "Encoding text...";
  } else {
    inputElement.innerText = "Encoding text...";
  }
  setTimeout(() => {
    if (inputElement.tagName === 'INPUT' || inputElement.tagName === 'TEXTAREA') {
      inputElement.value = originalText;
    } else {
      inputElement.innerText = originalText;
    }
  }, encodingMessageDelay);
}

function handleCommentBoxChange(commentBox) {
  clearTimeout(typingTimer);
  if (commentBox.innerText.trim() === '') {
    return;
  }
  typingTimer = setTimeout(() => {
    const comment = commentBox.innerText;
    showEncodingMessage(commentBox);
    setTimeout(() => {
      chrome.runtime.sendMessage({ 
        action: "encode", 
        text: comment, 
        includeDisclaimer: disclaimerEnabled 
      }, (response) => {
        const encodedLines = response.encoded.split('\n');
        commentBox.innerHTML = '';
        encodedLines.forEach((line, index) => {
          const p = document.createElement('p');
          p.textContent = line;
          p.className = 'first:mt-0 last:mb-0';
          commentBox.appendChild(p);
        });
        commentBox.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      });
    }, encodingMessageDelay);
  }, typingInterval);
}

function handlePasteEvent(event, commentBox) {
  setTimeout(() => {
    handleCommentBoxChange(commentBox);
  }, 0);
}

function handleTextBoxChange(textBox) {
  clearTimeout(typingTimer);
  if (textBox.value.trim() === '') {
    return;
  }
  typingTimer = setTimeout(() => {
    const text = textBox.value;
    showEncodingMessage(textBox);
    setTimeout(() => {
      chrome.runtime.sendMessage({ 
        action: "encode", 
        text: text, 
        includeDisclaimer: disclaimerEnabled 
      }, (response) => {
        textBox.value = response.encoded;
      });
    }, encodingMessageDelay);
  }, typingInterval);
}

function handleTextBoxPasteEvent(event, textBox) {
  setTimeout(() => {
    handleTextBoxChange(textBox);
  }, 0);
}

function replaceTextInDOM(originalText, encodedText) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const originalStartOffset = range.startOffset;
  const originalEndOffset = range.endOffset;
  const originalStartContainer = range.startContainer;
  const originalEndContainer = range.endContainer;
  
  range.deleteContents();

  const textNode = document.createTextNode(encodedText);
  range.insertNode(textNode);

  range.setStart(textNode, 0);
  range.setEnd(textNode, encodedText.length);

  selection.removeAllRanges();
  selection.addRange(range);


  if (!document.execCommand('insertText', false, encodedText)) {
    const textNode = document.createTextNode(encodedText);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  // Restore the original selection
  try {
    range.setStart(originalStartContainer, originalStartOffset);
    range.setEnd(originalEndContainer, originalEndOffset);
    selection.removeAllRanges();
    selection.addRange(range);
  } catch (e) {
    console.error('Error restoring selection:', e);
  }
}