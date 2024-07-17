chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "encode") {
    const encoded = caesarCipher(request.text, 3); // Shift by 3 for encoding
    sendResponse({ encoded: `ENCODED:${encoded}` });
  } else if (request.action === "decode") {
    if (request.text.startsWith("ENCODED:")) {
      const decoded = caesarCipher(request.text.substring(8), -3); // Shift by -3 for decoding
      sendResponse({ decoded });
    } else {
      sendResponse({ decoded: request.text });
    }
  }
});

/**
 * Applies a Caesar cipher to the given text.
 *
 * @param {string} text - The text to encode or decode.
 * @param {number} shift - The number of characters to shift.
 * @returns {string} - The encoded or decoded text.
 */
function caesarCipher(text, shift) {
  return text.split('').map(char => {
    const code = char.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      return String.fromCharCode(((code - 65 + shift + 26) % 26) + 65); // Uppercase letters
    } else if (code >= 97 && code <= 122) {
      return String.fromCharCode(((code - 97 + shift + 26) % 26) + 97); // Lowercase letters
    } else {
      return char; // Non-alphabetic characters
    }
  }).join('');
}