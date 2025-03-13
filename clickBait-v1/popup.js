document.addEventListener('DOMContentLoaded', function() {
  // Elements
  const extensionEnabledToggle = document.getElementById('extensionEnabled');
  const hideShortsToggle = document.getElementById('hideShorts');
  const whitelistTextarea = document.getElementById('whitelist');
  const saveButton = document.getElementById('saveBtn');
  const statusText = document.getElementById('status');
  const timerDisplay = document.getElementById('timerDisplay');
  const startTimerButton = document.getElementById('startTimer');
  const resetTimerButton = document.getElementById('resetTimer');
  const timerStatusElement = document.getElementById('timerStatus');
  const focusTimeInput = document.getElementById('focusTime');
  const breakTimeInput = document.getElementById('breakTime');
  
  // Variables
  let timerInterval = null;
  let timeLeft = 0;
  let timerMode = 'focus';
  let timerRunning = false;
  
  // Load settings
  function loadSettings() {
    chrome.storage.local.get({
      // Default values
      whitelist: [],
      hideShorts: true,
      enabled: true,
      timerRunning: false,
      timerMode: 'focus',
      focusTime: 25,
      breakTime: 5,
      timeLeft: 0
    }, function(items) {
      // Populate form
      whitelistTextarea.value = items.whitelist.join('\n');
      hideShortsToggle.checked = items.hideShorts;
      extensionEnabledToggle.checked = items.enabled;
      focusTimeInput.value = items.focusTime;
      breakTimeInput.value = items.breakTime;
      
      // Set timer state
      timerRunning = items.timerRunning;
      timerMode = items.timerMode;
      timeLeft = items.timeLeft || (timerMode === 'focus' ? 
        parseInt(focusTimeInput.value, 10) * 60 : parseInt(breakTimeInput.value, 10) * 60);
      
      // Update UI to reflect current state
      updateTimerDisplay();
      updateTimerButton();
      
      // If timer was running when popup was closed, restart it
      if (timerRunning) {
        startTimer();
      }
    });
  }
  
  // Save settings
  function saveSettings() {
    // Get whitelist as array of non-empty strings
    const whitelist = whitelistTextarea.value
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    const hideShorts = hideShortsToggle.checked;
    const enabled = extensionEnabledToggle.checked;
    const focusTime = parseInt(focusTimeInput.value, 10) || 25;
    const breakTime = parseInt(breakTimeInput.value, 10) || 5;
    
    // Save to storage
    chrome.storage.local.set({
      whitelist: whitelist,
      hideShorts: hideShorts,
      enabled: enabled,
      focusTime: focusTime,
      breakTime: breakTime,
      timerRunning: timerRunning,
      timerMode: timerMode,
      timeLeft: timeLeft
    }, function() {
      // Check for error
      if (chrome.runtime.lastError) {
        statusText.textContent = 'Error saving settings!';
        console.error('Storage error:', chrome.runtime.lastError);
        return;
      }
      
      // Update status
      statusText.textContent = 'Settings saved!';
      setTimeout(function() {
        statusText.textContent = '';
      }, 1500);
      
      // Notify content script
      notifyContentScript();
    });
  }
  
  // Notify all YouTube tabs about the update
  function notifyContentScript() {
    chrome.tabs.query({url: '*://*.youtube.com/*'}, function(tabs) {
      if (tabs.length === 0) return;
      
      tabs.forEach(function(tab) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'updateTimer',
          timerRunning: timerRunning,
          timerMode: timerMode,
          enabled: extensionEnabledToggle.checked
        }, function(response) {
          // Handle potential errors with chrome messaging
          if (chrome.runtime.lastError) {
            console.log('Could not communicate with tab:', chrome.runtime.lastError);
            return;
          }
          
          if (response && response.success) {
            console.log('Tab updated successfully');
          }
        });
      });
    });
  }
  
  // Format time as MM:SS
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Update timer display
  function updateTimerDisplay() {
    timerDisplay.textContent = formatTime(timeLeft);
    
    // Update mode indicator
    if (timerRunning) {
      timerStatusElement.textContent = timerMode === 'focus' ? 'Focus mode' : 'Break time';
      timerStatusElement.className = timerMode === 'focus' ? 'focus-mode' : 'break-mode';
      
      // Add visual indicator by changing timer display color
      timerDisplay.style.color = timerMode === 'focus' ? '#c00' : '#4CAF50';
    } else {
      timerStatusElement.textContent = '';
      timerStatusElement.className = '';
      timerDisplay.style.color = '#c00';
    }
  }
  
  // Update start button text
  function updateTimerButton() {
    startTimerButton.textContent = timerRunning ? 'Pause' : 'Start';
    startTimerButton.className = timerRunning ? 'pause' : 'start';
  }
  
  // Start timer
  function startTimer() {
    // Clear any existing interval
    clearInterval(timerInterval);
    
    // Start new interval
    timerRunning = true;
    timerInterval = setInterval(timerTick, 1000);
    
    updateTimerButton();
  }
  
  // Toggle timer (start/pause)
  function toggleTimer() {
    if (timerRunning) {
      // Pause timer
      clearInterval(timerInterval);
      timerRunning = false;
    } else {
      // If timer is at 0, reset to appropriate time
      if (timeLeft <= 0) {
        timeLeft = timerMode === 'focus' ? 
          parseInt(focusTimeInput.value, 10) * 60 : 
          parseInt(breakTimeInput.value, 10) * 60;
      }
      
      // Start timer
      startTimer();
    }
    
    updateTimerButton();
    saveSettings(); // Save state
    notifyContentScript();
  }
  
  // Timer tick
  function timerTick() {
    if (timeLeft <= 0) {
      // Timer finished, switch modes
      clearInterval(timerInterval);
      
      // Switch modes
      timerMode = timerMode === 'focus' ? 'break' : 'focus';
      timeLeft = timerMode === 'focus' ? 
        parseInt(focusTimeInput.value, 10) * 60 : 
        parseInt(breakTimeInput.value, 10) * 60;
      
      // Play notification sound if available
      try {
        // Create notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icon128.png'),
          title: timerMode === 'focus' ? 'Time to focus!' : 'Take a break!',
          message: timerMode === 'focus' ? 
            `Focus time: ${focusTimeInput.value} minutes` : 
            `Break time: ${breakTimeInput.value} minutes`
        });
      } catch (error) {
        console.log('Notification error:', error);
      }
      
      updateTimerDisplay();
      saveSettings();
      notifyContentScript();
      
      // Continue timer
      startTimer();
    } else {
      timeLeft--;
      updateTimerDisplay();
      
      // Save time left occasionally (every 15 seconds)
      if (timeLeft % 15 === 0) {
        chrome.storage.local.set({timeLeft: timeLeft});
      }
    }
  }
  
  // Reset timer
  function resetTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    timerMode = 'focus';
    timeLeft = parseInt(focusTimeInput.value, 10) * 60;
    
    updateTimerDisplay();
    updateTimerButton();
    saveSettings();
    notifyContentScript();
  }
  
  // Input validation for time inputs
  function validateTimeInput(input) {
    const value = parseInt(input.value, 10);
    if (isNaN(value) || value < 1) {
      input.value = input.id === 'focusTime' ? 25 : 5;
    } else if (input.id === 'focusTime' && value > 120) {
      input.value = 120;
    } else if (input.id === 'breakTime' && value > 60) {
      input.value = 60;
    }
  }
  
  // Event listeners
  saveButton.addEventListener('click', saveSettings);
  startTimerButton.addEventListener('click', toggleTimer);
  resetTimerButton.addEventListener('click', resetTimer);
  
  // Validate and auto-save time inputs when they change
  focusTimeInput.addEventListener('change', function() {
    validateTimeInput(this);
    // Only reset timer if we're in focus mode and timer isn't running
    if (timerMode === 'focus' && !timerRunning) {
      timeLeft = parseInt(this.value, 10) * 60;
      updateTimerDisplay();
    }
    saveSettings();
  });
  
  breakTimeInput.addEventListener('change', function() {
    validateTimeInput(this);
    // Only reset timer if we're in break mode and timer isn't running
    if (timerMode === 'break' && !timerRunning) {
      timeLeft = parseInt(this.value, 10) * 60;
      updateTimerDisplay();
    }
    saveSettings();
  });
  
  // Auto-save when toggle switches change
  extensionEnabledToggle.addEventListener('change', saveSettings);
  hideShortsToggle.addEventListener('change', saveSettings);
  
  // Keep popup open when clicking inside textareas and inputs
  document.querySelectorAll('textarea, input').forEach(element => {
    element.addEventListener('click', function(event) {
      event.stopPropagation();
    });
  });
  
  // Handle keyboard shortcuts
  document.addEventListener('keydown', function(event) {
    // Space bar toggles timer
    if (event.code === 'Space' && document.activeElement.tagName !== 'TEXTAREA' && 
        document.activeElement.tagName !== 'INPUT') {
      event.preventDefault();
      toggleTimer();
    }
    
    // R key resets timer
    if (event.code === 'KeyR' && document.activeElement.tagName !== 'TEXTAREA' && 
        document.activeElement.tagName !== 'INPUT') {
      event.preventDefault();
      resetTimer();
    }
  });
  
  // Initialize all settings
  loadSettings();
});