// DOM-Elemente abrufen
const gearbeiteteZeitSpan = document.getElementById('gearbeiteteZeit');
const pausenZeitSpan = document.getElementById('pausenZeit');
const differenzZeitSpan = document.getElementById('differenzZeit');
const voraussichtlichesEndeSpan = document.getElementById('voraussichtlichesEnde');
const feierabendZeile = document.getElementById('feierabendZeile'); 

const sollzeitInput = document.getElementById('sollzeit'); 
const sollzeitSchnellauswahl = document.getElementById('sollzeitSchnellauswahl');
const kommen1Input = document.getElementById('kommen1');
const gehen1Input = document.getElementById('gehen1');
const kommen2Input = document.getElementById('kommen2');
const gehen2Input = document.getElementById('gehen2');

const errorModal = document.getElementById('errorModal');
const modalErrorMessage = document.getElementById('modalErrorMessage');
const closeModalButton = document.getElementById('closeModalButton');

let blinkInterval = null; 
let notificationSentForCurrentFeierabend = false;

// Funktion, um Benachrichtigungs-Berechtigung anzufragen
function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.log("Dieser Browser unterstützt keine Desktop-Benachrichtigungen.");
    } else if (Notification.permission === "granted") {
        // console.log("Berechtigung für Benachrichtigungen bereits erteilt.");
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(function (permission) {
            if (permission === "granted") {
                // console.log("Berechtigung für Benachrichtigungen erteilt.");
            }
        });
    }
}

// Funktion, um die Feierabend-Benachrichtigung anzuzeigen
function showFeierabendNotification() {
    if (Notification.permission === "granted") {
        const notification = new Notification("Feierabendrechner", {
            body: "Es ist Zeit für den Feierabend!",
            icon: "wecker.png" // Dein Favicon
        });
    }
}

// Funktion zur Anzeige von Fehlermeldungen im Modal
function showErrorModal(message) {
    modalErrorMessage.textContent = message;
    errorModal.style.display = 'block';
}

// Event Listener zum Schließen des Modals
closeModalButton.onclick = function() { errorModal.style.display = 'none'; }
window.onclick = function(event) {
    if (event.target == errorModal) {
        errorModal.style.display = 'none';
    }
}

// Funktion zur Konvertierung von Zeit (HH:MM) in Minuten seit Mitternacht
function zeitInMinuten(zeitString) {
    if (!zeitString) return NaN;
    const parts = zeitString.split(':');
    if (parts.length !== 2) return NaN;
    const stunden = parseInt(parts[0], 10);
    const minuten = parseInt(parts[1], 10);
    if (isNaN(stunden) || isNaN(minuten) || stunden < 0 || stunden > 23 || minuten < 0 || minuten > 59) return NaN;
    return stunden * 60 + minuten;
}

// Funktion zur Konvertierung von Minuten in das Format HH:MM
function minutenInZeit(minutenGesamt) {
    if (isNaN(minutenGesamt) || minutenGesamt === null) return "--:--";
    const negativ = minutenGesamt < 0;
    let absMinuten = Math.abs(minutenGesamt);
    const stunden = Math.floor(absMinuten / 60);
    const minuten = absMinuten % 60;
    return (negativ ? "-" : "") + String(stunden).padStart(2, '0') + ':' + String(minuten).padStart(2, '0');
}

const MOUSE_WHEEL_TIME_INCREMENT_MINUTES = 1; 

// Funktion zur Behandlung des Mausrad-Events auf Zeit-Eingabefeldern
function handleTimeInputMouseWheel(event) {
    event.preventDefault(); 
    
    const inputElement = event.target;
    if (inputElement.type !== 'time') return; 

    let currentTimeInMinutes = zeitInMinuten(inputElement.value);

    if (isNaN(currentTimeInMinutes)) { 
        currentTimeInMinutes = 0; 
    }

    if (event.deltaY < 0) { 
        currentTimeInMinutes += MOUSE_WHEEL_TIME_INCREMENT_MINUTES;
    } else { 
        currentTimeInMinutes -= MOUSE_WHEEL_TIME_INCREMENT_MINUTES;
    }

    const totalMinutesInDay = 24 * 60;
    currentTimeInMinutes = (currentTimeInMinutes % totalMinutesInDay + totalMinutesInDay) % totalMinutesInDay; 
    
    inputElement.value = minutenInZeit(currentTimeInMinutes);
    inputElement.dispatchEvent(new Event('input', { bubbles: true })); // Berechnung auslösen
}

