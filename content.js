let disclaimerEnabled = true;
let autoEncryptEnabled = true;
let selectedText = '';
let modal;

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
    selectedText = window.getSelection().toString();
    if (selectedText) {
      chrome.runtime.sendMessage({ action: 'encode', text: selectedText, includeDisclaimer: disclaimerEnabled }, (response) => {
        replaceTextInDOM(selectedText, response.encoded);
      });
    }
  } else if (request.action === 'showModal') {
    const initialSelectedText = window.getSelection().toString();
    setTimeout(() => {
      if (initialSelectedText === window.getSelection().toString() && !window.location.href.includes('www.facebook.com')) {
        showModal(request.encodedText);
      }
    }, 1500);
  }
});

document.addEventListener('mouseup', () => {
  selectedText = window.getSelection().toString();
  if (selectedText) {
    chrome.runtime.sendMessage({ action: 'encode', text: selectedText, includeDisclaimer: disclaimerEnabled });
  }
});

function showModal(encodedText) {
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75';
    modal.innerHTML = `
      <div class="bg-white p-4 rounded shadow-lg max-w-lg w-full" onclick="event.stopPropagation()">
        <h2 class="text-xl font-bold mb-4">Encoded Text</h2>
        <textarea class="w-full p-2 border rounded" rows="5" readonly>${encodedText}</textarea>
        <div class="mt-4 flex justify-end">
          <button class="bg-blue-500 text-white px-4 py-2 rounded" id="copyButton">Copy</button>
          <button class="ml-2 bg-gray-500 text-white px-4 py-2 rounded" id="closeButton">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('copyButton').addEventListener('click', copyToClipboard);
    document.getElementById('closeButton').addEventListener('click', closeModal);
  } else {
    modal.querySelector('textarea').value = encodedText;
    modal.style.display = 'flex';
  }
  modal.style.display = 'flex';
  document.body.classList.add('modal-open');

  // Clear text selection
  window.getSelection().removeAllRanges();

  // Delete original selected text
  deleteSelectedText();
}

function closeModal() {
  if (modal) {
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
  }
}

function deleteSelectedText() {
  const selection = window.getSelection();
  if (!selection.rangeCount) {
    return;
  }
  selection.deleteFromDocument();
}

function copyToClipboard() {
  const textarea = modal.querySelector('textarea');
  textarea.select();
  document.execCommand('copy');
  window.getSelection().removeAllRanges(); // Deselect the text
}

document.addEventListener('mousedown', (event) => {
  if (modal && !modal.contains(event.target)) {
    closeModal();
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
        commentBox.innerText = response.encoded;
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
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  let node;
  while (node = walker.nextNode()) {
    if (node.nodeValue.includes(originalText) && !node.parentElement.closest('.modal')) {
      node.nodeValue = node.nodeValue.replace(originalText, encodedText);
    }
  }
}