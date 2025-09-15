/*
	Represents a parsed HL7 message.
	The message type and event are determined by parsing the header.
	Then, all segments are parsed and "fitted" to the known required message structure as per the grammar.
*/
class HL7ParsedMessage extends HL7ParsedEntity {
	constructor(grammar, body) {
		// Parsing the segments of a body is a very interesting act compared to parsing fields and such.
		// Unlike fields, where missing optional values are marked by extra delimiters,
		// Missing segments must only be identified by matching the structure of the message to that of its template.
		if (body.length < 8) {
			super(grammar, body, "No entity!", "No Delimiters!")
			this.failure(new HL7ParsingError("Message is too short."))
			return
		}
		
		if (!body.startsWith("MSH")) {
			super(grammar, body, "No entity!", "No Delimiters!")
			this.failure(new HL7ParsingError("Message must begin 'MSH'. Is this an HL7 message?"))
			return
		}
		
		let delimiters = {
			"components": [body[3], body[4], body[7]],
			"repeat": body[5],
			"escape": body[6]
		}
		
		// Retrieve MSH.9 - 'Message Type'
		let segment_bodies = body.split("\r")
		let header_body = segment_bodies[0]
		let header_fields = header_body.split(delimiters["components"][0])
		if (header_fields.length < 9) {
			super(grammar, body, "No entity!", "No Delimiters!")
			this.failure(new HL7ParsingError("Message header lacks the required MSH.9 segment needed to begin parsing."))
			return
		}
		
		let [cm_msg_message_type, cm_msg_event_type] = header_fields[8].split(delimiters["components"][1]).map(a => a.trim())
		let message_type_id = `${cm_msg_message_type} ${cm_msg_event_type}`.trim()
		
		// Retrieve and validate 
		let message_type = grammar.get_entity(message_type_id)
		if (message_type == null) {
			super(grammar, body, "No entity!", "No Delimiters!")
			this.failure(new HL7ParsingError(`Can't parse unknown message type '${message_type_id}'. Is the MSH.9 field correctly located and valid?`), [message_type])
			return
		}
		
		// Finally, the coveted grammatical and semantic clarity!
		super(grammar, body, message_type, delimiters)
		
		// Parse each segment
		this.segments = []
		for (let segment_body of segment_bodies) {
			let parsed_segment = new HL7ParsedSegment(this.grammar, segment_body, this.delimiters)
			this.segments.push(parsed_segment)
		}
	}
	
	// Returns true if the result of parsing was that the entity could not be made sense of at all.
	// This will return false even if the message was not compliant.
	// To check that the text was fully compliant, use has_errors()
	malformed() {
		return this.constituents == null
	}
	
	// Returns true if errors occurred during parsing.
	// This does not necessarily mean that the entity was malformed,
	// but does mean that the entity was non-compliant.
	has_errors() {
		return this.errors.length != 0
	}
}