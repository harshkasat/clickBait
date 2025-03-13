let whitelist = [];
let observer = null;
let hideShorts = true;
let extensionEnabled = true;
let timerRunning = false;
let timerMode = 'focus'; // 'focus' or 'break'

// Initialize extension
function init() {
  // Fetch the settings from storage
  chrome.storage.local.get(
    {
      // Provide defaults here
      whitelist: [],
      hideShorts: true,
      enabled: true,
      timerRunning: false,
      timerMode: 'focus',
      focusTime: 25,
      breakTime: 5
    },
    function(settings) {
      // Populate variables with settings or defaults
      whitelist = settings.whitelist;
      hideShorts = settings.hideShorts;
      extensionEnabled = settings.enabled;
      timerRunning = settings.timerRunning;
      timerMode = settings.timerMode;
      timerMode = 'break'
      
      // Start observing page changes
      startObserver();
      
      // Process existing content
      processPage();
      
      // Add status indicator to page
      addStatusIndicator();
    }
  );
}

// Process the YouTube page
function processPage() {

  // If extension is disabled, remove all blurring and return
  if (!extensionEnabled) {
    timerMode = 'break';
    removeAllBlurring();
    showAllShorts();
    // return;
  } else {
    timerMode = 'focus';
    processVideoElements();
  }

  // If in break mode and timer is running, don't blur anything
  if (!timerRunning && timerMode === 'break') {
    removeAllBlurring();
    // Still hide shorts if that option is enabled
    if (hideShorts) {
      removeShorts();
    } else {
      showAllShorts();
    }
    return;
  } else {
    processVideoElements();
  }
  
  // Process videos on home page, search results, and recommendations
  // processVideoElements();
  
  // Handle Shorts specifically
  if (hideShorts) {
    removeShorts();
    removeShortsTabs();
  }
  
  // Update status indicator
  updateStatusIndicator();
}

// Remove all blurring effects
function removeAllBlurring() {
  const blurredElements = document.querySelectorAll('.ytd-blur');
  blurredElements.forEach(element => {
    element.classList.remove('ytd-blur');
  });
}

// Show all shorts that were hidden
function showAllShorts() {
  // Show individual short items
  const shortElements = document.querySelectorAll('ytd-reel-item-renderer');
  shortElements.forEach(shortElement => {
    shortElement.style.display = '';
  });
  
  // Show entire Shorts sections (shelves)
  const shortsShelves = document.querySelectorAll('ytd-rich-section-renderer');
  shortsShelves.forEach(shelf => {
    shelf.style.display = '';
  });
  
  // Show Shorts content if we're on the Shorts page
  const shortsContainer = document.querySelector('ytd-shorts');
  if (shortsContainer) {
    shortsContainer.style.display = '';
  }
  
  // Remove message if it exists
  const message = document.getElementById('shorts-blocked-message');
  if (message) {
    message.remove();
  }
  
  // Show navigation items
  const navItems = document.querySelectorAll('ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer');
  navItems.forEach(item => {
    if (item.textContent.includes('Shorts')) {
      item.style.display = '';
    }
  });
  
  const mobileNavItems = document.querySelectorAll('ytd-pivot-bar-item-renderer');
  mobileNavItems.forEach(item => {
    if (item.textContent.includes('Shorts')) {
      item.style.display = '';
    }
  });
}

