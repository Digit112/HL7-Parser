class HL7ParsingError {
	// An error with a message and optionally an object whose errors are cited.
	// The citations are meant to demonstrate the cause of an error to a greater
	// degree of granularity than the creator of this error could reasonably intuit.
	// This chaining of citations allows the hierarchical arrangement of errors.
	constructor(message, citations=null) {
		this.message = message
		this.citations = citations
	}
}

/*
	This class accepts an HL7 grammar and parses the passed entity as per the grammar.
	The body is the raw text to be parsed,
	the entity is an HL7Entity to be parsed. Derivatives of this class have the actual parsing code.
	The "delimiters" is a simple object crafted by HL7ParsedMessage, whose constructor catalyzes the entire parsing process.
*/
class HL7ParsedEntity {
	constructor(grammar, body, entity, delimiters) {
		this.grammar = grammar
		this.body = body
		this.entity = entity
		this.delimiters = delimiters
		
		this.errors = []
		this.malformed = null
	}
	
	success() {
		this.malformed = false
	}
	
	failure(reason) {
		if (reason == null)
			// This ensures that all malformed entities have at least one, relevant error.
			throw new Error("Parsing failure must have an accompanying reason.")
		if (!(reason instanceof HL7ParsingError))
			throw new Error("Parsing failure's reason must be an HL7ParsingError.")
		
		// Reason for total parsing failure is always first,
		// although there is no reason that this function couldn't be called multiple times.
		this.errors.unshift(reason)
		this.malformed = true
	}
}

/*
	Represents the result of parsing a segment.
	Since a segment declares its type, the type need not be specified.
*/
class HL7ParsedSegment extends HL7ParsedEntity {
	constructor(grammar, body, delimiters) {
		if (body.length < 4) {
			super(grammar, body, null, delimiters)
			this.failure(new HL7ParsingError("Segment too short."))
			return
		}
		
		let type_id = body.slice(0, 4)
		let entity = grammar.get_entity(type_id)
		if (entity == null) {
			super(grammar, body, null, delimiters)
			this.failure(new HL7ParsingError(`Unknown segment '${type_id}'.`))
			return
		}
		
		super(grammar, body, entity, delimiters)
		
		let fields = body.split(delimiters["components"][0]).shift()
		
		// Special code for MSH
		if (type_id == "MSH")
			fields = fields.unshift(delimiters["components"][0])
		
		let contents = []
		
		console.log(fields)
		
		for (let constituent_i = 0; constituent_i < entity.constituents.length; constituent_i++) {
			let constituent = entity.constituents[constituent_i]
			if (constituent_i >= fields.length || fields[constituent_i] == "") {
				contents.push(null)
				
				if (constituent.optionality == "R") {
					this.failure(new HL7ParsingError(`Required constituent ${entity.type_id}.${constituent.index} is empty or entirely missing.`))
				}
				
				continue
			}
			
			if (fields[constituent_i] == '""') {
				// TODO: Is this okay for required fields???
				contents.push("")
				continue
			}
			
			let new_field = new HL7ParsedConstituent(grammar, fields[constituent_i], constituent, delimiters, 1)
			
			if (new_field.has_errors()) {
				if (new_field.malformed) {
					this.failure(new HL7ParsingError(`Constituent ${entity.type_id}.${constituent.index} is malformed.`, new_field))
				}
				else {
					this.errors.push(new HL7ParsingError(`Error(s) encountered while parsing constituent ${entity.type_id}.${constituent.index}.`, new_field))
				}
			}
			
			contents.push(new_field)
		}
	}
}

/*
	Represents a parsed constituent other than segments, that is, a composite, subcomposite, or primitive.
	The passed entity type must be an HL7Constituent for one of those types.
	"level" gives the depth and thus determines the delimiter to use. 1 for "component", 2 for "subcomponent", or null.
*/
class HL7ParsedConstituent extends HL7ParsedEntity {
	constructor(grammar, body, entity, delimiters, level) {
		super(grammar, body, entity, delimiters)
		
		if (!(entity instanceof HL7Constituent)) {
			console.log(entity)
			throw new Error("Must not initialize an HL7ParsedConstituent except with an HL7Constituent")
			return
		}
		
		let type = grammar.get_entity(entity.type)
		
		if (type == null) {
			this.errors.append(new HL7ParsingError(`Constituent is of unknown type '${entity.type}'.`))
			return
		}
		
		// Check level against this constituent's type's metatype.
		if (type.get_metatype() == "COMPOSITE") {
			if (level != 1) {
				throw new Error("For constituent of metatype COMPOSITE, 'level' must be 1.")
				return
			}
		}
		else if (type.get_metatype() == "SUBCOMPOSITE") {
			if (level != 1 && level != 2) {
				throw new Error("For constituent of metatype SUBCOMPOSITE, 'level' must be 1 or 2.")
				return
			}
		}
		else if (type.get_metatype() != "PRIMITIVE") {
			throw new Error("Must not pass a constituent to HL7ParsedConstituent other than 'COMPOSIT', 'SUBCOMPOSITE', or 'PRIMITVE'.")
			return
		}
		
		if (type.get_metatype() == "PRIMITIVE") {
			// TODO: Check lengths
			this.success()
			return
		}
		
		if (type.get_metatype() == "SUBCOMPOSITE" || type.get_metatype() == "COMPOSITE") {
			this.repetitions = this.body.split(delimiters[level])
			console.log(this.repetitions)
		}
	}
}

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