// Funktion zur Ermittlung der aktuellen Uhrzeit in Minuten
function getCurrentTimeInMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
}

// Funktion zum Überprüfen und Umschalten des Blinkens und Senden der Benachrichtigung
function checkAndToggleBlinkingAndNotify(feierabendMoeglichMin) {
    if (blinkInterval) {
        clearInterval(blinkInterval);
        blinkInterval = null;
        feierabendZeile.classList.remove('blink-feierabend');
    }

    if (isNaN(feierabendMoeglichMin) || feierabendMoeglichMin === null) {
        return;
    }

    function updateState() {
        const currentTimeMin = getCurrentTimeInMinutes();
        if (currentTimeMin >= feierabendMoeglichMin) {
            feierabendZeile.classList.add('blink-feierabend');
            if (!notificationSentForCurrentFeierabend && Notification.permission === "granted") {
                showFeierabendNotification();
                notificationSentForCurrentFeierabend = true; 
            }
        } else {
            feierabendZeile.classList.remove('blink-feierabend');
            if (blinkInterval) { 
                clearInterval(blinkInterval);
                blinkInterval = null;
            }
        }
    }
    
    updateState(); 
     if (getCurrentTimeInMinutes() >= feierabendMoeglichMin) {
         if (!blinkInterval) { 
            blinkInterval = setInterval(updateState, 1000); 
         }
     } else if (feierabendMoeglichMin - getCurrentTimeInMinutes() < 60 && feierabendMoeglichMin - getCurrentTimeInMinutes() > 0) {
        if (!blinkInterval) {
            blinkInterval = setInterval(updateState, 1000);
        }
     }
}