// Process video elements across different YouTube layouts
function processVideoElements() {
  chrome.storage.local.get(["whitelist", "similarityThreshold"], function(settings) {
    
      const threshold = settings.similarityThreshold || 0.6;
      const userInput = settings.whitelist.join(" ");

      const videoElements = Array.from(document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer'));
      const videoTitles = videoElements.map(video => {
          const titleElement = video.querySelector('#video-title');
          return titleElement ? titleElement.textContent.trim().toLowerCase() : "";
      }).filter(title => title.length > 0); // Ignore empty titles

      if (videoTitles.length === 0) {
          console.warn("No video titles found yet, waiting...");
          return;
      }

      const similarities = computeTFIDF(videoTitles, userInput);
      similarities.forEach((video, index) => {
    });

    videoElements.forEach((video, index) => {
      const similarityScore = similarities[index]?.similarity || 0;
      const title = videoTitles[index];
  
      // ✅ Direct substring match (ignores similarity score)
      if (title.includes(userInput.toLowerCase())) {
          video.classList.remove('ytd-blur');
          return;
      }
  
      // ✅ TF-IDF Matching
      if (similarityScore >= threshold) {
          video.classList.remove('ytd-blur');
      } else {
          video.classList.add('ytd-blur');
      }
    });
  });
}



// Function to remove all Shorts elements
function removeShorts() {
  // Remove individual short items
  const shortElements = document.querySelectorAll('ytd-reel-item-renderer');
  shortElements.forEach(shortElement => {
    shortElement.style.display = 'none';
  });
  
  // Remove entire Shorts sections (shelves)
  const shortsShelves = document.querySelectorAll('ytd-rich-section-renderer');
  shortsShelves.forEach(shelf => {
    // Check if this is a shorts shelf
    if (shelf.textContent.includes('Shorts')) {
      shelf.style.display = 'none';
    }
  });
  
  // Hide Shorts if we're on the Shorts page
  if (window.location.pathname.includes('/shorts')) {
    // Add a message
    if (!document.getElementById('shorts-blocked-message')) {
      const message = document.createElement('div');
      message.id = 'shorts-blocked-message';
      message.style.padding = '50px';
      message.style.textAlign = 'center';
      message.style.fontSize = '20px';
      message.style.color = '#c00';
      message.style.fontWeight = 'bold';
      message.innerHTML = 'Shorts have been hidden by YouTube Focus extension';
      
      // Insert message on page
      const content = document.querySelector('#content') || document.querySelector('ytd-app') || document.body;
      content.prepend(message);
    }
    
    // Hide the main content
    const shortsContainer = document.querySelector('ytd-shorts');
    if (shortsContainer) {
      shortsContainer.style.display = 'none';
    }
  }
}

// Remove Shorts tabs/links from navigation
function removeShortsTabs() {
  // Remove from main navigation
  const navItems = document.querySelectorAll('ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer');
  navItems.forEach(item => {
    if (item.textContent.includes('Shorts')) {
      item.style.display = 'none';
    }
  });
  
  // Remove from mobile navigation
  const mobileNavItems = document.querySelectorAll('ytd-pivot-bar-item-renderer');
  mobileNavItems.forEach(item => {
    if (item.textContent.includes('Shorts')) {
      item.style.display = 'none';
    }
  });
}

// Check if content matches whitelist
function isWhitelisted(text) {
  if (!whitelist.length) return false;
  
  text = text.toLowerCase();
  return whitelist.some(keyword => text.includes(keyword.toLowerCase()));
}

// Add a status indicator to the page
function addStatusIndicator() {
  // Remove existing indicator if it exists
  const existingIndicator = document.getElementById('ytfocus-status');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  // Create new indicator
  const indicator = document.createElement('div');
  indicator.id = 'ytfocus-status';
  indicator.style.position = 'fixed';
  indicator.style.bottom = '10px';
  indicator.style.right = '10px';
  indicator.style.padding = '5px 10px';
  indicator.style.borderRadius = '20px';
  indicator.style.fontSize = '12px';
  indicator.style.fontWeight = 'bold';
  indicator.style.zIndex = '9999';
  indicator.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  indicator.style.transition = 'all 0.3s ease';
  indicator.style.opacity = '0.7';
  indicator.style.cursor = 'pointer';
  
  // Add hover effect
  indicator.addEventListener('mouseenter', function() {
    indicator.style.opacity = '1';
  });
  
  indicator.addEventListener('mouseleave', function() {
    indicator.style.opacity = '0.7';
  });
  
  // Add click effect to toggle extension
  indicator.addEventListener('click', function() {
    try {
      // FIX: First update the storage, then update the local variable once storage is confirmed updated
      chrome.storage.local.set({ enabled: !extensionEnabled }, function() {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError);
          return;
        }
        // Only change the extensionEnabled variable after successful storage update
        // extensionEnabled = !extensionEnabled;
        processPage();
      });
    } catch (e) {
      // Handle extension context invalidation
      if (e.message && e.message.includes('Extension context invalidated')) {
        indicator.textContent = 'Please refresh page';
        indicator.style.backgroundColor = '#f44336';
        indicator.style.color = 'white';
      } else {
        console.error('Unknown error:', e);
      }
    }
  });
  
  // Add to page
  document.body.appendChild(indicator);
  
  // Update indicator state
  updateStatusIndicator();
}

// Update the status indicator
function updateStatusIndicator() {
  const indicator = document.getElementById('ytfocus-status');
  if (!indicator){ 
    return
  };

  if (timerRunning) {    

    if (timerMode == 'focus') {
      indicator.textContent = 'YouTube Focus: On';
      indicator.style.backgroundColor = '#c00';
      indicator.style.color = 'white';
    } else {
      indicator.textContent = 'YouTube Focus: Off';
      indicator.style.backgroundColor = '#999';
      indicator.style.color = 'white';
      return;
    }
  }
  
  if (!extensionEnabled) {
    indicator.textContent = 'YouTube Focus: Off';
    indicator.style.backgroundColor = '#999';
    indicator.style.color = 'white';
    return;
  }
  else {
    indicator.textContent = 'YouTube Focus: On';
    indicator.style.backgroundColor = '#c00';
    indicator.style.color = 'white';
  }
  
}

