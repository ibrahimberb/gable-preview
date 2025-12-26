// Get experiment from URL parameter
function getExperimentFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("experiment");
}

// Show loading overlay
function showLoadingOverlay() {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    overlay.classList.remove("hidden");
  }
}

// Hide loading overlay
function hideLoadingOverlay() {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    overlay.classList.add("hidden");
  }
}

// Get experiment display name
function getExperimentDisplayName(experiment) {
  // Always return STROBE as the display name
  return "STROBE - Stroop Task for Repeated Observation of Behavioral Effects";
}

// Refresh user info display
async function refreshUserInfo() {
  const experiment = getExperimentFromURL();
  if (!experiment) return;

  console.log(`[refreshUserInfo] Fetching user info from server...`);
  try {
    const response = await fetch(`/api/check-auth?experiment=${experiment}`);
    const data = await response.json();

    if (data.authenticated && data.userInfo) {
      console.log(`[refreshUserInfo] Received userInfo - trialNumber: ${data.userInfo.trialNumber}, sessionNumber: ${data.userInfo.sessionNumber}`);
      const userInfoDisplay = document.getElementById("user-info-display");
      if (userInfoDisplay) {
        userInfoDisplay.textContent = JSON.stringify(data.userInfo, null, 2);
      }
      window.currentUserInfo = data.userInfo;
      console.log(`[refreshUserInfo] Updated window.currentUserInfo`);
    } else {
      console.warn(`[refreshUserInfo] No userInfo in response or not authenticated`);
    }
  } catch (error) {
    console.error("Error refreshing user info:", error);
  }
}

// Load experiment configuration
async function loadExperimentConfig() {
  const experiment = getExperimentFromURL();
  if (!experiment) return;

  try {
    const response = await fetch(
      `/api/experiment-config?experiment=${experiment}`
    );
    const config = await response.json();

    const configDisplay = document.getElementById("experiment-config-display");
    if (response.ok && config) {
      configDisplay.textContent = JSON.stringify(config, null, 2);

      // Initialize trials with config
      if (window.initializeTrials) {
        window.initializeTrials(config);
      }
    } else {
      configDisplay.textContent = "No config found";
    }
  } catch (error) {
    console.error("Error loading experiment config:", error);
    document.getElementById("experiment-config-display").textContent =
      "Error loading config";
  }
}

// Check authentication status on page load
async function checkAuth() {
  const experiment = getExperimentFromURL();
  if (!experiment) {
    window.location.href = "/";
    return;
  }

  try {
    const response = await fetch(`/api/check-auth?experiment=${experiment}`);
    const data = await response.json();

    if (data.authenticated && data.experiment === experiment) {
      // User is authenticated, show experiment page
      const usernameEl = document.getElementById("username-display");
      if (usernameEl) {
        usernameEl.textContent = data.username;
      }

      const experimentTitleEl = document.getElementById("experiment-title");
      if (experimentTitleEl) {
        experimentTitleEl.textContent = getExperimentDisplayName(experiment);
      }

      // Display user info in debug panel
      const userInfoDisplay = document.getElementById("user-info-display");
      if (userInfoDisplay) {
        if (data.userInfo) {
          userInfoDisplay.textContent = JSON.stringify(data.userInfo, null, 2);
        } else {
          userInfoDisplay.textContent = "No user info found";
        }
      }

      // Display current session ID
      const sessionNumberEl = document.getElementById("current-session-id");
      if (sessionNumberEl && data.userInfo && data.userInfo.sessionNumber) {
        sessionNumberEl.textContent = data.userInfo.sessionNumber;
      }

      // Store userInfo globally for trial restoration
      window.currentUserInfo = data.userInfo;

      // Load experiment config
      loadExperimentConfig();
    } else {
      // Not authenticated, redirect to login
      window.location.href = `login.html?experiment=${experiment}`;
    }
  } catch (error) {
    console.error("Error checking auth:", error);
    window.location.href = `login.html?experiment=${experiment}`;
  }
}

