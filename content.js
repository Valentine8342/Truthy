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
  } else if (request.action === 'contextMenuEncrypt') {
    selectedText = window.getSelection().toString();
    if (selectedText) {
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
      const commentBox = document.querySelector('div#contenteditable-root');
      const commentElements = document.querySelectorAll('yt-attributed-string#content-text:not([data-decoded])');
      const shredditComposer = document.querySelector('shreddit-composer:not([data-text-box-added])');
      const redditCommentElements = document.querySelectorAll('div[id$="-comment-rtjson-content"]');

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
      decodeRedditComments(redditCommentElements);
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
          const decodedLines = response.decoded.split('\n');
          const firstLine = decodedLines[0].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const remainingLines = decodedLines.slice(1).map(line => 
            line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          ).join('<br>');
          const decodedHtml = `${firstLine}<br>${remainingLines}`;
          commentElement.querySelector('span.yt-core-attributed-string').innerHTML = decodedHtml;
        }
      });
    }
  });
}

function decodeRedditComments(redditCommentElements) {
  redditCommentElements.forEach((commentElement) => {
    const commentText = commentElement.querySelector('p').innerText;
    if (commentText.startsWith("ENCODED:") && encryptionEnabled) {
      chrome.runtime.sendMessage({ action: "decode", text: commentText }, (response) => {
        if (response.decoded !== commentText) {
          const decodedLines = response.decoded.split('\n');
          const firstLine = decodedLines[0].replace(/&/g, '&amp;').replace(/<//g, '&lt;').replace(/>/g, '&gt;');
          const remainingLines = decodedLines.slice(1).map(line => 
            line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          ).join('<br>');
          const decodedHtml = `${firstLine}<br>${remainingLines}`;
          commentElement.querySelector('p').innerHTML = decodedHtml;
          commentElement.dataset.decoded = 'true';
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

function replaceTextInDOM(originalText, encodedText) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  let node;
  while (node = walker.nextNode()) {
    if (node.nodeValue.includes(originalText)) {
      node.nodeValue = node.nodeValue.replace(originalText, encodedText);
    }
  }
}