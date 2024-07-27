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
        showModal();
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

function showModal() {
  if (!selectedText) {
    return;
  }

  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
    modal.innerHTML = `
      <div style="background-color: white; color: #1f2937; border-radius: 0.5rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); max-width: 28rem; width: 100%; transform: scale(1); transition: all 0.2s;">
        <div style="padding: 1.5rem;">
          <h2 style="font-size: 1.5rem; font-weight: 600; color: #1f2937; margin-bottom: 1rem; margin-top: 0rem; text-align: center;">Encoded Text</h2>
          <textarea style="width: 100%; padding: 0.75rem; background-color: #f3f4f6; color: #1f2937; border-radius: 0.375rem; border: 1px solid #d1d5db; focus:ring: 2px solid #3b82f6; focus:border: transparent;" 
            rows="5" readonly>Encoding Selected Text...</textarea>
          <div style="margin-top: 0.5rem; margin-bottom: 0.5rem; display: flex; justify-content: center; gap: 1.5rem;">
            <button style="width: 7rem; padding: 0.5rem; background-color: #3b82f6; color: white; font-weight: 500; border-radius: 0.375rem; transition: background-color 0.15s ease-in-out; display: flex; align-items: center; justify-content: center;" 
              id="copyButton">Copy</button>
            <button style="width: 7rem; padding: 0.5rem; background-color: #ef4444; color: white; font-weight: 500; border-radius: 0.375rem; transition: background-color 0.15s ease-in-out; display: flex; align-items: center; justify-content: center;" 
              id="closeButton">Close</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('copyButton').addEventListener('click', copyToClipboard);
    document.getElementById('closeButton').addEventListener('click', closeModal);
  } else {
    modal.querySelector('textarea').value = 'Encoding Selected Text...';
    modal.style.display = 'flex';
  }

  modal.style.display = 'flex';
  document.body.classList.add('modal-open');

  chrome.runtime.sendMessage({ action: 'encode', text: selectedText, includeDisclaimer: disclaimerEnabled }, (response) => {
    const finalEncodedText = response.encoded;
    modal.querySelector('textarea').value = finalEncodedText;
  });

  window.getSelection().removeAllRanges();
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
  window.getSelection().removeAllRanges();
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