// Display status message
function showStatusMessage(message, type = "info") {
  const statusEl = document.getElementById("status-message");
  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;
  statusEl.style.display = "block";
}

// Clear status message
function clearStatusMessage() {
  const statusEl = document.getElementById("status-message");
  statusEl.textContent = "";
  statusEl.className = "status-message";
  statusEl.style.display = "none";
}

// Handle flush user button click
const flushUserBtn = document.getElementById("flush-user-btn");
if (flushUserBtn) {
  flushUserBtn.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to flush all user data? This will clear login history and trial timing data.")) {
      return;
    }

    try {
      const response = await fetch("/api/flush-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert("User data flushed successfully!");
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        alert(data.error || "Failed to flush user data");
      }
    } catch (error) {
      console.error("Flush user error:", error);
      alert("An error occurred while flushing user data");
    }
  });
}

// Handle logout button click
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    const experiment = getExperimentFromURL();

    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ experiment }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Redirect to login page after successful logout
        window.location.href = `login.html?experiment=${experiment}`;
      } else {
        showStatusMessage(data.error || "Logout failed", "error");
      }
    } catch (error) {
      console.error("Logout error:", error);
      showStatusMessage("An error occurred during logout", "error");
    }
  });
}

// Trial Management Functions
const trialStates = {};
let totalTrials = 10; // Default value, will be updated from config

// Check if trial is accessible (previous trial must be completed)
function isTrialAccessible(trialNumber) {
  if (trialNumber === 1) return true; // First trial is always accessible
  const previousTrialState = trialStates[trialNumber - 1];
  return previousTrialState === "completed";
}

// Update trial UI based on state and accessibility
function updateTrialUI(trialNumber) {
  const state = trialStates[trialNumber];
  const card = document.querySelector(`[data-trial-id="${trialNumber}"]`);
  const img = card.querySelector("img");
  const btn = card.querySelector("button");
  const accessible = isTrialAccessible(trialNumber);

  if (state === "not-started") {
    img.style.filter = "grayscale(100%) brightness(0.7)";
    if (accessible) {
      btn.textContent = "Start the Trial";
      btn.className =
        "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-all w-full mb-3";
      btn.disabled = false;
    } else {
      btn.textContent = "Locked";
      btn.className =
        "bg-gray-300 text-gray-500 px-6 py-2 rounded-md font-medium w-full mb-3 cursor-not-allowed";
      btn.disabled = true;
    }
  } else if (state === "in-progress") {
    img.style.filter = "none";
    btn.textContent = "Complete the Trial";
    btn.className =
      "bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium transition-all w-full mb-3";
    btn.disabled = false;
  } else if (state === "completed") {
    img.style.filter = "none";
    btn.innerHTML = "Trial Completed ✓";
    btn.className =
      "bg-gray-400 text-white px-6 py-2 rounded-md font-medium w-full mb-3 cursor-not-allowed";
    btn.disabled = true;
  }
}

// Update all trials UI (needed when one trial is completed to unlock next)
function updateAllTrialsUI() {
  for (let i = 1; i <= totalTrials; i++) {
    updateTrialUI(i);
  }
}

