let encryptionEnabled = true;
let disclaimerEnabled = true;

chrome.storage.sync.get(['encryptionEnabled', 'disclaimerEnabled'], (data) => {
  encryptionEnabled = data.encryptionEnabled !== false;
  disclaimerEnabled = data.disclaimerEnabled !== false;
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleEncryption') {
    encryptionEnabled = request.enabled;
  } else if (request.action === 'toggleDisclaimer') {
    disclaimerEnabled = request.enabled;
  }
});

const config = { childList: true, subtree: true };
let typingTimer;
const typingInterval = 1600;
const encodingMessageDelay = 4000;

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      const commentBox = document.querySelector('div#contenteditable-root');
      const commentElements = document.querySelectorAll('yt-attributed-string#content-text:not([data-decoded])');

      if (commentBox && !commentBox.dataset.observed) {
        commentBox.dataset.observed = 'true';
        commentBox.addEventListener('input', () => {
          handleCommentBoxChange(commentBox);
        });

        commentBox.addEventListener('paste', (event) => {
          handlePasteEvent(event, commentBox);
        });
      }

      decodeComments(commentElements);

      const commentBodyHeader = document.querySelector('comment-body-header');
      if (commentBodyHeader && !commentBodyHeader.dataset.textBoxAdded) {
        commentBodyHeader.dataset.textBoxAdded = 'true';
        const textBox = document.createElement('input');
        textBox.type = 'text';
        textBox.placeholder = 'Enter text to be encoded';
        textBox.className = 'block w-full p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
        textBox.style.marginTop = '8px';
        commentBodyHeader.appendChild(textBox);

        textBox.addEventListener('input', () => {
          handleTextBoxChange(textBox);
        });

        textBox.addEventListener('paste', (event) => {
          handleTextBoxPasteEvent(event, textBox);
        });
      }
    }
  });
});

observer.observe(document.body, config);

window.addEventListener('scroll', () => {
  const commentElements = document.querySelectorAll('yt-attributed-string#content-text:not([data-decoded])');
  decodeComments(commentElements);
});

document.addEventListener('DOMContentLoaded', () => {
  const commentElements = document.querySelectorAll('yt-attributed-string#content-text:not([data-decoded])');
  decodeComments(commentElements);
});

function decodeComments(commentElements) {
  commentElements.forEach((commentElement) => {
    commentElement.dataset.decoded = 'true';
    const commentText = commentElement.querySelector('span.yt-core-attributed-string').innerText;
    if (commentText.startsWith("ENCODED:") && encryptionEnabled) {
      chrome.runtime.sendMessage({ action: "decode", text: commentText }, (response) => {
        if (response.decoded !== commentText) {
          const decodedHtml = response.decoded.split('\n').map(line => 
            line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          ).join('<br>');
          commentElement.querySelector('span.yt-core-attributed-string').innerHTML = decodedHtml;
        }
      });
    }
  });
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
    if (encryptionEnabled) {
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
    }
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
    if (encryptionEnabled) {
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
    }
  }, typingInterval);
}

function handleTextBoxPasteEvent(event, textBox) {
  setTimeout(() => {
    handleTextBoxChange(textBox);
  }, 0);
}