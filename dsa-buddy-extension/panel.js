// panel.js

const getHintsBtn = document.getElementById('get-hints-btn');
const statusMsg = document.getElementById('status-message');
const loader = document.getElementById('loader');
const hintsContainer = document.getElementById('hints-container');
const problemTitleDisplay = document.getElementById('problem-title');

// Backend URL
const SERVER_URL = 'http://localhost:3001/hints';

let currentProblemData = null;
let currentMode = 'standard';

// Mode Selection Logic
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove active class from all
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    // Add to clicked
    btn.classList.add('active');
    currentMode = btn.getAttribute('data-mode');
  });
});

// --- 1. Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
  console.log('DSA Buddy Panel Loaded');
  init();
});

// Initialize
function init() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (activeTab.url && (activeTab.url.includes('leetcode.com') || activeTab.url.includes('codeforces.com'))) {
      getGetProblemData(activeTab.id);
    } else {
      showError('Please navigate to LeetCode or Codeforces.');
      getHintsBtn.disabled = true;
    }
  });
}

function getGetProblemData(tabId) {
  loader.classList.remove('hidden');
  statusMsg.textContent = 'Connecting to page...';
  
  // Send message to content script
  chrome.tabs.sendMessage(tabId, { action: 'GET_PROBLEM_DATA' }, (response) => {
    loader.classList.add('hidden');
    
    if (chrome.runtime.lastError) {
      showError('Could not communicate with page. Try reloading the tab.');
      console.error(chrome.runtime.lastError);
      return;
    }

    if (response && response.error) {
      showError(response.error);
    } else if (response) {
      currentProblemData = response;
      problemTitleDisplay.textContent = response.title || 'Unknown Problem';
      statusMsg.textContent = '';
      getHintsBtn.disabled = false;
      console.log('Data received:', response);
    }
  });
}

// Re-check when tab updates or activates
chrome.tabs.onActivated.addListener(init);

getHintsBtn.addEventListener('click', async () => {
  if (!currentProblemData) return;

  // Reset UI
  hintsContainer.classList.add('hidden');
  loader.classList.remove('hidden');
  getHintsBtn.disabled = true;
  statusMsg.textContent = `Asking ${currentMode === 'standard' ? 'Gemini' : 'Logic Doctor'}...`;

  try {
    const requestData = { 
        ...currentProblemData, 
        mode: currentMode 
    };

    const response = await fetch(SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
        if (response.status === 429) {
            throw new Error('Rate Limit: Please wait a moment.');
            
        }
      throw new Error(`Server Error: ${response.status}`);
    }

    const data = await response.json();
    displayHints(data);
    statusMsg.textContent = 'Analysis Loaded!';
  } catch (err) {
    statusMsg.textContent = err.message || 'Error fetching hints.';
    console.error(err);
    // alert('Failed to get hints. Is the local server running?');
  } finally {
    loader.classList.add('hidden');
    getHintsBtn.disabled = false;
  }
});

function displayHints(hints) {
  hintsContainer.classList.remove('hidden');
  
  // Fill content - function to render markdown
  const render = (text) => {
      if (!text) return 'No data available.';
      // Simple markdown parser for bold and code
      let html = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>') // Inline code
        .replace(/\n/g, '<br>'); // Newlines
      
      return html;
  };

  // Syntax Highlighting Function
  const renderSnippet = (code, title) => {
      if (!code) return '';
      let html = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      const tokens = [];
      const saveToken = (type, content) => {
          const id = `__TOKEN_${tokens.length}__`;
          tokens.push({ id, content: `<span class="hljs-${type}">${content}</span>` });
          return id;
      };

      html = html.replace(/"(.*?)"|'(.*?)'/g, (match) => saveToken('string', match));
      html = html.replace(/\/\/.*/g, (match) => saveToken('comment', match));

      const keywords = /\b(public|private|static|void|int|char|boolean|new|class|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|throws|extends|implements|this|super|null|true|false|const|let|var|function|async|await|import|from)\b/g;
      
      html = html.replace(keywords, '<span class="hljs-keyword">$&</span>');
      html = html.replace(/\b\d+\b/g, '<span class="hljs-number">$&</span>');

      [...tokens].reverse().forEach(token => {
          html = html.split(token.id).join(token.content);
      });
      
      return `
        <div class="snippet-box">
            <div class="snippet-header">
                <span class="icon">Snippet</span>
                <span>${title}</span>
            </div>
            <pre><code>${html}</code></pre>
        </div>`;
  };

  // 1. Render Hints (Text Only)
  document.getElementById('hint1').innerHTML = render(hints.hint1);
  document.getElementById('hint2').innerHTML = render(hints.hint2);
  document.getElementById('hint3').innerHTML = render(hints.hint3);

  // 2. Render Snippets (Aggregated at bottom)
  const snippetsWrapper = document.getElementById('snippets-wrapper');
  const snippetsSection = document.getElementById('snippets-section');
  
  snippetsWrapper.innerHTML = ''; // Clear previous
  let hasSnippets = false;

  if (hints.snippet1) {
      snippetsWrapper.innerHTML += renderSnippet(hints.snippet1, "For Hint 1");
      hasSnippets = true;
  }
  if (hints.snippet2) {
      snippetsWrapper.innerHTML += renderSnippet(hints.snippet2, "For Hint 2");
      hasSnippets = true;
  }
  if (hints.snippet3) {
      snippetsWrapper.innerHTML += renderSnippet(hints.snippet3, "For Hint 3");
      hasSnippets = true;
  }

  if (hasSnippets) {
      snippetsSection.classList.remove('hidden');
  } else {
      snippetsSection.classList.add('hidden');
  }

  // Reset visibility
  document.querySelectorAll('.hint-content').forEach(el => el.classList.remove('visible'));
  
  // Re-attach event listeners (simple toggle)
  const buttons = document.querySelectorAll('.hint-header');
  buttons.forEach(btn => {
    // Cloning to remove old listeners
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener('click', () => {
      const content = newBtn.nextElementSibling;
      content.classList.toggle('visible');
      const arrow = newBtn.querySelector('.arrow');
      if (content.classList.contains('visible')) {
        arrow.style.transform = 'rotate(180deg)';
      } else {
        arrow.style.transform = 'rotate(0deg)';
      }
    });
  });
}

function showError(msg) {
  statusMsg.textContent = msg;
  statusMsg.style.color = '#ff5252';
  if (msg.includes('communicate')) {
    statusMsg.innerHTML = `${msg} <br><button onclick="chrome.tabs.reload()" style="margin-top:5px;padding:4px;cursor:pointer;">Refresh Page</button>`;
  }
}

// End of file
