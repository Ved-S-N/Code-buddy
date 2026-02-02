// content.js
console.log('DSA Buddy Content Script Loaded');

// Listen for requests from the side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_PROBLEM_DATA') {
    getProblemData(sendResponse);
    return true; // async response
  }
});

function getProblemData(sendResponse) {
  const url = window.location.href;
  
  if (url.includes('leetcode.com')) {
    extractLeetCode(sendResponse);
  } else if (url.includes('codeforces.com')) {
    extractCodeforces(sendResponse);
  } else {
    sendResponse({ error: 'Not a supported DSA site.' });
  }
}

// ------ LeetCode Extraction ------
function extractLeetCode(sendResponse) {
  // Title
  // Leetcode DOM is messy. Try common selectors.
  const titleElem = document.querySelector('[data-cy="question-title"]') 
                 || document.querySelector('.text-title-large')
                 || document.querySelector('div.flex.items-start.justify-between.gap-4 > div.flex.items-center.gap-2 > div');
  
  const title = titleElem ? titleElem.innerText : 'Unknown Title';

  // Description
  const descElem = document.querySelector('[data-cy="question-content"]')
                || document.querySelector('.elfjS'); // obscure class from recent LC
  const description = descElem ? descElem.innerText : 'Description not found. Please ensure you are on the problem page.';

  // Code
  // Attempt to read Monaco editor lines from DOM since we can't easily access window.monaco from here content script
  // .view-lines contains the visible lines, but not full code if scrolled. 
  // Better approach: use the text content of the view-lines as a fallback.
  // We prefer to try and get full content via clipboard or injected script.
  // For MVP simplicity, we will try to scrape the visible text.
  const codeLines = document.querySelectorAll('.view-line');
  let code = '';
  if (codeLines.length > 0) {
    codeLines.forEach(line => {
      code += line.innerText + '\n';
    });
  } else {
    code = '// Code not detected. Please make sure the editor is visible.';
  }

  sendResponse({
    platform: 'LeetCode',
    title,
    description: description.substring(0, 5000), // Limit length
    code: code.substring(0, 10000)
  });
}

// ------ Codeforces Extraction ------
function extractCodeforces(sendResponse) {
  // Title
  const titleElem = document.querySelector('.problem-statement .title');
  const title = titleElem ? titleElem.innerText : 'Unknown Title';

  // Description
  const statement = document.querySelector('.problem-statement');
  let description = '';
  if (statement) {
    // Clone to remove some stuff if needed, but innerText is usually okay
    description = statement.innerText;
  } else {
    description = 'Description not found';
  }

  // Code
  // Codeforces usually has a "Submit" page or "Custom Test"
  // If on a problem page, the user might not have an editor open unless they toggled standard editor.
  // We will look for Ace editor or textarea.
  const textarea = document.querySelector('textarea#source') || document.querySelector('.ace_text-layer');
  let code = '';
  
  if (textarea) {
    if (textarea.tagName === 'TEXTAREA') {
        code = textarea.value;
    } else {
        // Ace editor DOM text
        code = textarea.innerText; // Very rough
    }
  } else {
    code = '// No code editor found. Codeforces usually requires submitting a file.';
  }

  sendResponse({
    platform: 'Codeforces',
    title,
    description: description.substring(0, 5000),
    code: code.substring(0, 10000)
  });
}
