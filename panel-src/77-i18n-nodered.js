// Node-RED: flows read from the Node-RED admin API count as users of entities and devices.
Object.assign(TEXT.de, {
  openInNodeRed: "In Node-RED öffnen", noderedUnreachable: "Node-RED nicht lesbar",
  noderedCached: "Verwendet werden die Flows vom {date}.", noderedMissing: "Was Node-RED nutzt, fehlt in diesem Scan; Entitäten und Geräte können deshalb als unbenutzt erscheinen.",
  nodered_node_missing: "Node-RED-Knoten gelöscht", cause_nodered_node_missing: "Node-RED hat diese Entität für einen Knoten angelegt, den es in keinem Flow mehr gibt. Sie ist zurückgeblieben.", hint_nodered_node_missing: "Wird der Knoten nicht mehr gebraucht, lässt sich die Entität deaktivieren und später entfernen.",
  nodered_cannot_connect: "Node-RED ist nicht erreichbar.", nodered_invalid_auth: "Node-RED hat die Anmeldung abgelehnt.", nodered_invalid_response: "Die Adresse antwortet nicht mit Node-RED-Flows.",
});
Object.assign(TEXT.en, {
  openInNodeRed: "Open in Node-RED", noderedUnreachable: "Node-RED not readable",
  noderedCached: "Using the flows read on {date}.", noderedMissing: "What Node-RED uses is missing from this scan, so entities and devices may look unused.",
  nodered_node_missing: "Node-RED node deleted", cause_nodered_node_missing: "Node-RED created this entity for a node that no longer exists in any flow. It was left behind.", hint_nodered_node_missing: "If the node is no longer needed, the entity can be disabled and later removed.",
  nodered_cannot_connect: "Node-RED cannot be reached.", nodered_invalid_auth: "Node-RED rejected the login.", nodered_invalid_response: "The address does not answer with Node-RED flows.",
});
Object.assign(TEXT.de, {
  setTabNodeRed: "Node-RED", setHintNodeRed: "Verbindung, damit in Flows Genutztes als verwendet gilt",
  nrNotSet: "Nicht verbunden", nrConnected: "Verbunden", nrErrorPill: "Fehler", nrCachedPill: "Alte Flows",
  nrIntro: "Housekeeper liest deine Flows (nur lesend) und zählt Entitäten und Geräte, die dort genutzt werden, als verwendet. So schlägt das Aufräumen nicht vor, sie zu deaktivieren.",
  nrState: "Status", nrRead: "Zuletzt gelesen", nrFlows: "Flows",
  nrHowTitle: "So findest du die Angaben",
  nrStepStandalone: "Eigenständiges Node-RED oder Docker: die Adresse, unter der du den Editor öffnest, ohne das angehängte #flow/…. Verlangt der Editor eine Anmeldung, trage diesen Benutzer ein; Lesezugriff genügt.",
  nrStepAddon: "Node-RED-Add-on von Home Assistant: im Add-on unter Konfiguration → Netzwerk dem Port 1880/tcp eine Portnummer geben, dann http://HA-ADRESSE:PORT eintragen und einen Home-Assistant-Benutzer verwenden.",
  nrStepSave: "Speichern prüft die Verbindung zuerst. Danach lädt Housekeeper neu und scannt mit deinen Flows.",
  nrUrl: "Adresse", nrUrlHint: "Mit http:// oder https://. Ist in settings.js httpAdminRoot gesetzt, diesen Pfad anhängen.",
  nrUser: "Benutzername", nrUserHint: "Nur wenn der Editor eine Anmeldung verlangt.",
  nrPassword: "Passwort", nrPasswordHint: "Leer lassen behält das gespeicherte Passwort.",
  nrToken: "Zugriffstoken", nrTokenHint: "Statt Benutzername und Passwort, falls du ein Admin-Token hast. Leer lassen behält es.",
  nrKept: "gespeichert", nrSave: "Prüfen und speichern", nrDisconnect: "Trennen",
  nrTesting: "Verbindung wird geprüft …", nrDisconnecting: "Wird getrennt …", nrSaved: "Verbunden: {n} Flows gefunden. Housekeeper lädt neu und scannt.", nrDisconnected: "Getrennt. Housekeeper lädt neu.",
  nodered_invalid_url: "Die Adresse muss mit http:// oder https:// beginnen.",
});
Object.assign(TEXT.en, {
  setTabNodeRed: "Node-RED", setHintNodeRed: "Connection, so what flows use counts as used",
  nrNotSet: "Not connected", nrConnected: "Connected", nrErrorPill: "Error", nrCachedPill: "Old flows",
  nrIntro: "Housekeeper reads your flows (read-only) and counts the entities and devices used there as used, so cleanup does not suggest disabling them.",
  nrState: "Status", nrRead: "Last read", nrFlows: "Flows",
  nrHowTitle: "Where to find these values",
  nrStepStandalone: "Standalone or Docker Node-RED: the address you open the editor at, without the trailing #flow/…. If the editor asks for a login, enter that user; read access is enough.",
  nrStepAddon: "Home Assistant Node-RED add-on: in the add-on under Configuration → Network, give port 1880/tcp a port number, then enter http://HA-ADDRESS:PORT and use a Home Assistant user.",
  nrStepSave: "Saving tests the connection first. Housekeeper then reloads and scans with your flows.",
  nrUrl: "Address", nrUrlHint: "With http:// or https://. If you set httpAdminRoot in settings.js, add that path.",
  nrUser: "Username", nrUserHint: "Only if the editor asks for a login.",
  nrPassword: "Password", nrPasswordHint: "Leave empty to keep the saved password.",
  nrToken: "Access token", nrTokenHint: "Instead of username and password, if you have an admin token. Leave empty to keep it.",
  nrKept: "saved", nrSave: "Test and save", nrDisconnect: "Disconnect",
  nrTesting: "Testing the connection …", nrDisconnecting: "Disconnecting …", nrSaved: "Connected: {n} flows found. Housekeeper reloads and scans.", nrDisconnected: "Disconnected. Housekeeper reloads.",
  nodered_invalid_url: "The address must start with http:// or https://.",
});
