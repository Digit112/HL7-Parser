/*
	Represents a parsed HL7 message.
	The message type and event are determined by parsing the header.
	Then, all segments are parsed and "fitted" to the known required message structure as per the grammar.
*/
class HL7ParsedMessage extends HL7ParsedEntity {
	constructor(grammar, body, constituent=null, delimiters=null) {
		this.grammar = grammar
		this.body = body
		this.constituent = constituent
		this.delimiters = delimiters
		
		this.errors = []
		
		// Set by parse_segment_group()
		this.num_segments_consumed = null
		
		console.assert(
			constituent == null || constituent instanceof HL7Constituent,
			constituent
		)
		
		if (this.constituent == null) {
			this.parse_message()
		}
		else if (this.constituent.is_segment_group()) {
			this.parse_segment_group()
		}
		else {
			this.parse_constituent()
		}
	}
	
	// Parsing the segments of a body is a very interesting act compared to parsing fields and such.
	// Unlike fields, where missing optional values are marked by extra delimiters,
	// Missing segments must only be identified by matching the structure of the message to that of its template.
	parse_message() {
		if (this.body.length < 8) {
			this.errors.push(new HL7ParsingError("Message is too short."))
			return
		}
		
		if (!this.body.startsWith("MSH")) {
			this.errors.push(new HL7ParsingError("Message must begin 'MSH'. Is this an HL7 message?"))
			return
		}
		
		this.delimiters = {
			"components": [this.body[3], this.body[4], this.body[7]],
			"repeat": this.body[5],
			"escape": this.body[6]
		}
		
		// Segments get split 
		let segments = this.body.split("\r").map(a => a.split(this.delimiters["field"]).map(b => b.trim()))
		
		// Parse header to grab the event.
		let header = new HL7ParsedEntity(this.grammar, segments[0], this.grammar.get_entity("ADT A01.1"), this.delimiters)
		if (header.has_errors())
			this.errors.push(new HL7ParsingError("Invalid Message Header segment."), header)
		if (header.malformed())
			return
		
		let message_type = header.constituents[8]
		if (message_type.malformed())
			return
		
		if (message_type.constituents[1] == "" || message_type.constituents[1] == null) {
			// TODO: This is not really an error in many places, such as response/acknowledgment messages.
			// HL7 2.3 § 2.24.1.9 > The second component is not required on response or acknowledgment messages. 
			this.errors.push(new HL7ParsingError("Missing Event Type in Message Header."), message_type)
			return
		}
		
		// Obtain type of message from the grammar.
		this.message_type_id = `${message_type.constituents[0]} ${message_type.constituents[1]}`
		this.message_type = this.grammar.get_entity(message_type_id)
		
		if (this.type == null || this.type.get_metatype() != "message") {
			this.errors.push(new HL7ParsingError(`Invalid Message Type '${this.type}', must be a known message.`), message_type)
			return
		}
		
		// Attempt to fit the segments to the constituents of this message.
		
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