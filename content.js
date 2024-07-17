const config = { childList: true, subtree: true };
let typingTimer;
const typingInterval = 1000;
const encodingMessageDelay = 4000;

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      const commentBox = document.querySelector('div#contenteditable-root');
      const commentElements = document.querySelectorAll('yt-attributed-string#content-text:not([data-decoded])');

      if (commentBox && !commentBox.dataset.observed) {
        commentBox.dataset.observed = 'true';
        commentBox.addEventListener('input', () => {
          clearTimeout(typingTimer);
          typingTimer = setTimeout(() => {
            const comment = commentBox.innerText;
            showEncodingMessage(commentBox);
            setTimeout(() => {
              chrome.runtime.sendMessage({ action: "encode", text: comment }, (response) => {
                commentBox.innerText = response.encoded;
              });
            }, encodingMessageDelay);
          }, typingInterval);
        });
      }

      decodeComments(commentElements);
    }
  });
});

observer.observe(document.body, config);

window.addEventListener('scroll', () => {
  const commentElements = document.querySelectorAll('yt-attributed-string#content-text:not([data-decoded])');
  decodeComments(commentElements);
});

function decodeComments(commentElements) {
  commentElements.forEach((commentElement) => {
    commentElement.dataset.decoded = 'true';
    const commentText = commentElement.querySelector('span.yt-core-attributed-string').innerText;
    if (commentText.startsWith("ENCODED:")) {
      chrome.runtime.sendMessage({ action: "decode", text: commentText }, (response) => {
        if (response.decoded !== commentText) {
          commentElement.querySelector('span.yt-core-attributed-string').innerText = response.decoded;
        }
      });
    }
  });
}

function showEncodingMessage(commentBox) {
  const originalText = commentBox.innerText;
  commentBox.innerText = "Encoding text...";
  setTimeout(() => {
    commentBox.innerText = originalText;
  }, encodingMessageDelay);
}