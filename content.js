(() => {
    var logInteractions   = [];
    const lastInteraction = {};
    const lastAccessedEle = [];

    // Active shortcuts
    const shortcutData = {
        'ctrl+1': 'verify',
        'ctrl+2': 'contains',
        'ctrl+3': 'wait',
        'ctrl+4': 'gettrim',
        'ctrl+5': 'dynamicverify',
        'ctrl+6': 'dynamiccontains',
        'ctrl+7': 'dynamicset',
        'ctrl+8': 'objectexists',
        'ctrl+9': 'isenable',
        'ctrl+/': 'Screenshot',
        'ctrl+click': 'verify(labels)',
        'alt+1': 'isblank',
        'alt+2': 'clear',
        'alt+3': 'highlight',
        'alt+4': 'maximize',
        'alt+DblClick': 'scrollto',
        'alt+c': 'click(change Focus)',
        'shift+click': 'clickjs',
        'shift+Dblclick': 'doubleclick'
    };

    document.body.style.border = "5px solid black";

    console.log('content.js -> Started');
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
        if(!element)
            return ;
        
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

        // get all user-actions from localStorage
        var genSeaUserAct   = localStorage.getItem('UserActions');
        if(genSeaUserAct != 'null')
            logInteractions     = JSON.parse(genSeaUserAct); // convert string into object
        else
            logInteractions = [];

        var desc = '';
        if(document.URL.includes('GenSearchFrame'))
        {
            let attachTo = document.getElementsByClassName('popupHeaderText')[0].innerText; // text to be inserted into the description 
            desc = `Attach to ${attachTo} search window.`
        }
        else
            desc = `Attach to ${document.title}  window.`;

        // if there is setframe user action before attach then do not insert attach useraction
        if((logInteractions.length > 1 && logInteractions[logInteractions.length - 1].User_Action === 'setframe') === false)
        {
            const interaction = logInteraction( '', document.title, 'attach', '', desc);
            console.log(interaction);
            logInteractions.push(interaction);
            localStorage.setItem('UserActions', JSON.stringify(logInteractions)); 
        }
        else
        {
            const setFrameRec = logInteractions.pop();
            const interaction = logInteraction( '', document.title, 'attach', '', desc);
            console.log(interaction);
            logInteractions.push(interaction);
            logInteractions.push(setFrameRec);

            localStorage.setItem('UserActions', JSON.stringify(logInteractions));
        }
          
        addEvenListenersToDoc(document);
        
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
        if(element)
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
        else if(eventType === 'attach')
        {
            // only in 'attach' user action case... type = Title of the screen
            const interaction = logInteraction('', element.title, userAction, '', `Attach ${element.title}`);
            logAndSetUserActivity(interaction);
            return ;
        }
        else if(eventType === 'wait')
        {                                                // wait    wait
            const interaction = logInteraction('', '', userAction, '', 'Wait for 3 Seconds');
            logAndSetUserActivity(interaction);
            return ;
        }
        else if(eventType === 'maximize') // alt+4
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
            actualValue = element.checked ? 'true' : 'false';
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

        var interaction = logInteraction(identifier, identifierValue, userAction, '', description);

        if (eventType === 'change' && element.type === 'radio') 
        // if (eventType === 'click' && element.type === 'radio') // no need to record click action for radiio button
        {
            // For radio buttons, only log when it is selected
            if (element.checked && (identifierValue !== lastIdfrVal || actualValue !== lastValue)) 
            {
                lastInteraction[dataColumn] = identifierValue + '^' + actualValue;
                dataColumn = ''; // for 'click' user action there should not be data inside data_column
                interaction = logInteraction(identifier, identifierValue, userAction, '', description);
                logAndSetUserActivity(interaction);
            }
        } 
        // add code for menu hyperlink ex. Appoinment, Patient, CPOE... 
        else if(type === 'a' && eventType === 'click')
        {
            var interaction = '';
            if(element.className.includes('boxclose')) // the cross inside circle at TopRight corner of popup
                interaction = logInteraction(identifier, identifierValue, userAction, '', `Click on Close Symbol (Top right corner)`);
            else
                interaction = logInteraction('linktext', element.textContent, userAction, '', `Click on ${element.textContent} menu option`);

            logAndSetUserActivity(interaction);
            return ; 
        }
        else if (eventType === 'change' || (eventType === 'click' && element.type === 'checkbox')) 
        {
            // For other inputs, log when the value changes or checkbox is clicked
            if (identifierValue !== lastIdfrVal || actualValue !== lastValue) 
            {
                lastInteraction[dataColumn] = identifierValue + '^' + actualValue;
                if(eventType === 'click') // for 'click' user action there should not be data inside data_column
                    dataColumn = '';

                interaction = logInteraction(identifier, identifierValue, userAction, '', description);
                logAndSetUserActivity(interaction);
            }
        }
        else if (eventType === 'ctrl+click' && action === 'verify') // for labels - verify useraction
        {
            description = 'verify \'' + element.innerText + '\' label';
            interaction = logInteraction(identifier, identifierValue, userAction, '', description);
            logAndSetUserActivity(interaction);
        }
        else if (eventType === 'dblclick' && action === 'scrollto') // for labels - verify useraction
        {
            description = 'scroll \'' + element.innerText + '\'';
            interaction = logInteraction(identifier, identifierValue, userAction, '', description);
            logAndSetUserActivity(interaction);
        }
        else if (eventType === 'dblclick' && action === 'doubleclick') // for Double Click user action
        {
            // delete last added 'click' event's entry
            // Usually problem occurred at schedule appointment screen - when user uses shift+dblClick, an extra 'click' user action's entry is added , which needs to be deleted
            var userAct = localStorage.getItem('UserActions');

            if(userAct !== 'null' && userAct)
            {
                logInteractions     = JSON.parse(userAct); 
                let interactionLast = logInteractions[logInteractions.length - 1];

                if(interactionLast.Identifier_Value == identifierValue  && interactionLast.User_Action == 'click')
                    logInteractions.pop();

                localStorage.setItem('UserActions', JSON.stringify(logInteractions));
            } 
            interaction = logInteraction(identifier, identifierValue, userAction, '', description);
            logAndSetUserActivity(interaction);
        }
        else if(eventType === 'hover')
        {
            interaction = logInteraction(identifier, identifierValue, userAction, '', description);
            logAndSetUserActivity(interaction);
        } 
        else if(eventType === 'custom_click') // click useraction  -- alt+c -> used when focus needs to be shifted.
        {
            console.log(`content.js -> logInteractionEvent() -> ${eventType}` );

            if(eventType === 'custom_click')
                interaction.User_Action = 'click';

            logAndSetUserActivity(interaction);
        }
        else if ((type === 'button' || type === 'img') && eventType !== 'scroll')
        {
            if(eventType === 'click') // for 'click' user action there should not be data inside data_column
                dataColumn = '';
            interaction = logInteraction(identifier, identifierValue, userAction, '', description);
            logAndSetUserActivity(interaction);
        }
        else if(eventType === 'contains'        || eventType === 'gettrim'          || 
                eventType === 'dynamicverify'   || eventType === 'dynamiccontains'  || 
                eventType === 'dynamicset'      || eventType === 'isblank'          || 
                eventType === 'isenable'        || eventType === 'clear'            ||
                eventType === 'highlight'       || eventType === 'objectexist'     )
        {
            // contains user action 'ctrl+2'
            // gettrim user action 'ctrl+4'
            // dynamicverify user action 'ctrl+5'
            // dynamiccontains user action 'ctrl+6'
            // dynamicset user action 'ctrl+7'
            // objectexists user action 'ctrl+8' 
            // isblank user action shift+1
            // isenable user action - ctrl+9
            // clear user action shift+2
            // highlight user action 'shift + 3'
            // console.log(`content.js -> logInteractionEvent() -> ${eventType}` );

            logAndSetUserActivity(interaction);
        }
        else if(eventType === 'click' && action === 'capSerVal') // added to capture server side validations like 'Save Successful.'
        {
            dataColumn = '';
            interaction = logInteraction(identifier, identifierValue, 'click', '', description);
            logAndSetUserActivity(interaction);
        }
        else if(eventType === 'click' && action === 'verify')
        {
            dataColumn = '';
            interaction = logInteraction(identifier, identifierValue, 'verify', '', description);
            logAndSetUserActivity(interaction);
        }
        else if(eventType === 'dblclick' && action === 'click')
        {
            dataColumn = '';
            interaction = logInteraction(identifier, identifierValue, 'click', '', description);
            logAndSetUserActivity(interaction);
        }
        else if(eventType === 'click' && action === 'clickOnRow') // added to record click user action on tr/td/span... tags
        {
            dataColumn = '';
            interaction = logInteraction(identifier, identifierValue, 'click', '', description);
            logAndSetUserActivity(interaction);
        }
        else if(eventType === 'click' && action === 'CLICK-SELECT2') // whenever user clicks on select2 enabled dropdown/select element
        {
            dataColumn = '';
            interaction = logInteraction(identifier, identifierValue, eventType, '', description);
            logAndSetUserActivity(interaction);
        }
    }

     // Function to check if XPath points to a unique element
     function isUniqueXPath(xpath, eleDoc) // eleDoc - Element's Document 
     {
         try 
         {   // Evaluate XPath and check if there's only one matching element
             var result = document.evaluate(xpath, eleDoc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
             return result.snapshotLength === 1;
         } catch (error) {
             return false;
         }
     }

    function getShortestXPath(element)
    {
        // If not unique, try different combinations of attributes
        var xpath = '';
        var attributes = ['id', 'name', 'class', 'type', 'value', 'onclick', 'style']; // Add more attributes as needed
        for (var i = 0; i < attributes.length; i++) 
        {
            var attribute = attributes[i];
            var value = element.getAttribute(attribute);
            if (value) 
            {
                var xpathWithAttr = '//' + element.tagName.toLowerCase() + '[@' + attribute + '="' + value + '"]';
                if (isUniqueXPath(xpathWithAttr, element.ownerDocument) && xpathWithAttr) 
                {
                    return xpathWithAttr;
                } 
            }
        }

        // try to find xpath using combinations of attribute values
        for (var i = 0; i < attributes.length; i++) 
        {
            var attribute = attributes[i];
            var value = element.getAttribute(attribute);

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
                        if (isUniqueXPath(xpathWithAttr, element.ownerDocument)  && xpathWithAttr) 
                        {
                            return xpathWithAttr;
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
            eventType = 'chang';
                
        if(eventType === 'custom_click')
            eventType = 'click'
      
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
            let desc = '';
            try{
                desc = element.parentElement.previousElementSibling.textContent.trim();
            }
            catch(error)
            {
                desc = element.placeholder || element.title || '';;
            }
            
            if(desc === '')
                desc = element.id || element.title || element.placeholder;
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
                if(element.parentElement.previousElementSibling) // in gensearch pop up there is no label for checkbox, so prevEleSib comes null
                    desc = element.parentElement.previousElementSibling.textContent.trim();
                else
                    desc = '';
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

            doc.addEventListener('dblclick', handleDblClik); // added to handle - scrollto and doubleclick useraction
            doc.addEventListener('click', handleClickOnRows) //  to click on rows(span tags) we use this

            // actionMessages --> to fetch server side validation like -> Save Successful.
            // popupHeaderText --> to fetch the title of the gensearch
            doc.querySelectorAll('[class^="popupHeaderText"], [class^="actionMessages"]').forEach(subEle => {
                subEle.removeEventListener('click', handleServerSideVal);
                subEle.addEventListener('click', handleServerSideVal);
            });

            // hover event -> only for TOC menu options -> target on li tags with id starts with menu
            doc.querySelectorAll('li[id^="menu"]').forEach(menuOpt => {
                var elmtType = getElementType(menuOpt);
                // when user hovers over an element beyond 5 Seconds then hower event should get triggered 
                menuOpt.addEventListener("mouseenter", function () {
                    // Start a timer when the mouse enters the element
                    hoverTimer = setTimeout(function () {
                        logInteractionEvent(elmtType, 'hover', 'hover', menuOpt);
                    }, 5000); // 1000 milliseconds = 1 seconds
                });
                menuOpt.addEventListener("mouseleave", function () {
                    clearTimeout(hoverTimer);
                });
            });


            doc.querySelectorAll('textarea, select, a, img').forEach(subEle => { // Array of specified elements inside Documents
                inputs.push(subEle);
            });

            // not in use
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
            //console.log(inputs);

            var elmtType = '';
            // Change and Click Event Listerners
            inputs.forEach(input => {

                elmtType = getElementType(input);

                input.addEventListener('change', function(event) {
                    logInteractionEvent(elmtType, 'change', 'SET', input);
                });

                input.removeEventListener('click', clickEventHandler);
                input.addEventListener('click', clickEventHandler);

                // Double-click event listener
                input.addEventListener('dblclick', function(event) {
                    logInteractionEvent(elmtType, 'dblclick', 'doubleclick', input);
                });

                // for select 2 enabled drop downs 
                if('select-one' == elmtType)
                {
                    if(input.className && input.className.includes('select2'))
                    {
                        let lsSpanTagEle = input.nextElementSibling; // adding listener to select element not working. so added event listener to span tag.
                        if(lsSpanTagEle && lsSpanTagEle.tagName.toLowerCase() == 'span')
                        {
                            lsSpanTagEle.removeEventListener('click', select2Handler);
                            lsSpanTagEle.addEventListener('click', select2Handler);
                        }
                    }
                }
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

    // whenever user click on a dropdown with select2 decorator
    // create 3 logs 
    // 1. click on the select dropdown element
    // 2. set the search field
    // 3. Click on the first option
    function select2Handler(event)
    {
        let lsIdSpanEle = event.target.id; // get id of rendering elemnt -> it will contain select element's id
        let lsSelEleId  = lsIdSpanEle.split('-')[1];
        let lsSelEle    = event.target.ownerDocument.getElementById(lsSelEleId); // get select element

        var lsElmtType = getElementType(lsSelEle); // get Id
        logInteractionEvent(lsElmtType, 'click', 'CLICK-SELECT2', lsSelEle);

        let interaction = logInteraction('xpath',  "//input[@class='select2-search__field' and @type='search']", 'set', '', '');// set search field
        logAndSetUserActivity(interaction);
        let interaction2 = logInteraction('xpath',  "//ul[@class='select2-results__options']//li[1]", 'click', '', '');// click on option
        logAndSetUserActivity(interaction2);
    }

    // whenever user clicks on target elements then add click entry then if QA presses short cut key then corresponding user action will get fire
    // same applicable to fetch the title of the gensearch
    function handleServerSideVal(event) 
    {
        var elmtType = getElementType(event.target);
        logInteractionEvent(elmtType, 'click', 'capSerVal', event.target); // to capture server side validations
    }

    // To handle the shortCut Keys
    function handleKeyEvents(event) 
    {
        // this will invoke the small info div which show shortKeys
        if (event.ctrlKey)
            sortTableByKey('ctrl');// Sort the table to show 'Ctrl' shortcuts first
        else if (event.altKey)            
            sortTableByKey('alt');// Sort the table to show 'Alt' shortcuts
        else if (event.shiftKey)
            sortTableByKey('shift');// Sort the table to show 'Shift' shortcuts

        if (event.ctrlKey && event.key === "3") 
        {
            logInteractionEvent('', 'wait', 'wait', null);
            return;
        }
        else if(event.altKey && event.key === '4') // alt+4
        {
            logInteractionEvent('', 'maximize', 'maximize', null);
            return;
        }

        // get all user-actions from localStorage
        var genSeaUserAct   = localStorage.getItem('UserActions');
        logInteractions     = JSON.parse(genSeaUserAct); // convert string into object
        
        if(logInteractions) // check if logInteractions defined or not
        {
            // when user clicks on ctrl+/ -> then get last Log entry and set it's Screenshots attribute's data to 'Y'
            if (event.ctrlKey && event.key === '/') 
            {
                console.log('Screenshots user action');
                logInteractions[logInteractions.length - 1 ].Screenshots = 'Y';
                localStorage.setItem('UserActions', JSON.stringify(logInteractions)); // convert object into String
                return;
            }
            else if(event.altKey && event.key === '5') // alertcontains user-action alt+5
            {
                // this user-action will only get executed if there id previousentry of alerttext user action
                console.log('alertcontains user action');
                if(logInteractions[logInteractions.length - 2 ].User_Action === 'alerttext')
                {
                    logInteractions[logInteractions.length - 2 ].User_Action = 'alertcontains';
                    localStorage.setItem('UserActions', JSON.stringify(logInteractions));
                }
                // }
                return;
            }
        }

        var lhEle = {};

        // the array must be defined or initialized to perform this action
        // assuming below user actions performed on Text fields only
        if(lastAccessedEle) 
            lhEle = lastAccessedEle[0];
        else
            return;
        
        // user needs to click on the element and then press shortCut
        if(event.altKey && event.key === '1') // isblank event - 'alt + 1'
            logInteractionEvent(getElementType(lhEle), 'isblank', 'isblank', lhEle);
        else if(event.ctrlKey && event.key === '9')// isenable event - 'ctrl + 9'
            logInteractionEvent(getElementType(lhEle), 'isenable', 'isenable', lhEle);
        else if(event.ctrlKey && event.key === '7')// dynamicset event - 'ctrl + 7'
            logInteractionEvent(getElementType(lhEle), 'dynamicset', 'dynamicset', lhEle);
        else if(event.ctrlKey && event.key === '6')// dynamiccontains event 'ctrl + 6'
            logInteractionEvent(getElementType(lhEle), 'dynamiccontains', 'dynamiccontains', lhEle);
        else if(event.ctrlKey && event.key === '5') // dynamicverify event - 'ctrl + 5'
            logInteractionEvent(getElementType(lhEle), 'dynamicverify', 'dynamicverify', lhEle);
        else if(event.ctrlKey && event.key === '4') // gettrim event 'ctrl + 4'
            logInteractionEvent(getElementType(lhEle), 'gettrim', 'gettrim', lhEle);
        else if (event.ctrlKey && event.key === '2') // when user clicks on ctrl+2 -> then get last element clicked (or accessed) and add new User-log entry then set it's User Action attribute's data to 'contains'
            logInteractionEvent(getElementType(lhEle), 'contains', 'contains', lhEle);
        else if (event.altKey && event.key === '2') /// clear user action alt+2
            logInteractionEvent(getElementType(lhEle), 'clear', 'clear', lhEle);
        else if(event.altKey && event.key === '3') // highlight user action alt+3
            logInteractionEvent(getElementType(lhEle), 'highlight', 'highlight', lhEle);
        else if(event.ctrlKey && event.key === '8')// objectexist useraction ctrl+8
            logInteractionEvent(getElementType(lhEle), 'objectexist', 'objectexist', lhEle);
        else if(event.altKey && event.key === 'c') // alt+c   ---to change focus QA needs to click somewhere else so this shortcut added
            logInteractionEvent(getElementType(lhEle), 'custom_click', 'custom_click', lhEle);
        else if (event.ctrlKey && event.key === '1') // ctrl+1 
            logInteractionEvent(getElementType(lhEle), 'click', 'verify', lhEle);

       console.log('content.js -> handleKeyEvents() -> End');
    }

    // To reduce number of lines of code
    function logAndSetUserActivity(interaction)
    {
        // to avoid duplicate entries
        // check the idenfier and useraction of last logged interaction with current interaction
        var userAct = localStorage.getItem('UserActions');

        if(userAct !== 'null' && userAct)
        {
            logInteractions     = JSON.parse(userAct); 
            let interactionLast = logInteractions[logInteractions.length - 1];
            
            if(areObjectsEqual(interaction, interactionLast) === false)
            {
                console.log(interaction);
                logInteractions.push(interaction);
                localStorage.setItem('UserActions', JSON.stringify(logInteractions));
            }  
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
    // not in use currently
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

    // to handle scrollto and verify useractions
    function handleDblClik(event)
    {
        // press and hold shift key or altKey and then double click on lable or any element then these user actions will fire up
        if(event.altKey){
            logInteractionEvent(getElementType(event.target), 'dblclick', 'scrollto', event.target);
        }
        else if(event.shiftKey){
            logInteractionEvent(getElementType(event.target), 'dblclick', 'doubleclick', event.target);
        }
    }

    // mostly used on Doclist or gensearch
    function handleClickOnRows(event)
    {
        if(event.shiftKey){ // for click event on tr/td/span etc tags
            logInteractionEvent(getElementType(event.target), 'click', 'clickOnRow', event.target);
        }
        else if (event.ctrlKey) { // click on 
            logInteractionEvent(getElementType(event.target), 'ctrl+click', 'verify', event.target);
        }
    }

    // create a popup/win/div which will show shortKey combinations 
    // this will appear whenever user presses ctrl key or shift key
    function createHiDivShadow(shortcuts) 
    {
        // Create a container element to attach the shadow DOM
        let shadowHost = document.createElement('div');
        shadowHost.style.position = 'absolute';
        shadowHost.style.right = '10px';
        shadowHost.style.top = '10px';
        shadowHost.style.pointerEvents = 'none'; 
        shadowHost.style.zIndex = '9999';
    
        // Attach a shadow root to the shadowHost
        let shadowRoot = shadowHost.attachShadow({ mode: 'open' });

        // Create table container
        const tableContainer = document.createElement('div');
        // tableContainer.style.backgroundColor = 'yellow';
        // tableContainer.style.border = '1px solid black';

        const style = document.createElement('style');
        style.type = 'text/css';
        let cssDet = `body {
                        font-family:  Verdana, sans-serif;
                        background-color: #404040;
                        margin: 0;
                        padding: 20px;
                    }

                    table {
                        width: 80%;
                        margin: 0 auto;
                        border-collapse: collapse;
                        border-radius: 8px;
                        overflow: hidden;
                        background-color: #282828;
                    }

                    thead {
                        background-color: #121212;
                    }

                    thead th {
                        color: #9ccfff;
                        text-align: left;
                        padding: 12px;
                        font-weight: normal;
                        font-size: 16px;
                    }

                    tbody tr {
                        border-bottom: 1px solid #e0e0e0;
                    }

                    tbody tr:hover {
                        background-color: #404040;
                    }

                    tbody td {
                        padding: 10px;
                        text-align: left;
                        font-size: 14px;
                        color: #ffffb9 ;
                    }

                    tbody tr:nth-child(even) {
                        background-color: #181818;
                    }`;
        style.appendChild(document.createTextNode(cssDet));
        tableContainer.appendChild(style); 

        // Create the table element
        const table = document.createElement('table');
        table.id = 'shortcutTable';

        // Create table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const th1 = document.createElement('th');
        th1.innerText = 'Short-Key';
        const th2 = document.createElement('th');
        th2.innerText = 'User-Action';
        headerRow.appendChild(th1);
        headerRow.appendChild(th2);
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create the table body
        const tbody = document.createElement('tbody');
        tbody.innerHTML = ''; // Clear the table before repopulating

        // Loop through the shortcut data and create rows
        for (const [key, action] of Object.entries(shortcuts)) 
        {
            const row = document.createElement('tr');
            const shortKeyCell = document.createElement('td');
            const actionCell = document.createElement('td');

            shortKeyCell.textContent = key;
            actionCell.textContent = action;

            row.appendChild(shortKeyCell);
            row.appendChild(actionCell);
            tbody.appendChild(row);
        }
        
        table.appendChild(tbody);

        // Append table to the document body
        tableContainer.appendChild(table);   
        shadowRoot.appendChild(tableContainer);

        // Add the shadowHost (which includes the shadow DOM) to the body
        document.body.appendChild(shadowHost);

    
        // Remove the shadowHost after 2 seconds
        setTimeout(function() {
            document.body.removeChild(shadowHost);
        }, 2000);
    }

    // Function to sort the table based on key pressed
    function sortTableByKey(pressedKey) 
    {
        // Create a sorted version of the JSON based on the pressed key
        const sortedShortcuts = {};
        
        // Separate the keys that match the pressed key (e.g., 'Ctrl') from the others
        for (const [key, action] of Object.entries(shortcutData)) {
            if (key.startsWith(pressedKey))
                sortedShortcuts[key] = action;
        }

        // Add the rest of the keys after the sorted ones
        // for (const [key, action] of Object.entries(shortcutData)) {
        //     if (!key.startsWith(pressedKey)) 
        //         sortedShortcuts[key] = action;
        // }

        // Re-generate the table with the sorted shortcuts
        createHiDivShadow(sortedShortcuts);
    }
})
();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'stopTracking') 
    {
        console.log('Message received in content script from popup.js:', message.data);

        // get user-actions stored in localStorage
        var userAct = localStorage.getItem('UserActions');
        if(userAct !== 'null' && userAct)
        {
            logInteractions = JSON.parse(userAct);
            localStorage.setItem('UserActions', null);
        }
        sendResponse({ status: 'success', data:  logInteractions});
    }
});

