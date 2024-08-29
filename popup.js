
// on load -> check if Tracking is ON or OFF
// if ON -> Show DownLoad & Cancel Buttons
// if OFF -> Show start button
chrome.storage.local.get('LogStatus', function(result) {
    if (chrome.runtime.lastError) 
    {
        console.error('popup.js -> Error getting LogStatus:', chrome.runtime.lastError);
    } 
    else 
    {
        console.log('popup.js -> LogStatus:', result.LogStatus);
        if(result.LogStatus == 'ON')
        {
            document.getElementById('start-button').style.display = 'none';
            document.getElementById('stop-button').style.display = 'inline';
            document.getElementById('cancel-button').style.display = 'inline';
        }
        else
        {
            document.getElementById('start-button').style.display = 'inline';
            document.getElementById('stop-button').style.display = 'none'; 
            document.getElementById('cancel-button').style.display = 'none'; 
        }
    }
});

// Execute this block whenever user clicks on Start button 
document.getElementById('start-button').addEventListener('click', () => {
    console.log('popup.js -> Log Recording Started');
    setLogStatus('ON');

    chrome.runtime.sendMessage({command: 'startTracking'}, (response) => { // invoke background.js
        if (response.status === 'started') 
        {
            document.getElementById('start-button').style.display = 'none';
            document.getElementById('stop-button').style.display = 'inline';
            document.getElementById('cancel-button').style.display = 'inline'; 
        }else if (response && response.status === 'error') {
            // resetUserActivities();
            setLogStatus('OFF');
            alert('popup.js -> Error: ' + response.message);
        }
        else
        {
            // resetUserActivities();
            setLogStatus('OFF');
            alert("popup.js -> everything went wrong...Start btn" + response.message);
        }
    });
});

// Execute this block whenever user clicks on Stop button 
document.getElementById('stop-button').addEventListener('click', () => {

    document.getElementById('start-button').style.display   = 'inline';
    document.getElementById('stop-button').style.display    = 'none'; 
    document.getElementById('cancel-button').style.display  = 'none';
    // get all active tabs and send message 
    // gets userActions from localStorage
    chrome.tabs.query({ active: true }, function(tabs) {
        tabs.forEach(function(tab) {
            chrome.tabs.sendMessage(tab.id, { action: 'stopTracking', data: 'getUSerActions' }, function(response) {
                if (chrome.runtime.lastError) {
                    console.error(`Could not send message to tab ${tab.id}: ${chrome.runtime.lastError.message}`);
                } else {
                    console.log('Response from content script:', response);
                }
                if(response && response.data)
                {
                    generateExcel(response.data);
                }
            });
        });
    });

    // chrome.runtime.sendMessage({command: 'stopTracking'}, (response) => { // invoke background.js
    //     setLogStatus('OFF');

    //     if (response.status === 'stopped') 
    //     {
    //        // generateExcel(response.data);
    //         document.getElementById('start-button').style.display   = 'inline';
    //         document.getElementById('stop-button').style.display    = 'none'; 
    //         document.getElementById('cancel-button').style.display  = 'none'; 
    //     }
    //     else if (response && response.status === 'error') 
    //         alert('popup.js -> Error: ' + response.message);
    //     else
    //         alert("popup.js -> everything went wrong...Stop Btn " + response.message);

    //     // clear data in chrome.local.userActivities <- local storage for PlugIn
    //     // resetUserActivities(); 
    // });
});

// Execute this block whenever user clicks on Cancel button 
document.getElementById('cancel-button').addEventListener('click', () => {
    setLogStatus('OFF');
    // resetUserActivities(); 
    document.getElementById('start-button').style.display = 'inline';
    document.getElementById('stop-button').style.display = 'none'; 
    document.getElementById('cancel-button').style.display = 'none';
    chrome.runtime.sendMessage({command: 'cancelTracking'}, (response) => { // invoke background.js
       
        if (response.status === 'cancelled') 
        {
            console.log('popup.js -> Log Recording Cancelled');
        }
        else if (response && response.status === 'error') 
            alert('popup.js -> Error: ' + response.message);
        else
            alert("popup.js -> everything went wrong...cancel Btn " + response.message);
    });   
});

