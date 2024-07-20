let encryptionEnabled = true;
let disclaimerEnabled = true;
let isEncoding = false;

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
      const youtubeCommentBox = document.querySelector('div#contenteditable-root');
      const redditCommentBox = document.querySelector('div[contenteditable="true"][name="body"]');
      const youtubeCommentElements = document.querySelectorAll('yt-attributed-string#content-text:not([data-decoded])');

      if (youtubeCommentBox && !youtubeCommentBox.dataset.observed) {
        youtubeCommentBox.dataset.observed = 'true';
        youtubeCommentBox.addEventListener('input', () => {
          if (!isEncoding) handleCommentBoxChange(youtubeCommentBox);
        });

        youtubeCommentBox.addEventListener('paste', (event) => {
          if (!isEncoding) handlePasteEvent(event, youtubeCommentBox);
        });
      }

      if (redditCommentBox && !redditCommentBox.dataset.observed) {
        redditCommentBox.dataset.observed = 'true';
        redditCommentBox.addEventListener('input', () => {
          if (!isEncoding) handleCommentBoxChange(redditCommentBox);
        });

        redditCommentBox.addEventListener('paste', (event) => {
          if (!isEncoding) handlePasteEvent(event, redditCommentBox);
        });
      }

      decodeComments(youtubeCommentElements);
    }
  });
});

observer.observe(document.body, config);

window.addEventListener('scroll', () => {
  const youtubeCommentElements = document.querySelectorAll('yt-attributed-string#content-text:not([data-decoded])');
  decodeComments(youtubeCommentElements);
});

document.addEventListener('DOMContentLoaded', () => {
  const youtubeCommentElements = document.querySelectorAll('yt-attributed-string#content-text:not([data-decoded])');
  decodeComments(youtubeCommentElements);
});

function decodeComments(commentElements) {
  commentElements.forEach((commentElement) => {
    commentElement.dataset.decoded = 'true';
    const spanElement = commentElement.querySelector('span.yt-core-attributed-string');
    const commentText = spanElement.innerText;
    if (commentText.startsWith("ENCODED:") && encryptionEnabled) {
      chrome.runtime.sendMessage({ action: "decode", text: commentText }, (response) => {
        if (response.decoded !== commentText) {
          const decodedHtml = response.decoded.split('\n').map(line => 
            line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          ).join('<br>');
          spanElement.innerHTML = `<span class="original-text">${commentText}</span><br>${decodedHtml}`;
          setTimeout(() => removeOriginalText(spanElement), 500);
        }
      });
    }
  });
}

function removeOriginalText(element) {
  const originalTextElement = element.querySelector('.original-text');
  if (originalTextElement) {
    originalTextElement.nextElementSibling.remove();
    originalTextElement.remove();
  }
}

function showEncodingMessage(commentBox) {
  const originalText = commentBox.innerText;
  commentBox.innerText = "Encoding text...";
  setTimeout(() => {
    commentBox.innerText = originalText;
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
      isEncoding = true;
      showEncodingMessage(commentBox);
      setTimeout(() => {
        chrome.runtime.sendMessage({ 
          action: "encode", 
          text: comment, 
          includeDisclaimer: disclaimerEnabled 
        }, (response) => {
          if (response && response.encoded) {
            insertTextAtCursor(commentBox, response.encoded);
          }
          isEncoding = false;
        });
      }, encodingMessageDelay);
    }
  }, typingInterval);
}

function handlePasteEvent(event, commentBox) {
  if (!isEncoding) {
    setTimeout(() => {
      handleCommentBoxChange(commentBox);
    }, 0);
  }
}

function insertTextAtCursor(element, text) {
  const range = document.createRange();
  const sel = window.getSelection();
  
  element.focus();
  range.selectNodeContents(element);
  range.collapse(false);
  
  sel.removeAllRanges();
  sel.addRange(range);
  
  document.execCommand('insertText', false, text);
}