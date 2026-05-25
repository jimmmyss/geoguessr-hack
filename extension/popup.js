let targetTabId = null;

function updateCoordinates() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (!tabs[0] || !tabs[0].url.includes("geoguessr.com")) {
            document.getElementById('status').innerText = 'Please open GeoGuessr.';
            document.getElementById('status').style.color = '#ff5555';
            return;
        }
        
        targetTabId = tabs[0].id;
        
        chrome.tabs.sendMessage(targetTabId, {action: "GET_COORDS"}, function(response) {
            if (chrome.runtime.lastError) {
                document.getElementById('status').innerText = 'Please refresh the page.';
                return;
            }
            
            if (response && response.lat && response.lng) {
                document.getElementById('status').innerText = 'Coordinates found!';
                document.getElementById('status').style.color = '#4CAF50';
                document.getElementById('coords').innerHTML = `Lat: ${response.lat}<br>Lng: ${response.lng}`;
            }
        });
    });
}

// Update immediately and then every second
updateCoordinates();
setInterval(updateCoordinates, 1000);

document.getElementById('placePin').addEventListener('click', () => {
    if (targetTabId) {
        chrome.tabs.sendMessage(targetTabId, {action: "PLACE_PIN"});
        document.getElementById('placePin').innerText = "Pin Placed!";
        setTimeout(() => { document.getElementById('placePin').innerText = "Place Pin on Map"; }, 2000);
    }
});
