// added this code to avoid Duplicate event Liseners Problem.
// clear hashMap variable in localStorage, user clicks on Start button 
// hashMap will store the document's url on which event listerners are already applied.
localStorage.setItem('hashMap', JSON.stringify({}));
// chrome.storage.sync.set({userActivities: []});
localStorage.setItem('UserActions', null);
console.log('clearScript.js executed.')
console.log('localStorage : hashMap', localStorage.getItem('hashMap'));
// console.log(chrome.storage.local.get({userActivities: []}));
console.log('localStorage : UserActions', localStorage.getItem('UserActions'));






// manifest.json -> use if needed
// "content_scripts": [
//     {
//       "matches": ["https://bugfixqatesting.prognocis.biz/*"],
//       "js": ["content.js"]
//     }
//   ],