// Run jsPsych trial
async function runJsPsychTrial(trialNumber) {
  // Hide main content and show jsPsych container
  document.getElementById('team').classList.add('hidden');
  document.querySelector('nav').classList.add('hidden');
  document.querySelector('footer').classList.add('hidden');
  document.querySelector('aside').classList.add('hidden');
  const container = document.getElementById('jspsych-container');
  container.classList.remove('hidden');
  container.innerHTML = ''; // Clear any previous content

  // Initialize jsPsych with display element
  const jsPsych = initJsPsych({
    display_element: 'jspsych-container',
    on_finish: function() {
      // Clear jsPsych content
      container.innerHTML = '';
      // Hide jsPsych container and show main content
      container.classList.add('hidden');
      document.getElementById('team').classList.remove('hidden');
      document.querySelector('nav').classList.remove('hidden');
      document.querySelector('footer').classList.remove('hidden');
      document.querySelector('aside').classList.remove('hidden');
    }
  });

  // Create a simple trial
  const trial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div style="font-size: 32px; margin: 40px;">
                 <p style="font-size: 48px; margin-bottom: 20px;">Trial ${trialNumber}</p>
                 <p>Click the button that matches the color of the word:</p>
                 <p style="font-size: 64px; color: blue; font-weight: bold; margin: 40px;">RED</p>
               </div>`,
    choices: ['Red', 'Blue', 'Green'],
    prompt: '<p>Make your choice</p>'
  };

  // Run the experiment
  await jsPsych.run([trial]);
}

// Handle button clicks - advance state
async function handleTrialButtonClick(trialNumber) {
  const state = trialStates[trialNumber];
  const card = document.querySelector(`[data-trial-id="${trialNumber}"]`);
  const statusMsg = card.querySelector(".trial-status-msg");

  if (state === "not-started") {
    // Run jsPsych experiment for this trial
    await runJsPsychTrial(trialNumber);
    
    // Show loading overlay while saving
    showLoadingOverlay();
    
    try {
      trialStates[trialNumber] = "in-progress";

      // Get current session ID from the page or from userInfo
      const userInfo = window.currentUserInfo;
      const sessionNumber = userInfo ? userInfo.sessionNumber : null;

      // Print trial start data
      const trialStartData = {
        [`session_${sessionNumber}`]: {
          [`trial_${trialNumber}`]: new Date().toISOString(),
        },
      };
      console.log("Trial Start:", trialStartData);

      // Save to server
      const response = await fetch("/api/trial-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionNumber, trialNumber }),
      });
      const data = await response.json();

      if (data.success) {
        statusMsg.textContent = `✓ Started at ${new Date(
          data.timestamp
        ).toLocaleTimeString()}`;
        statusMsg.className = "trial-status-msg text-green-600 text-xs mt-2";
      } else {
        statusMsg.textContent = "⚠ Failed to save";
        statusMsg.className = "trial-status-msg text-red-600 text-xs mt-2";
      }
    } catch (error) {
      console.error("Error saving trial start:", error);
      statusMsg.textContent = "⚠ Error saving";
      statusMsg.className = "trial-status-msg text-red-600 text-xs mt-2";
    } finally {
      // Hide loading overlay
      hideLoadingOverlay();
    }
  } else if (state === "in-progress") {
    // Show loading overlay while saving
    showLoadingOverlay();
    
    try {
      trialStates[trialNumber] = "completed";

      // Get current session ID from userInfo
      let userInfo = window.currentUserInfo;
      const sessionNumber = userInfo ? userInfo.sessionNumber : null;
      
      console.log(`[Trial Complete] BEFORE API call - trialNumber in userInfo: ${userInfo?.trialNumber}`);

      // Save to server
      const response = await fetch("/api/trial-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionNumber, trialNumber }),
      });
      const data = await response.json();

      if (data.success) {
        statusMsg.textContent = `✓ Trial completed at ${new Date(
          data.timestamp
        ).toLocaleTimeString()}`;
        statusMsg.className = "trial-status-msg text-gray-600 text-xs mt-2";
        
        // Refresh user info first to get updated trialNumber
        console.log(`[Trial Complete] Refreshing user info after trial ${trialNumber}`);
        await refreshUserInfo();
        
        // Check if this was the last trial - show complete session button
        userInfo = window.currentUserInfo;  // Re-assign, don't declare new const
        console.log(`[Trial Complete] AFTER refresh - trialNumber: ${userInfo?.trialNumber}, totalTrials: ${totalTrials}`);
        console.log(`[Trial Complete] Full userInfo after refresh:`, JSON.stringify(userInfo, null, 2));
        
        if (userInfo && userInfo.trialNumber > totalTrials) {
          console.log(`[Trial Complete] ✅ CONDITION MET! All trials completed! Showing complete session button`);
          const endSessionBtn = document.getElementById("end-session-btn");
          if (endSessionBtn) {
            endSessionBtn.classList.remove("hidden");
            console.log(`[Trial Complete] ✅ Button visibility toggled - button should now be visible`);
          } else {
            console.error(`[Trial Complete] ❌ Button element not found!`);
          }
        } else {
          console.log(`[Trial Complete] ⏳ More trials remaining (${userInfo?.trialNumber} <= ${totalTrials})`);
        }
      } else {
        statusMsg.textContent = "⚠ Failed to save completion";
        statusMsg.className = "trial-status-msg text-red-600 text-xs mt-2";
      }
    } catch (error) {
      console.error("Error saving trial complete:", error);
      statusMsg.textContent = "⚠ Error saving completion";
      statusMsg.className = "trial-status-msg text-red-600 text-xs mt-2";
    } finally {
      // Hide loading overlay
      hideLoadingOverlay();
    }
  }
  
  updateAllTrialsUI(); // Update all trials to unlock next one
  checkSessionCompleted(); // Check if session is completed after trial action
}

// Generate trial cards dynamically based on config
function generateTrialCards() {
  const itemsContainer = document.getElementById("items-container");
  itemsContainer.innerHTML = ""; // Clear existing cards

  // Initialize trial states based on trialNumber field
  const userInfo = window.currentUserInfo;
  const sessionNumber = userInfo ? userInfo.sessionNumber : null;
  const sessionKey = `session_${sessionNumber}`;
  const currenttrialNumber = userInfo ? userInfo.trialNumber : 1;
  const completedTrials = userInfo?.trialCompletedTimesData?.[sessionKey] || {};
  const startedTrials = userInfo?.trialStartTimesData?.[sessionKey] || {};

  for (let i = 1; i <= totalTrials; i++) {
    if (i < currenttrialNumber) {
      trialStates[i] = "completed";
    } else if (i === currenttrialNumber) {
      // Check if current trial was started
      const trialKey = `trial_${i}`;
      if (startedTrials[trialKey]) {
        trialStates[i] = "in-progress";
      } else {
        trialStates[i] = "not-started";
      }
    } else {
      trialStates[i] = "not-started";
    }
  }

  // Create trial cards
  for (let i = 0; i < totalTrials; i++) {
    const trialNumber = i + 1;
    const item = document.createElement("div");
    item.className =
      "bg-white rounded-lg overflow-hidden shadow-md text-center p-6 card-hover transition-all flex-shrink-0 w-64";
    item.setAttribute("data-trial-id", trialNumber);
    item.innerHTML = `
            <h3 class="text-xl font-semibold text-gray-900 mb-4">Trial ${trialNumber}</h3>
            <div class="w-32 h-32 rounded-full bg-blue-100 mx-auto mb-4 overflow-hidden">
                <img src="images/shape.png" 
                     alt="Trial ${trialNumber}" 
                     class="w-full h-full object-cover transition-all" 
                     style="filter: grayscale(100%) brightness(0.7);">
            </div>
            <button class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-all w-full mb-3">
                Start the Trial
            </button>
            <p class="trial-status-msg text-gray-400 text-xs mt-2"></p>
        `;

    // Restore status message from saved data
    const statusMsg = item.querySelector(".trial-status-msg");
    const trialKey = `trial_${trialNumber}`;
    const state = trialStates[trialNumber];

    if (state === "completed") {
      // Show completed time if available, otherwise just show completed
      if (completedTrials[trialKey]) {
        const time = new Date(completedTrials[trialKey]).toLocaleTimeString();
        statusMsg.textContent = `✓ Trial completed at ${time}`;
      } else {
        statusMsg.textContent = "✓ Trial completed";
      }
      statusMsg.className = "trial-status-msg text-gray-600 text-xs mt-2";
    } else if (state === "in-progress") {
      // Show started time if available
      if (startedTrials[trialKey]) {
        const time = new Date(startedTrials[trialKey]).toLocaleTimeString();
        statusMsg.textContent = `✓ Started at ${time}`;
      } else {
        statusMsg.textContent = "In progress";
      }
      statusMsg.className = "trial-status-msg text-green-600 text-xs mt-2";
    } else {
      statusMsg.textContent = "Not started";
      statusMsg.className = "trial-status-msg text-gray-400 text-xs mt-2";
    }

    // Attach click handler
    const btn = item.querySelector("button");
    btn.addEventListener("click", () => handleTrialButtonClick(trialNumber));

    itemsContainer.appendChild(item);
  }

  // Initialize all trial UIs
  updateAllTrialsUI();
}

// Check if session is completed
function checkSessionCompleted() {
  const userInfo = window.currentUserInfo;
  console.log(`[checkSessionCompleted] trialNumber: ${userInfo?.trialNumber}, totalTrials: ${totalTrials}`);
  
  if (userInfo && userInfo.trialNumber > totalTrials) {
    // Show the complete session button
    const endSessionBtn = document.getElementById("end-session-btn");
    if (endSessionBtn) {
      endSessionBtn.classList.remove("hidden");
      console.log(`[checkSessionCompleted] Showing complete session button`);
    }
  }
}

// Initialize trials with config (called from loadExperimentConfig)
window.initializeTrials = function (config) {
  if (config && config.totalTrials) {
    totalTrials = config.totalTrials;
  }
  generateTrialCards();
  checkSessionCompleted();
  
  // Disable trials until Start Session is clicked
  disableAllTrials();
};

// Setup horizontal scroll with mouse wheel
function setupHorizontalScroll() {
  const scrollableContainer = document.getElementById("scrollable-container");
  if (scrollableContainer) {
    scrollableContainer.addEventListener("wheel", (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        scrollableContainer.scrollBy({
          left: e.deltaY * 3,
          behavior: "smooth",
        });
      }
    });
  }
}

// Disable all trial cards
function disableAllTrials() {
  const scrollableContainer = document.getElementById("scrollable-container");
  if (scrollableContainer) {
    scrollableContainer.style.pointerEvents = "none";
    scrollableContainer.style.opacity = "0.5";
  }
}

// Enable all trial cards
function enableAllTrials() {
  const scrollableContainer = document.getElementById("scrollable-container");
  if (scrollableContainer) {
    scrollableContainer.style.pointerEvents = "auto";
    scrollableContainer.style.opacity = "1";
  }
}

// Setup start session button
function setupSessionButtons() {
  const startSessionBtn = document.getElementById("start-session-btn");
  if (startSessionBtn) {
    startSessionBtn.addEventListener("click", async () => {
      try {
        const response = await fetch('/api/start-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        
        if (data.success) {
          startSessionBtn.textContent = "Session started!";
          startSessionBtn.disabled = true;
          startSessionBtn.className =
            "mt-4 bg-gray-400 text-white px-8 py-3 rounded-md font-semibold cursor-not-allowed";
          
          // Enable trial cards
          enableAllTrials();
          
          // Refresh user info to show session start time
          await refreshUserInfo();
        }
      } catch (error) {
        console.error('Error starting session:', error);
      }
    });
  }

  const endSessionBtn = document.getElementById("end-session-btn");
  if (endSessionBtn) {
    endSessionBtn.addEventListener("click", async () => {
      try {
        const response = await fetch('/api/complete-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        
        if (data.success) {
          endSessionBtn.textContent = "Session completed ✅";
          endSessionBtn.disabled = true;
          endSessionBtn.className =
            "bg-gray-400 text-white px-8 py-3 rounded-md font-semibold cursor-not-allowed";
          
          const userInfo = window.currentUserInfo;
          const sessionNumber = userInfo ? userInfo.sessionNumber : null;
          const messageEl = document.getElementById("session-completed-message");
          if (messageEl) {
            messageEl.textContent = `Thanks for completing the Session ${sessionNumber}! You may now close the browser or navigate away.`;
            messageEl.classList.remove("hidden");
            console.log(`[checkSessionCompleted] Showing session completed message`);
          }

          // Refresh user info to show new session
          await refreshUserInfo();
        }
      } catch (error) {
        console.error('Error completing session:', error);
      }
    });
  }
}

// Initialize on page load
checkAuth();
setupHorizontalScroll();
setupSessionButtons();
