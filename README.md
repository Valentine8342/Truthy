# Truthy

Truthy is a Chrome extension that encodes comments before posting and decodes them when viewing on YouTube, enhancing privacy and security.

## Features

- **Encode Comments**: Automatically encodes your comments before posting them on YouTube.
- **Decode Comments**: Automatically decodes encoded comments when viewing them on YouTube.

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" by toggling the switch in the top right corner.
4. Click on "Load unpacked" and select the directory where you downloaded/cloned this repository.

## Permissions Justification

- **activeTab**: Used to interact with the currently active tab, allowing the extension to encode and decode comments on YouTube.
- **host_permissions**: Required for `https://www.youtube.com/*` to access and modify the content of YouTube pages to encode and decode comments.
- **remote code**: The extension does not use remote code. All code is included within the extension package and executed locally.
- **scripting**: Required to inject and execute scripts on YouTube pages to perform the encoding and decoding of comments.

## Usage

1. Navigate to YouTube and start typing a comment.
2. The extension will automatically encode your comment before posting.
3. When viewing comments, the extension will decode any encoded comments for you.

## Privacy Practices

- **activeTab**: The `activeTab` permission is used to interact with the currently active tab, allowing the extension to encode and decode comments on YouTube.
- **host_permissions**: The `host_permissions` for `https://www.youtube.com/*` are necessary to access and modify the content of YouTube pages to encode and decode comments.
- **remote code**: The extension does not use remote code. All code is included within the extension package and executed locally.
- **scripting**: The `scripting` permission is required to inject and execute scripts on YouTube pages to perform the encoding and decoding of comments.

## Single Purpose

This extension encodes comments before posting and decodes them when viewing on YouTube, enhancing privacy and security.

## Contributing

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes.
4. Commit your changes (`git commit -am 'Add new feature'`).
5. Push to the branch (`git push origin feature-branch`).
6. Create a new Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
