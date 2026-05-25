// Helper function to recursively search for coordinates in JSON objects
function searchObjForCoords(obj, path = '') {
    if (obj !== null && typeof obj === 'object') {
        if (obj.hasOwnProperty('lat') && obj.hasOwnProperty('lng') && typeof obj.lat === 'number' && typeof obj.lng === 'number') {
            window.postMessage({ type: 'GEOGUESSR_COORDS', lat: obj.lat, lng: obj.lng }, '*');
        }
        for (let key in obj) {
            if (typeof obj[key] === 'object') {
                searchObjForCoords(obj[key], path ? `${path}.${key}` : key);
            }
        }
    }
}

// Function to forcefully extract coordinates from the React Fiber tree
function extractFromReact() {
    try {
        const elements = document.querySelectorAll('div');
        for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            const keys = Object.keys(el);
            const fiberKey = keys.find(k => k.startsWith('__reactFiber$'));
            if (fiberKey) {
                let node = el[fiberKey];
                let depth = 0;
                while (node && depth < 20) {
                    if (node.memoizedProps && node.memoizedProps.lat !== undefined && node.memoizedProps.lng !== undefined) {
                        const lat = node.memoizedProps.lat;
                        const lng = node.memoizedProps.lng;
                        if (typeof lat === 'number' && typeof lng === 'number' && lat !== 0 && lng !== 0) {
                            window.postMessage({ type: 'GEOGUESSR_COORDS', lat: lat, lng: lng }, '*');
                            return; // Found it
                        }
                    }
                    // Also check nested objects in props
                    if (node.memoizedProps && node.memoizedProps.panorama) {
                         const pano = node.memoizedProps.panorama;
                         if (pano.lat && pano.lng) {
                             window.postMessage({ type: 'GEOGUESSR_COORDS', lat: pano.lat, lng: pano.lng }, '*');
                             return;
                         }
                    }
                    node = node.return;
                    depth++;
                }
            }
        }
    } catch (e) {
        console.error("React extraction error", e);
    }
}

// Intercept fetch requests
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    const url = args[0] && typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
    
    if (url.includes('/api/')) {
        try {
            const clone = response.clone();
            clone.json().then(data => {
                searchObjForCoords(data);
            }).catch(e => {});
        } catch (e) {}
    }
    return response;
};

// Check React state every second to ensure we always have the latest coordinates
setInterval(extractFromReact, 1000);

// Search NEXT_DATA on initial load
setTimeout(() => {
    try {
        const nextDataElement = document.getElementById('__NEXT_DATA__');
        if (nextDataElement) {
            const nextData = JSON.parse(nextDataElement.textContent);
            searchObjForCoords(nextData);
        }
    } catch (e) {}
}, 1000);
window.addEventListener('message', function(event) {
    if (event.source !== window) return;
    if (event.data.type === 'PLACE_PIN_ON_MAP') {
        const lat = event.data.lat;
        const lng = event.data.lng;
        
        // 1. Find the minimap container (updated selector)
        const mapContainer = document.querySelector('[class*="guess-map_canvas"]') || 
                             document.querySelector('.gm-style') ||
                             document.querySelector('[class*="guess-map_guessMap"]');
                             
        if (!mapContainer) {
            alert("Minimap not found! Please make sure it's visible on your screen.");
            return;
        }
        
        let el = mapContainer;
        let found = false;
        
        // Shape expected by google-map-react's onClick handler
        const fakeEvent = {
            lat: lat,
            lng: lng,
            x: 0,
            y: 0,
            event: {}
        };

        while (el && el !== document.body && !found) {
            const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
            if (fiberKey) {
                let node = el[fiberKey];
                let depth = 0;
                while (node && depth < 50 && !found) {
                    const props = node.memoizedProps;
                    if (props) {
                        if (typeof props.onMapClick === 'function') {
                            try { props.onMapClick(fakeEvent); found = true; } catch(e) {}
                        } else if (typeof props.onClick === 'function') {
                            try { props.onClick(fakeEvent); found = true; } catch(e) {}
                        }
                    }
                    node = node.return;
                    depth++;
                }
            }
            el = el.parentElement;
        }
        
        if (!found) {
            console.log("[GeoGuessr Extractor] Could not find the React click handler for the map.");
        }
    }
});