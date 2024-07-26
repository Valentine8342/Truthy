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
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();
      if (selectedText) {
        chrome.runtime.sendMessage({ 
          action: 'encode', 
          text: selectedText, 
          includeDisclaimer: disclaimerEnabled 
        }, (response) => {
          replaceTextInDOM(selectedText, response.encoded);
        });
      }
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
        commentBox.innerHTML = encodedLines.map((line, index) => 
          index === 0 ? line : `<br>${line}`
        ).join('');
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
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    // Find all text nodes within the container
    const textNodes = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }

    // Find the nodes containing the selected text
    let startNode, endNode, startOffset, endOffset;
    let remainingLength = originalText.length;
    for (let i = 0; i < textNodes.length; i++) {
      const nodeText = textNodes[i].nodeValue;
      if (!startNode && nodeText.includes(originalText.substring(0, nodeText.length))) {
        startNode = textNodes[i];
        startOffset = nodeText.indexOf(originalText.substring(0, nodeText.length));
      }
      if (startNode) {
        remainingLength -= nodeText.length;
        if (remainingLength <= 0) {
          endNode = textNodes[i];
          endOffset = nodeText.length + remainingLength;
          break;
        }
      }
    }

    // Replace the text in the found nodes
    if (startNode && endNode) {
      if (startNode === endNode) {
        startNode.nodeValue = startNode.nodeValue.substring(0, startOffset) + 
                              encodedText + 
                              startNode.nodeValue.substring(endOffset);
      } else {
        startNode.nodeValue = startNode.nodeValue.substring(0, startOffset) + encodedText;
        const nodesToRemove = [];
        let currentNode = startNode.nextSibling;
        while (currentNode && currentNode !== endNode) {
          nodesToRemove.push(currentNode);
          currentNode = currentNode.nextSibling;
        }
        nodesToRemove.forEach(node => node.parentNode.removeChild(node));
        if (endNode) {
          endNode.nodeValue = endNode.nodeValue.substring(endOffset);
        }
      }
    }
  }
}

function getNextNode(node) {
  if (node.firstChild) {
    return node.firstChild;
  }
  while (node) {
    if (node.nextSibling) {
      return node.nextSibling;
    }
    node = node.parentNode;
  }
  return null;
}