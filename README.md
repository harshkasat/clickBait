# clickBait: YouTube Focus Extension

A browser extension to enhance your YouTube experience by minimizing distractions and improving focus.

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/harshkasat/clickBait/actions/workflows/main.yml/badge.svg)](https://github.com/harshkasat/clickBait/actions/workflows/main.yml)


## Project Overview

`clickBait` is a Chrome extension designed to help users focus on YouTube by allowing them to hide YouTube Shorts and blur videos based on keywords or similarity to user-defined keywords.  It also includes a Pomodoro-style timer to manage focus and break periods.

**Key Features:**

* **Hide YouTube Shorts:** Completely removes Shorts content from your YouTube experience.
* **Blur Videos:**  Blurs videos based on their titles.  Users can provide keywords to whitelist videos, preventing them from being blurred.  A TF-IDF algorithm is used for more advanced similarity matching.
* **Pomodoro Timer:**  A built-in timer allows users to set focus and break periods to improve concentration.  Videos are blurred during focus periods and unblurred during breaks.
* **Customizable Whitelist:** Users can specify keywords to prevent videos from being blurred, even if they match the similarity criteria.
* **Status Indicator:** A small indicator in the bottom-right corner of the YouTube page displays the extension's status (on/off, focus/break).


**Problem Solved:**

Many YouTube users find themselves easily distracted by irrelevant videos or the constant stream of Shorts content.  `clickBait` addresses this by providing tools to curate and control the YouTube viewing experience, promoting better focus and productivity.


**Use Cases:**

* Studying or working while using YouTube for background music.
* Minimizing distractions during focused work sessions.
* Reducing exposure to unwanted or irrelevant video content.


## Table of Contents

* [Prerequisites](#prerequisites)
* [Installation](#installation)
* [Configuration](#configuration)
* [Usage Examples](#usage-examples)
* [Project Architecture](#project-architecture)
* [Contributing Guidelines](#contributing-guidelines)


## Prerequisites

* A modern web browser (Chrome is recommended).


## Installation

1. Clone the repository: `git clone https://github.com/harshkasat/clickBait.git`
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click "Load unpacked".
5. Select the `clickBait` directory you cloned.


## Configuration

The extension uses `chrome.storage.local` to store user settings. These settings include:

* `whitelist`: An array of keywords to prevent videos from being blurred.
* `hideShorts`: A boolean value indicating whether to hide Shorts content (true/false).
* `enabled`: A boolean value indicating whether the extension is enabled (true/false).
* `timerRunning`: A boolean value indicating if the Pomodoro timer is running.
* `timerMode`: A string indicating the current timer mode ('focus' or 'break').
* `focusTime`: Integer representing focus time in minutes (default 25).
* `breakTime`: Integer representing break time in minutes (default 5).


These settings can be modified through the extension's popup UI (not fully implemented in the provided code).


## Usage Examples

The core logic resides within `content.js`.  The `processPage()` function is the main entry point, handling the blurring and hiding of content.

**Example: Hiding Shorts:**

The `removeShorts()` function uses CSS selectors to find and hide Shorts elements:

```javascript
function removeShorts() {
  const shortElements = document.querySelectorAll('ytd-reel-item-renderer');
  shortElements.forEach(shortElement => { shortElement.style.display = 'none'; });
  // ... (other code to remove Shorts shelves and containers)
}
```

**Example: Blurring Videos:**

The `processVideoElements()` function uses a TF-IDF algorithm (partially implemented in `computeTFIDF()`) to determine the similarity between video titles and user-provided keywords. Videos below a similarity threshold are blurred using the `ytd-blur` class.

```javascript
function processVideoElements() {
  // ... (code to fetch video titles and user keywords) ...

  videoElements.forEach((video, index) => {
    const similarityScore = similarities[index]?.similarity || 0;
    // ... (logic to blur or unblur based on similarity score or whitelist) ...
  });
}
```

The `computeTFIDF` function calculates the TF-IDF vectors for video titles and user input to determine similarity scores.  This function is complex and involves natural language processing techniques.


## Project Architecture

The extension consists of two main parts:

* **Popup.html/popup.js:**  Provides a user interface (partially implemented) for configuring the extension's settings.
* **content.js:** Injects into YouTube pages and handles the core logic for blurring videos and hiding Shorts.  This file contains most of the functionality described above.

The extension uses a `MutationObserver` to detect changes in the YouTube page's DOM and re-process the content accordingly.


## Contributing Guidelines

Contributions are welcome! Please open an issue to discuss proposed changes before submitting a pull request.  Follow standard JavaScript coding practices and ensure all new code is well-tested.


**(Note:  The provided code is incomplete.  Several functions are partially implemented, and the popup UI is not fully functional.)**
