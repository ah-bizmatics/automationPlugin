// added this code to avoid Duplicate event Liseners Problem.
// clear hashMap variable in localStorage, user clicks on Start button 
// hashMap will store the document's url on which event listerners are already applied.
localStorage.setItem('hashMap', JSON.stringify({}));
chrome.storage.local.set({userActivities: []});
console.log('clearScript.js executed.')
console.log(localStorage.getItem('hashMap'));
console.log(chrome.storage.local.get({userActivities: []}));





// manifest.json -> use if needed
// "content_scripts": [
//     {
//       "matches": ["https://bugfixqatesting.prognocis.biz/*"],
//       "js": ["content.js"]
//     }
//   ],
