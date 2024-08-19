
var trackedTabDomain = null; // used to keep the Plug-In Pop-Up visible during tracking
// var gsLogStatus = 'OFF';

// function overrideAlert() {
//     window.alert = function(message) {
//         console.log("Custom alert from extension: " + message);
//     };
// }

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // User clicked on Start Button
    if (message.command === 'startTracking')     
    {
        chrome.windows.getCurrent({populate: true}, (currentWindow) => {
            chrome.tabs.query({ active: true, windowId: currentWindow.id }, (tabs) => {
                if (tabs.length > 0) 
                {
                    console.log("background.js -> chrome.runtime.onMessage.addListener -> Started tracking - URL : " + tabs[0].url);
                    const url = new URL(tabs[0].url);
                    trackedTabDomain = url.hostname;

                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        files: ['clearScript.js', 'content.js']
                    }, () => {
                        if (chrome.runtime.lastError) {
                            sendResponse({ status: 'error', message: chrome.runtime.lastError.message });
                        } else {
                            sendResponse({ status: 'started' });
                        }
                    });
                } 
                else 
                {
                    sendResponse({ status: 'error', message: 'No active tab found' });
                }
            });
        });   
    }
    // User Clicked on Stop Button 
    else if (message.command === 'stopTracking') 
    {
        trackedTabDomain = null;
        chrome.storage.local.get(['userActivities'], (result) => {
            sendResponse({ status: 'stopped', data: result.userActivities });
        });
    }
    else if(message.command === 'cancelTracking')
    {
        trackedTabDomain = null;
        sendResponse({ status: 'cancelled'});
    }
    return true; // true = asynchronous & false = synchronous
});

chrome.tabs.onUpdated.addListener(async function(tabId, changeInfo, tab) {
    console.log('background.js -> chrome.tabs.onUpdated.addListener -> Tab updated, Id :', tabId);
    const logStatus = await getLogStatus();
    if (changeInfo.status === 'complete' && tab.url) 
    {
        console.log('background.js -> chrome.tabs.onUpdated.addListener -> Tab URL :', tab.url);
        const url = new URL(tab.url);
        const domain = url.hostname;

        if (logStatus === 'ON' && trackedTabDomain === domain)
        {
            //trackedTabId = tab.id;
            console.log("background.js -> chrome.tabs.onUpdated.addListener -> execute content.js on - URL : " + tab.url);

            setTimeout(function() {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                }, () => {
                    if (chrome.runtime.lastError) 
                    {
                        console.log("background.js -> chrome.tabs.onUpdated.addListener -> Error executing content.js:", chrome.runtime.lastError.message);
                    } 
                    else 
                    {
                        chrome.runtime.sendMessage({ status: 'Script Executed', message: "Content.js executed" }, (response) => {
                            // if (chrome.runtime.lastError) {
                            //     console.log("Error sending message after script execution:", chrome.runtime.lastError.message);
                            // } else {
                            //     console.log("Message sent successfully:", response);
                            // }
                        });
                    }
                });
            }, 500);
           
        } else 
        {
            console.log('background.js -> chrome.tabs.onUpdated.addListener -> Script in content.js is not executed. LogStatus :' + logStatus); 
        }
    }
    return true;
});

// LogStatus variable will have 3 Values -> ON, OFF, HOLD (Hold - code is not yet added for this one)
function getLogStatus()
{
    return new Promise((resolve, reject) => {
        chrome.storage.local.get('LogStatus', (result) => {
            if (chrome.runtime.lastError) {
                console.error('background.js -> getLogStatus() -> Error:', chrome.runtime.lastError);
                resolve('');
            } else {
                console.log('background.js -> getLogStatus() -> LogStatus:', result.LogStatus);
                resolve(result.LogStatus);
            }
        });
    });
}

// chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
//     if (request.action === "getTabId") {
//         // The tab ID can be accessed from the `sender` object
//         sendResponse({ tabId: sender.tab.id });
//     }
// });


// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//     console.log("----------------------------------------------------------------Message received in background script:", message);
//     sendResponse({ status: '---------------------------------------------------------received' });
//     return true; 
// });