// Hauptfunktion zur Berechnung und Anzeige der Arbeitszeiten
function berechneUndZeigeZeiten() {
    notificationSentForCurrentFeierabend = false; // Reset für jede neue Berechnung

    const sollzeitValue = sollzeitInput.value; 
    const kommen1Value = kommen1Input.value;
    const gehen1Value = gehen1Input.value;
    const kommen2Value = kommen2Input.value;
    const gehen2Value = gehen2Input.value;

    const aktuelleSollzeitMinuten = zeitInMinuten(sollzeitValue);
    const kommen1Min = zeitInMinuten(kommen1Value);
    const gehen1Min = zeitInMinuten(gehen1Value);
    const kommen2Min = zeitInMinuten(kommen2Value);
    const gehen2Min = zeitInMinuten(gehen2Value);

    differenzZeitSpan.className = 'result-value'; 

    // 1. Tatsächliche Pause berechnen
    let tatsaechlichePausenzeitMin = NaN;
    if (!isNaN(kommen2Min) && !isNaN(gehen1Min) && kommen2Min >= gehen1Min) {
        tatsaechlichePausenzeitMin = kommen2Min - gehen1Min;
    }
    
    // 2. Pause bestimmen, die für Anzeige und vorauss. Ende genutzt wird
    let fuerAnzeigeUndVoraussEndeGenutztePausenzeitMin = tatsaechlichePausenzeitMin;
    if (tatsaechlichePausenzeitMin >= 0 && tatsaechlichePausenzeitMin < 30) {
        fuerAnzeigeUndVoraussEndeGenutztePausenzeitMin = 30;
    }
    pausenZeitSpan.textContent = minutenInZeit(fuerAnzeigeUndVoraussEndeGenutztePausenzeitMin);

    // 3. Voraussichtliches Arbeitsende berechnen
    let feierabendMoeglichMin = NaN;
    if (!isNaN(aktuelleSollzeitMinuten) && !isNaN(kommen1Min) && 
        !isNaN(fuerAnzeigeUndVoraussEndeGenutztePausenzeitMin) && fuerAnzeigeUndVoraussEndeGenutztePausenzeitMin >= 0) {
        if (!isNaN(gehen1Min) && kommen1Min < gehen1Min && !isNaN(kommen2Min) && gehen1Min <= kommen2Min) {
             feierabendMoeglichMin = kommen1Min + aktuelleSollzeitMinuten + fuerAnzeigeUndVoraussEndeGenutztePausenzeitMin;
        }
    }
    voraussichtlichesEndeSpan.textContent = minutenInZeit(feierabendMoeglichMin);
    checkAndToggleBlinkingAndNotify(feierabendMoeglichMin);


    // Reset für gearbeitete Zeit und Differenz, bevor Validierungen ggf. returnen
    gearbeiteteZeitSpan.textContent = "--:--";
    differenzZeitSpan.textContent = "--:--";

    // 4. Validierung der Eingaben für die Hauptberechnung
    if (isNaN(aktuelleSollzeitMinuten) || isNaN(kommen1Min) || isNaN(gehen1Min) || isNaN(kommen2Min) || isNaN(gehen2Min)) {
        return; 
    }
    if (gehen1Min <= kommen1Min) {
        showErrorModal('Die "Gehen"-Zeit am Vormittag muss nach der "Kommen"-Zeit am Vormittag liegen.');
        return;
    }
    if (kommen2Min < gehen1Min) { 
        showErrorModal('Die "Kommen"-Zeit am Nachmittag muss nach oder gleich der "Gehen"-Zeit am Vormittag sein.');
        return;
    }
    if (gehen2Min <= kommen2Min) {
        showErrorModal('Die "Gehen"-Zeit am Nachmittag muss nach der "Kommen"-Zeit am Nachmittag liegen.');
        return;
    }

    // 5. Tatsächliche Arbeitsblöcke und initiale Gesamt-Arbeitszeit
    const arbeitsblock1Min = gehen1Min - kommen1Min;
    const arbeitsblock2Min = gehen2Min - kommen2Min;
    let gesamtArbeitszeitMin = arbeitsblock1Min + arbeitsblock2Min;

    // 6. Korrektur der gearbeiteten Zeit aufgrund der Mindestpause von 30 Minuten
    if (tatsaechlichePausenzeitMin >= 0 && tatsaechlichePausenzeitMin < 30) {
        const pausenDefizit = 30 - tatsaechlichePausenzeitMin;
        gesamtArbeitszeitMin -= pausenDefizit;
        gesamtArbeitszeitMin = Math.max(0, gesamtArbeitszeitMin); 
    }
    
    // 7. Differenz berechnen
    const differenzMin = gesamtArbeitszeitMin - aktuelleSollzeitMinuten;

    // 8. Ergebnisse anzeigen
    gearbeiteteZeitSpan.textContent = minutenInZeit(gesamtArbeitszeitMin);
    differenzZeitSpan.textContent = minutenInZeit(differenzMin);
    
    differenzZeitSpan.className = 'result-value'; 
    if (differenzMin > 0) {
        differenzZeitSpan.classList.add('result-positive');
    } else if (differenzMin < 0) {
        differenzZeitSpan.classList.add('result-negative');
    } else {
        differenzZeitSpan.classList.add('result-neutral');
    }
}

// Event Listener für Schnellauswahl der Sollzeit
sollzeitSchnellauswahl.addEventListener('change', function() {
    if (this.value) { 
        sollzeitInput.value = this.value;
        sollzeitInput.dispatchEvent(new Event('input', { bubbles: true })); 
    }
});

// Event Listener für alle Eingabefelder
const alleEingabeFelder = [sollzeitInput, kommen1Input, gehen1Input, kommen2Input, gehen2Input];
alleEingabeFelder.forEach(feld => {
    feld.addEventListener('input', berechneUndZeigeZeiten);
    if (feld.type === 'time') { // Mausrad-Listener nur für Zeit-Eingabefelder
         feld.addEventListener('wheel', handleTimeInputMouseWheel, { passive: false }); 
    }
});

// Initialisierung beim Laden der Seite
document.addEventListener('DOMContentLoaded', (event) => {
    requestNotificationPermission(); // Benachrichtigungs-Berechtigung anfragen
    berechneUndZeigeZeiten(); // Erste Berechnung durchführen
    // Initiales Setup für das Blinken wird in berechneUndZeigeZeiten aufgerufen
});
