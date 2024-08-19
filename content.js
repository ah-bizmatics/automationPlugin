(() => {
    var logInteractions   = [];
    const lastInteraction = {};
    const lastAccessedEle = [];
    const interactionsToBeAdded = []; // used fort 'attach' useractions

    document.body.style.border = "5px solid black";

    console.log('content.js -> Started');
    addOldRecs();
    attachEventListeners1();
   
    document.addEventListener('DOMContentLoaded', attachEventListeners1, false);
   
    function logInteraction(identifier, identifierValue, userAction, dataColumn, description)
    {
        return {
            "Identifier": identifier,
            "Identifier_Value": identifierValue,
            "Index": "",
            "User_Action": userAction,
            "Data_Column": dataColumn,
            "Property": "",
            "Screenshots": "",
            "Description": description,
        };
    }

    function getElementIdentifier(element)
    {
        if (element.id)
        { 
            // this block will check if more than one Elements with same Id are present
            // if not then it will return id 
            var lhea = getAllElementsWithSameAttrUsingXPath(element, 'id');
            if(lhea.length == 1 )
                return { type: "id", value: element.id };
        }

        if (element.name)
        {
            // this block will check if more than one Elements with same Name are present
            // if not then it will return name 
            var lhea = getAllElementsWithSameAttrUsingXPath(element, 'name'); 
            if(lhea.length == 1 )
                return { type: "name", value: element.name};
        }

        if (element.className)
        {
            // this block will check if more than one Elements with same Name are present
            // if not then it will return Class 
            var lhea = getAllElementsWithSameAttrUsingXPath(element, 'class');
            if(lhea.length == 1 )
                return { type: "class", value: element.className };
        }
        console.log(element);
        var xPath = getShortestXPath(element);
        return { type: "xpath", value: xPath };
    }

    function attachEventListeners1(event) 
    {
        console.log('content.js -> attachEventListeners1()');

        if(document.URL.includes('GenSearchFrame'))
        {
            let attachTo = document.getElementsByClassName('popupHeaderText')[0].innerText; // text to be inserted into the description 
            const interaction = logInteraction( '', document.title, 'attach', '', `Attach to ${attachTo} search window.`);
            console.log(interaction);
            interactionsToBeAdded.push(interaction);
        }
        else
        {
            // let attachTo = document.getElementsByClassName('popupHeaderText')[0].innerText; // text to be inserted into the description 
            const interaction = logInteraction( '', document.title, 'attach', '', `Attach to ${document.title}  window.`);
            console.log(interaction);
            interactionsToBeAdded.push(interaction);
        }

            // Function to inject
        // const scriptContent = `
        // window.alert = function(message) {
        //     console.log("Custom alert from extension: " + message);
        //     // You can implement more complex logic here, like displaying a custom UI
        // };
        // `;
        // // Create a script element to inject the function
        // const script = document.createElement('script');
        // script.textContent = scriptContent;

        // // Inject the script into the page's DOM
        // (document.head || document.documentElement).appendChild(script);
        // script.remove();  // Optionally remove the script tag after injecting the content

        addEvenListenersToDoc(document);

        // Event Listener for iframes - whenever they get changed this block should get execute.
        // Not working as expected - Problem ->  At the very first time when a popup is created inside Module windows - content.js is not getting executed.
        document.querySelectorAll('body div[id^="modal"] iframe').forEach(element => {
            
            element.contentDocument.body.style.border = "5px solid green";
            element.contentDocument.addEventListener('DOMContentLoaded', addEvenListenersToDoc(element.contentDocument), false);

            // to record alert/confirm/prompt
            // overRideWindowMethods(element);

            const callbackIFrameMutation = function(mutationsList, observer) {
                for (const mutation of mutationsList) 
                {
                    if (mutation.type === 'attributes') // when children elements are modified
                    {
                        console.log(`popup.js -> callbackIFrameMutation -> iframe src changed from: ${mutation.oldValue} to: ${mutation.target.src}`);
                        // setFrame user Action call here 
                        // control is not comming here
                    }
                }
            };

            const configIFrame = {attributes: true, attributeOldValue: true, attributeFilter: ['src']};
            const observerIFrame = new MutationObserver(callbackIFrameMutation);
            if(element.nodeType === 1)
                observerIFrame.observe(element, configIFrame);
        });

        
        // Home screen has horizontal menuBar -> Appointments, Patients...
        // When user hovers  on these elements, subMenus div(comes from js) is shown 
        // below code will add Listeners on these 'li' elements 
        // Set up MutationObserver to listen for changes to the div
        const callbackSubMenusMutation = function(mutationsList, observer) {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') // when children elements are modified
                {
                    console.log('popup.js -> callbackSubMenusMutation -> Div content changed!');
                    mutation.addedNodes.forEach(ele => {
                        if(ele.childNodes.length > 0)
                        {
                            const subMenuLiEle = ele.querySelectorAll('li > a');
                            subMenuLiEle.forEach(subMenu => {
                                subMenu.addEventListener('click', function(event) {
                                    logInteractionEvent(getElementType(subMenu), 'click', 'CLICK', subMenu);
                                });
                            });
                        }
                    });
                }
            }
        };
        const targetNode = document.getElementById('subMenus');
        const configSubMenus = { childList: true, subtree: true, characterData: true };
        const observer = new MutationObserver(callbackSubMenusMutation);
        if(targetNode instanceof Element)
            observer.observe(targetNode, configSubMenus);

        // Event Listeners for elements inside Document
        document.querySelectorAll('body iframe').forEach(element => { // Array of Documents inside iframe Tag
           
            // In case of PopUps this gets invoked
            // Patient -> Register -> UserLoginDetails Button
            element.addEventListener('load', () => {
                element.contentDocument.body.style.border = "5px solid blue";
                logInteractionEvent(element.id || element.name, 'setframe', 'setframe', element.contentDocument || element.contentWindow.document);
                addEvenListenersToDoc(element.contentDocument || element.contentWindow.document);
            });
            addEvenListenersToDoc(element.contentDocument);

            // duplicate call -- so commented
            const callbackParentIFrameMutation = function(mutationsList, observer) {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'attributes') // when children elements are modified
                    {
                        console.log('popup.js -> callbackParentIFrameMutation -> Src attribute changed!');
                        // Attach user Action call here 
                        
                    }
                }
            };

            const configParentIFrame = {attributes: true, attributeOldValue: true, attributeFilter: ['src']};
            const observerParentIFrame = new MutationObserver(callbackParentIFrameMutation);

            if(element instanceof Element)
                observerParentIFrame.observe(element, configParentIFrame);
        });
    }
    
    function getElementType(element) 
    {
        return element.type || element.tagName.toLowerCase();
    }

    function logInteractionEvent(type, eventType, action, element)
    {
        const userAction = action.toLowerCase();

        // execute when alert, confirm,prompt are shown on screen
        if(eventType === 'ok' || eventType === 'cancel' || eventType === 'optionalalert' || eventType === 'alerttext')
        {
            let desc = '';
            if(eventType === 'alerttext')
            {
                // incase of 'alerttext' useraction type = will conatain message of alert/confirm/prompt and action = alert/confirm/prompt
                desc = action + ' \'' + type + '\' should be there';
            }
            const interaction = logInteraction('',  '', userAction, '', desc);
            logAndSetUserActivity(interaction);
            return;
        }
        // for popUps we use setframe 
        if(eventType === 'setframe')
        {
            // in case of 'setframe' user Action type = id of frame 
            if(type === 'mainFrame' || type === 'jqmContent')
            {
                const interaction = logInteraction('id',  type, userAction, '', `Set frame with id ${type} to ${element.title}`);
                logAndSetUserActivity(interaction);
            }
            return ;
        }
        // add code for menu hyperlink ex. Appoinment, Patient, CPOE... 
        else if(type === 'a' && eventType === 'click')
        {
            const interaction = logInteraction('linktext', element.textContent, userAction, '', `Click on ${element.textContent} menu option`);
            logAndSetUserActivity(interaction);
            return ; 
        }
        else if(eventType === 'attach')
        {
            // only in 'attach' user action case... type = Title of the screen
            const interaction = logInteraction('', element.title, userAction, '', `Attach ${element.title}`);
            logAndSetUserActivity(interaction);
            return ;
        }
        else if(eventType === 'wait')
        {                                                // wait    wait
            const interaction = logInteraction('', '', userAction, eventType, 'Wait for 3 Seconds');
            logAndSetUserActivity(interaction);
            return ;
        }
        else if(eventType === 'maximize') 
        {
            const interaction = logInteraction('', '', userAction, '', '');
            logAndSetUserActivity(interaction);
            return ;
        }

        const { type: identifier, value: identifierValue } = getElementIdentifier(element);

        var dataColumn = '';
        if(identifier == 'xpath' && userAction == 'set')
        {
            // create a random value to insert into data_column
            var nameOrIdOrType = element.id || element.name || element.type || element.tagName;
            // every time this executes user will get new value for data column
            dataColumn = nameOrIdOrType + (Math.floor(Math.random() * 9000) + 1000); // random 4 digit number
        }
        else
        {
            dataColumn = element.id || element.name ;
        }

        let actualValue = '';
        if (element.type === 'checkbox') {
            actualValue = element.checked ? element.value : '';
        } else if (element.type === 'radio' && element.checked) {
            actualValue = element.value;
        } else {
            actualValue = element.value;
        }

        let description = '';
        if (element.type === 'checkbox') {
            const labelForCheckbox = document.querySelector(`label[for="${element.id}"]`);
            if (labelForCheckbox) {
                description = labelForCheckbox.textContent;
            }
        } else {
            const label = document.querySelector(`label[for="${element.id}"]`);
            if (label) {
                description = label.textContent;
            }
        }

        // provide description  
        if(description === '')
            description = getDescription(element, eventType);
        
        const IdentifierAndLastValue = lastInteraction[dataColumn] || '';
        var lsaIdAndLv = IdentifierAndLastValue.split('^'); // it will contain last logged element's identifier and actual value
        var lastIdfrVal = lsaIdAndLv[0];
        var lastValue =  lsaIdAndLv[1];

        // to Log contain userAction
        lastAccessedEle[0] = element;

        // // data column should be blank in following cases 
        if(eventType === 'isblank' || eventType === 'highlight' || eventType === 'isenable' || eventType === 'clear')
            dataColumn = '';

        var interaction = logInteraction(identifier, identifierValue, userAction, dataColumn, description);

        // if (eventType === 'change' && element.type === 'radio') //commented by Amardeep to store Radio-Btn Click event Log
        if (eventType === 'click' && element.type === 'radio')
        {
            // For radio buttons, only log when it is selected
            if (element.checked && (identifierValue !== lastIdfrVal || actualValue !== lastValue)) 
            {
                lastInteraction[dataColumn] = identifierValue + '^' + actualValue;
                dataColumn = ''; // for 'click' user action there should not be data inside data_column
                interaction = logInteraction(identifier, identifierValue, userAction, dataColumn, description);
                logAndSetUserActivity(interaction);
            }
        } 
        else if (eventType === 'change' || (eventType === 'click' && element.type === 'checkbox')) 
        {
            // For other inputs, log when the value changes or checkbox is clicked
            if (identifierValue !== lastIdfrVal || actualValue !== lastValue) 
            {
                lastInteraction[dataColumn] = identifierValue + '^' + actualValue;
                if(eventType === 'click') // for 'click' user action there should not be data inside data_column
                    dataColumn = '';

                interaction = logInteraction(identifier, identifierValue, userAction, dataColumn, description);
                logAndSetUserActivity(interaction);
            }
        }
        else if (eventType === 'dblclick') // for Double Click user action
        {
            interaction = logInteraction(identifier, identifierValue, userAction, '', description);
            logAndSetUserActivity(interaction);
        }
        else if(eventType === 'hover')
        {
            interaction = logInteraction(identifier, identifierValue, userAction, '', description);
            logAndSetUserActivity(interaction);
        } 
        else if ((type === 'button' || type === 'img') && eventType !== 'scroll')
        {
            if(eventType === 'click') // for 'click' user action there should not be data inside data_column
                dataColumn = '';
            interaction = logInteraction(identifier, identifierValue, userAction, dataColumn, description);
            logAndSetUserActivity(interaction);
        }
        else if(eventType === 'scroll&click')
        {
            dataColumn = '';
            interaction = logInteraction(identifier, identifierValue, 'scrollto', dataColumn, description);
            logAndSetUserActivity(interaction); 
        }
        else if(eventType === 'contains'        || eventType === 'gettrim'          || 
                eventType === 'dynamicverify'   || eventType === 'dynamiccontains'  || 
                eventType === 'dynamicset'      || eventType === 'isblank'          || 
                eventType === 'isenable'        || eventType === 'clear'            ||
                eventType === 'highlight'       || eventType === 'objectexists')
        {
            // contains user action 'ctrl+i'
            // gettrim user action 'ctrl+]'
            // dynamicverify user action 'ctrl+['
            // dynamiccontains user action 'ctrl+,'
            // dynamicset user action 'ctrl+m'
            // isblank user action ctrl+b
            // isenable user action - ctrl+k
            console.log(`content.js -> logInteractionEvent() -> ${eventType}` )
            logAndSetUserActivity(interaction);
        }
    }

     // Function to check if XPath points to a unique element
     function isUniqueXPath(xpath) 
     {
         try 
         {   // Evaluate XPath and check if there's only one matching element
             var result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
             return result.snapshotLength === 1;
         } catch (error) {
             return false;
         }
     }

    function getShortestXPath(element)
    {
        // If not unique, try different combinations of attributes
        var xpath = '';
        var attributes = ['id', 'name', 'class', 'type', 'value', 'onclick']; // Add more attributes as needed
        for (var i = 0; i < attributes.length; i++) 
        {
            var attribute = attributes[i];
            var value = element.getAttribute(attribute);
            if (value) 
            {
                var xpathWithAttr = '//' + element.tagName.toLowerCase() + '[@' + attribute + '="' + value + '"]';
                if (isUniqueXPath(xpathWithAttr)) 
                {
                    return xpathWithAttr;
                }
                else
                {
                    // To fetch efficient x-path - Use Logical Operator -> and (refer -> //*[@id='msPt_fname' and @type='text'])
                    if(i < attributes.length )
                    {
                        for(var j = i + 1; j < attributes.length; j++) // to optimize for loop value of j has been set to i+1 
                        {
                            var attrToMatch  = attributes[j];
                            var valueToMatch = element.getAttribute(attrToMatch);
                            if(valueToMatch)
                            {
                                var xpathWithAttr = '//' + element.tagName.toLowerCase() + '[@' + attribute + '="' + value + '" and @' + attrToMatch + '="' + valueToMatch + '"]';
                                if (isUniqueXPath(xpathWithAttr)) 
                                {
                                    return xpathWithAttr;
                                }
                            }
                        }
                    }
                }
            }
        }

        // If all previous attempts failed, then 
        // Function to generate XPath for the element
       xpath = getRelativeXPath(element);
       return xpath;
    }

    // this function will take id, name, class and returns array of elements located on given path
    function getAllElementsWithSameAttrUsingXPath(element, attr)
    {
        var xpath = '';
        if(attr == 'id')
            xpath = `//*[@id='${element.id}']`;
        else if(attr == 'name')
            xpath = `//*[@name='${element.name}']`;
        else if(attr == 'class')
            xpath = `//*[@class='${element.className}']`;

        var elements = [];
        var result = document.evaluate(xpath, element.ownerDocument, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for (var i = 0; i < result.snapshotLength; i++) 
        {
            elements.push(result.snapshotItem(i));
        }
        return elements;
    }

    // this will provide description for parsed element
    function getDescription(element, eventType) // html element - Mostly Text boxes
    {
        var description = '';
        if(eventType === 'change')
        {
            eventType = 'chang';
        }
      
        if(element.type === 'text' || element.type === 'password' || element.type === 'textarea')
        {
            // provided description for below case 
            /*  
                <table> 
                    <tr> 
                        <td> label of field (sometimes span tag resent here)</td> 
                        <td> 
                            <input id='sd' >
                        </td>
                    </tr>
                </table>
            */
            let desc = element.parentElement.previousElementSibling.textContent.trim()
            description = eventType + 'ed value in \'' + desc + '\' Field.';
        }
        else if(element.type === 'button')
        {
            let desc = element.value || element.title ;
            description = eventType + 'ed \'' + desc + '\' Button.';
        }
        else if(element.tagName === 'IMG')
        {
            let desc = element.title || element.id;
            description = eventType + 'ed \'' + desc + '\' Button(img Tag).';
        }
        else if(element.type === 'checkbox')
        {
            let desc = element.parentElement.textContent.trim();
            if(desc == '')
            {
                desc = element.parentElement.previousElementSibling.textContent.trim();
            }
            description = eventType + 'ed on checkBox of \'' + desc + '\' Field.';
        }
        return description;
    }

    // this will add event Listeners to elements of Document 
    function addEvenListenersToDoc(doc)
    {
        var inputs = [];
        var hoverTimer;

        if(doc /*&& isEventListenersAdded(doc) === false*/)
        {
            doc.addEventListener('DOMContentLoaded', addEvenListenersToDoc, false);

            doc.addEventListener('keydown', handleKeyEvents);

            // for scrollTo event 
            doc.querySelectorAll('div').forEach(divEle => { // Array of specified elements inside Documents
                if(isElementScrollable(divEle))
                {
                    divEle.removeEventListener('scroll', handleDivScroll);
                    divEle.addEventListener('scroll', handleDivScroll);
                }
            });

            doc.querySelectorAll('textarea, select, a, img').forEach(subEle => { // Array of specified elements inside Documents
                inputs.push(subEle);
            });

            // we were not able to access alert/prompt/confirm. So we have inserted js script inside PrognoCIS src code.
            // from there we will get info about above useraction through 'automationPluginAlertLog' input element 
            doc.querySelectorAll('input').forEach(subEle => { // Array of specified elements inside Documents
                if(subEle.id === 'automationPluginAlertLog')
                {
                    const callbackAlertLogMutation = function(mutationsList, observer) {
                        for (const mutation of mutationsList) 
                        {
                            if (mutation.type === 'attributes') // when children elements are modified
                            {
                                setTimeout(function() {
                                    console.log(`popup.js -> callbackAlertLogMutation -> AlertLog value changed from: ${mutation.oldValue} to: ${mutation.target.value}`);
                                    const alertObj = JSON.parse(mutation.target.value);
                                    logInteractionEvent('', 'optionalalert', 'optionalalert', null);
                                    logInteractionEvent(alertObj.message, 'alerttext', 'alerttext', null);
                                    
                                    // ok user Action call  
                                    if(alertObj.type === 'alert')
                                    {
                                        logInteractionEvent('', 'ok', 'ok', null);
                                    }
                                    else if(alertObj.type === 'confirm') // ok & cancel useraction
                                    {
                                        if(alertObj.response)
                                            logInteractionEvent('', 'ok', 'ok', null);
                                        else
                                            logInteractionEvent('', 'cancel', 'cancel', null);
                                    }
                                    else if(alertObj.type === 'prompt')// ok & cancel useraction
                                    {
                                        if(alertObj.input)
                                            logInteractionEvent('', 'ok', 'ok', null);
                                        else
                                            logInteractionEvent('', 'cancel', 'cancel', null);
                                    }
                                }, 100);
                            }
                        }
                    };
        
                    const configAlertLog = {attributes: true, attributeOldValue: true, attributeFilter: ['value']};
                    const observerAlertLog = new MutationObserver(callbackAlertLogMutation);
                    if(subEle.nodeType === 1)
                        observerAlertLog.observe(subEle, configAlertLog);
                }
                else
                    inputs.push(subEle);
            });

            console.log('content.js -> addEvenListenersToDoc() ');
            console.log(inputs);

            // Change and Click Event Listerners
            inputs.forEach(input => {

                var elmtType = getElementType(input);

                input.addEventListener('change', function(event) {
                    logInteractionEvent(elmtType, 'change', 'SET', input);
                });

                input.removeEventListener('click', clickEventHandler);
                input.addEventListener('click', clickEventHandler);

                // Double-click event listener
                input.addEventListener('dblclick', function(event) {
                    logInteractionEvent(elmtType, 'dblclick', 'doubleclick', input);
                });
                
                // when user hovers over an element beyond 5 Seconds then hower event should get triggered 
                input.addEventListener("mouseenter", function () {
                    // Start a timer when the mouse enters the element
                    hoverTimer = setTimeout(function () {
                        logInteractionEvent(elmtType, 'hover', 'hover', input);
                    }, 10000); // 1000 milliseconds = 1 seconds
                });
                input.addEventListener("mouseleave", function () {
                    clearTimeout(hoverTimer);
                });
            });
 
            // for iframes inside 2nd level and later documents  
            const innerIframes = doc.querySelectorAll('iframe');

            if(innerIframes)
            {
                innerIframes.forEach(subInnFrame => {
                    // overRideWindowMethods(subInnFrame);
                    subInnFrame.addEventListener('load', () => {
                        addEvenListenersToDoc(subInnFrame.contentDocument || subInnFrame.contentWindow.document);
                    });
                    addEvenListenersToDoc(subInnFrame.contentDocument || subInnFrame.contentWindow.document);
                });
            }
        }
    }

    function clickEventHandler(event) 
    {
        var elmtType = getElementType(event.target);
        logInteractionEvent(elmtType, 'click', 'CLICK', event.target);
    }

    // When screen refreshes the logInteractions variable gets empty.
    // to get data of user activities before screen refresh... this method is written,
    // fetch old Records array and then assingn old values to logInteractions var.
    function addOldRecs()
    {
        chrome.storage.local.get(['userActivities'], (result) => {
            if(result.userActivities.length > 0 )
            {
                logInteractions = result.userActivities;
                console.log('content.js -> addOldRecs() -> Old interactions added ->', logInteractions);
            }
            else{
                console.log('content.js -> addOldRecs() -> No old interactions present.');
            }
            
            // even if this method invoked at top, as it is a aysnchronous method it gets executed at the end.
            // so to avoid errors attach useractions, are stored in interactionsToBeAdded[].
            for (let i = 0; i < interactionsToBeAdded.length; i++) 
            {
                logInteractions.push(interactionsToBeAdded[i]);
            }
        });
    }

    // To handle the shortCut Keys
    function handleKeyEvents(event) 
    {
        // when user clicks on ctrl+; -> then get last element clicked (or accessed) and add new User-log entry then set it's User Action attribute's data to 'contains'
        if (event.ctrlKey && event.key === ";") 
        {
            logInteractionEvent('', 'wait', 'wait', null);
            return;
        }
        else if(event.altKey && event.key === "m")
        {
            logInteractionEvent('', 'maximize', 'maximize', null);
            return;
        }
        
        if(logInteractions) // check if logInteractions defined or not
        {
            // when user clicks on ctrl+/ -> then get last Log entry and set it's Screenshot attribute's data to 'Y'
            if (event.ctrlKey && event.key === '/') 
            {
                logInteractions[logInteractions.length - 1 ].Screenshot = 'Y';
                chrome.storage.local.set({userActivities: logInteractions});
                return;
            }
            // when user clicks on ctrl+. -> then get last Log entry and set it's User Action attribute's data to 'verify'
            else if (event.ctrlKey && event.key === '.') 
            {
                logInteractions[logInteractions.length - 1 ].User_action = 'verify';
                chrome.storage.local.set({userActivities: logInteractions});
                return;
            }
            else if(event.altKey && event.key === 'a') // alertcontains user-action alt+a
            {
                // this user-action will only get executed if there id previousentry of alerttext user action
                if(logInteractions[logInteractions.length - 2 ].User_action === 'alerttext')
                {
                    logInteractions[logInteractions.length - 2 ].User_action = 'alertcontains';
                    chrome.storage.local.set({userActivities: logInteractions});
                }
                return;
            }
        }

        var lhEle = {};

        // the array must be defined or initialized to perform this action
        // assuming dynamicset user actions performed on Text fields only
        if(lastAccessedEle) 
            lhEle = lastAccessedEle[0];
        else
            return;
        
        // user needs to click on the element and then press shortCut
        if(event.ctrlKey && event.key === 'b') // isblank event - 'ctrl + b'
            logInteractionEvent(getElementType(lhEle), 'isblank', 'isblank', lhEle);
        else if(event.ctrlKey && event.key === 'k')// isenable event - 'ctrl + k'
            logInteractionEvent(getElementType(lhEle), 'isenable', 'isenable', lhEle);
        else if(event.ctrlKey && event.key === 'm')// dynamicset event - 'ctrl + m'
            logInteractionEvent(getElementType(lhEle), 'dynamicset', 'dynamicset', lhEle);
        else if(event.ctrlKey && event.key === ',')// dynamiccontains event 'ctrl + ,'
            logInteractionEvent(getElementType(lhEle), 'dynamiccontains', 'dynamiccontains', lhEle);
        else if(event.ctrlKey && event.key === '[') // dynamicverify event - 'ctrl + ['
            logInteractionEvent(getElementType(lhEle), 'dynamicverify', 'dynamicverify', lhEle);
        else if(event.ctrlKey && event.key === ']') // gettrim event 'ctrl + ]'
            logInteractionEvent(getElementType(lhEle), 'gettrim', 'gettrim', lhEle);
        else if (event.ctrlKey && event.key === 'i') // when user clicks on ctrl+i -> then get last element clicked (or accessed) and add new User-log entry then set it's User Action attribute's data to 'contains'
            logInteractionEvent(getElementType(lhEle), 'contains', 'contains', lhEle);
        else if (event.ctrlKey && event.key === 'q') /// clear user action ctrl+q
            logInteractionEvent(getElementType(lhEle), 'clear', 'clear', lhEle);
        else if(event.altKey && event.key === '/') // highlight user action alt+/
            logInteractionEvent(getElementType(lhEle), 'highlight', 'highlight', lhEle);
        else if(event.altKey && event.key === '.')// objectexists useraction alt+.
            logInteractionEvent(getElementType(lhEle), 'objectexists', 'objectexists', lhEle);
      
       console.log('content.js -> handleKeyEvents() -> End');
    }

    // To reduce number of lines of code
    function logAndSetUserActivity(interaction)
    {
        // to avoid duplicate entries
        // check the idenfier and useraction of last logged interaction with current interaction
        let interactionLast = logInteractions[logInteractions.length - 1];
        if( areObjectsEqual(interaction, interactionLast) === false)
        {
            console.log(interaction);
            logInteractions.push(interaction);
            chrome.storage.local.set({userActivities: logInteractions});
        }  
    }

    // to prevent duplicate entries.
    function areObjectsEqual(obj1, obj2) 
    {
        if(obj1 == null || obj2 == null)
            return false;
        // Check if the number of properties is the same
        if (Object.keys(obj1).length !== Object.keys(obj2).length) {
            return false;
        }
    
        // Compare each property value
        for (let key in obj1) {
            if (obj1[key] !== obj2[key]) {
                return false;
            }
        }
    
        return true;
    }

    // create a  function which will detect if the given element is scrollable or not
    function isElementScrollable(element) 
    {
        // Check if the element is visible and not set to display: none
        const isVisible = !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length); // do not remove !!
        if (!isVisible) {
            return false;
        }
    
        const hasOverflowY = window.getComputedStyle(element).overflowY !== 'visible' && element.scrollHeight > element.clientHeight;
        const hasOverflowX = window.getComputedStyle(element).overflowX !== 'visible' && element.scrollWidth > element.clientWidth;
    
        return hasOverflowY || hasOverflowX;
    }

    // when user scrolls any scrollable div ->  then add click event listener on that Div
    function handleDivScroll(event)
    {
        event.currentTarget.removeEventListener('click', handleDivClicked); /// remove old eventListener
        event.currentTarget.addEventListener('click', handleDivClicked);
    }

    // to perform scrollto useraction
    function handleDivClicked(event)
    {
        logInteractionEvent(getElementType(event.target), 'scroll&click', 'scrollto', event.target);
    }

    function getRelativeXPath(element) 
    {
        function getClosestAncestorWithId(element) {
            while (element && element.nodeType === Node.ELEMENT_NODE) {
                if (element.id) {
                    var lhea = getAllElementsWithSameAttrUsingXPath(element, 'id');
                    if(lhea.length == 1 )
                        return element;
                }
                element = element.parentNode;
            }
            return null;
        }
    
        const ancestor = getClosestAncestorWithId(element);
        if (!ancestor) {
            return null;
        }
    
        function getPathFromAncestor(element, ancestor) {
            let path = '';
            while (element !== ancestor) {
                let index = 1;
                let sibling = element.previousElementSibling;
    
                // Count siblings with the same tag
                while (sibling) {
                    if (sibling.nodeName === element.nodeName) {
                        index++;
                    }
                    sibling = sibling.previousElementSibling;
                }
    
                const tagName = element.nodeName.toLowerCase();
                const step = `${tagName}[${index}]`;
                path = `/${step}${path}`;
                element = element.parentNode;
            }
            return path;
        }
        const relativePath = getPathFromAncestor(element, ancestor);
        return `//*[@id="${ancestor.id}"]${relativePath}`;
    }
})
();