// Set up MutationObserver to watch for YouTube's dynamically loaded content
function startObserver() {
  // Stop existing observer if it exists
  if (observer) {
    observer.disconnect();
  }
  
  // Create a new observer
  observer = new MutationObserver(function(mutations) {
    let shouldProcess = false;
    
    // Check if any relevant content was added
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length) {
        shouldProcess = true;
      }
    });
    
    if (shouldProcess) {
      // Slight delay to ensure content is fully loaded
      setTimeout(processPage, 100);
    }
  });
  
  // Start observing the main content area
  const contentArea = document.querySelector('ytd-app') || document.body;
  observer.observe(contentArea, {
    childList: true,
    subtree: true
  });
}

// Initialize the extension when the page is loaded
// Better page load detection
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(init, 500); // Small delay to ensure YouTube has loaded its core components
  });
} else {
  setTimeout(init, 500);
}

// Listen for changes to the settings
// Better storage change listener
chrome.storage.onChanged.addListener(function(changes, areaName) {
  if (areaName !== 'local') return;
  
  try {
    let needsUpdate = false;
    
    if (changes.whitelist) {
      whitelist = changes.whitelist.newValue || [];
      needsUpdate = true;
    }
    
    if (changes.hideShorts !== undefined) {
      hideShorts = changes.hideShorts.newValue;
      needsUpdate = true;
    }
    
    if (changes.enabled !== undefined) {
      extensionEnabled = changes.enabled.newValue;
      needsUpdate = true;
    }
    
    if (changes.timerRunning !== undefined) {
      timerRunning = changes.timerRunning.newValue;
      needsUpdate = true;
    }
    
    if (changes.timerMode) {
      timerMode = changes.timerMode.newValue;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      processPage();
      updateStatusIndicator(); // Ensure UI reflects the update
    }
  } catch (e) {
    console.error('Error handling storage changes:', e);
  }
});

// Listen for messages from popup
// Improve the message listener
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  try {
    if (message.action === "updateUI") {
      processPage();
      updateStatusIndicator();
    }
    if (message.action === 'updateTimer') {
      timerRunning = message.timerRunning;
      timerMode = message.timerMode;
      extensionEnabled = message.enabled;
      processPage();
      // Send confirmation back
      sendResponse({success: true});
    }
    // FIX: Add handler for getModelStatus message if ML features are going to be used
    else if (message.action === 'getModelStatus') {
      // Since ML features are not fully implemented yet, return false
      sendResponse({modelLoaded: false});
    }
  } catch (e) {
    console.error('Error processing message:', e);
    sendResponse({success: false, error: e.message});
  }
  // Return true to indicate you wish to send a response asynchronously
  return true;
});


function computeTFIDF(videoTitles, userInput) {
  const vectorizer = new Map(); // Store word frequency
  const totalDocs = videoTitles.length + 1; // Titles + user input

  function tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')  // Keep hyphens (-)
      .split(/\s+/)  // Split on spaces
      .filter(word => word.length > 2);  // Ignore short words
  }


  function computeTF(text) {
    const words = tokenize(text);
    const wordCount = new Map();
    words.forEach(word => wordCount.set(word, (wordCount.get(word) || 0) + 1));
    return wordCount;
  }

  // Compute document frequency (DF)
  const docFrequency = new Map();
  videoTitles.concat(userInput).forEach(title => {
    const words = new Set(tokenize(title));
    words.forEach(word => docFrequency.set(word, (docFrequency.get(word) || 0) + 1));
  });

  function computeTFIDFVector(text) {
    const tf = computeTF(text);
    const tfidfVector = new Map();
    tf.forEach((count, word) => {
      const idf = Math.log(totalDocs / (1 + (docFrequency.get(word) || 0))); // Avoid division by zero
      tfidfVector.set(word, count * idf);
    });
    return tfidfVector;
  }

  function cosineSimilarity(vec1, vec2) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    vec1.forEach((value, key) => {
        dotProduct += value * (vec2.get(key) || 0);
        normA += value * value;
    });

    vec2.forEach(value => normB += value * value);

    if (normA === 0 || normB === 0) return 0; // Avoid NaN by returning similarity = 0
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }


  const userVector = computeTFIDFVector(userInput);


  return videoTitles.map(title => {
    const videoVector = computeTFIDFVector(title);
    
    return {
        title,
        similarity: cosineSimilarity(videoVector, userVector)
    };
  });

}