// background.js

// Handle side panel toggle explicitly if needed
// In Manifest V3 "side_panel", clicking the icon usually opens it by default if "default_path" is set.
// But we can also programmatically open it.

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Listen for tab updates to enable/disable or just log
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes('leetcode.com') || tab.url.includes('codeforces.com')) {
      // Valid site
      console.log('DSA Buddy: Valid site detected', tab.url);
    }
  }
});
