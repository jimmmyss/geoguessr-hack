// Inject the script into the page context
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
(document.head || document.documentElement).appendChild(script);
script.onload = function() {
    script.remove();
};

let currentLat = null;
let currentLng = null;

// Listen for messages from injected script
window.addEventListener('message', function(event) {
    if (event.source !== window) return;
    if (event.data.type && (event.data.type === 'GEOGUESSR_COORDS')) {
        currentLat = event.data.lat;
        currentLng = event.data.lng;
        console.log("[GeoGuessr Extractor] Extracted Coordinates: ", currentLat, currentLng);
    }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "GET_COORDS") {
        sendResponse({ lat: currentLat, lng: currentLng });
    }
    if (request.action === "PLACE_PIN") {
        // Forward this action to inject.js which has access to the page context
        window.postMessage({ type: 'PLACE_PIN_ON_MAP', lat: currentLat, lng: currentLng }, '*');
    }
    return true; // Keep message channel open for async responses if needed
});