// this will Generate XL sheet and download it
// data -> will be in JSON
function generateExcel(data)
{
    // if there is no user action is recorded then show alert
    if(Object.keys(data).length === 0)
    {
        alert('Nothing is recorded');
        return;
    }
        
    const wb = XLSX.utils.book_new();
    wb.Props = {
        Title: "User Interactions",
        Subject: "Logged Interactions",
        Author: "Your Name",
        CreatedDate: new Date()
    };

    // Add "Interactions" worksheet
    wb.SheetNames.push("Page"); // name of the XL sheet

    // the data variable contains data in Chronological Order. To Set the Correct Sequence
    const orderedKeys = [
        "Identifier",
        "Identifier_Value",
        "Index",
        "User_Action",
        "Data_Column",
        "Property",
        "Screenshots",
        "Description"
    ];

    // Reorder all objects in the array
    const reorderedDataArray = data.map(item => reorderObjectKeys(item, orderedKeys));

    const ws = XLSX.utils.json_to_sheet(reorderedDataArray);
    wb.Sheets["Page"] = ws;

    // Add "Data" worksheet
    wb.SheetNames.push("Data");
    const dataRows = [];
    const columns = Array.from(new Set(data.map(interaction => interaction.Data_Column).filter(column => column.trim() !== ''))); // the number of values in data_column are used to create COLUMNS in 'Data' sheet
    columns.unshift('Test_Case'); // 1st column of 'Data' sheet must be 'Test_Case'
    dataRows.push(columns);

    // the data in Actual Value column will be inserted into newly created columns in Data sheet
    const rowData = {};
    data.forEach(interaction => {
        if (interaction['Actual Value'] !== '') {
            if (!rowData[interaction.Data_column]) {
                rowData[interaction.Data_column] = [];
            }
            rowData[interaction.Data_column].push(interaction['Actual Value']);
        }
    });

    const maxRowLength = Math.max(...Object.values(rowData).map(row => row.length));
    for (let i = 0; i < maxRowLength; i++) {
        const row = [];
        columns.forEach(column => {
            row.push(rowData[column]?.[i] || ''); // Push actual values or empty string if not available
        });
        dataRows.push(row);
    }

    const dataSheet = XLSX.utils.aoa_to_sheet(dataRows);
    wb.Sheets["Data"] = dataSheet;

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'interactions.xlsx'); // save the xl sheet
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.status === 'Script Executed') {
        console.log("Script executed successfully in content.js");
        sendResponse({ status: 'received' });
        return true;
    }
    sendResponse({ status: 'Not received' });
    return true;
});


// this will set the status of the LogStatus variable 
function setLogStatus(logStatus)
{
    chrome.storage.local.set({ LogStatus: logStatus }, function() {
        if (chrome.runtime.lastError) {
            console.error('popup.js -> Error setting LogStatus:', chrome.runtime.lastError);
        } else {
            console.log('popup.js -> LogStatus is set to ' + logStatus);
        }
    });
}

 // Function to reorder keys of an object
 function reorderObjectKeys(obj, keys) {
    const reorderedObj = {};
    keys.forEach(key => {
        reorderedObj[key] = obj[key];
    });
    return reorderedObj;
}

// set user activities to empty array afterdownload or cancel button clicked
// function resetUserActivities()
// {
//     chrome.storage.sync.set({ userActivities: [] }, function() {
//         if (chrome.runtime.lastError) {
//             console.error('popup.js -> resetUserActivities() -> Error setting userActivities:', chrome.runtime.lastError);
//         } else {
//             console.log('popup.js -> resetUserActivities() -> userActivities is set to null');
//         }
//     });
// }


