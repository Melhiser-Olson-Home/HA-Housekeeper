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
