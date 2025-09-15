class HL7ParsingError {
	// An error with a message and optionally an object whose errors are cited.
	// The citations are meant to demonstrate the cause of an error to a greater
	// degree of granularity than the creator of this error could reasonably intuit.
	// This chaining of citations allows the hierarchical arrangement of errors.
	constructor(message, citations=null) {
		if (this.citations != null) {
			if (!Array.isArray(citations)) {
				console.log(citations)
				throw new Error("Citations must be array or null.")
			}
			
			for (let citation of citations) {
				if (!(citation instanceof HL7ParsedEntity)) {
					console.log(citation)
					throw new Error("Citation must be HL7ParsedEntity")
				}
			}
		}
		
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
		if (grammar == null)
			throw new Error("Grammar must not be null")
		if (body == null)
			throw new Error("Body must not be null")
		if (entity == null)
			throw new Error("Entity must not be null")
		
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
	
	has_errors() {
		return this.errors.length > 0
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
		
		let type_id = body.slice(0, 3)
		let entity = grammar.get_entity(type_id)
		if (entity == null) {
			super(grammar, body, null, delimiters)
			this.failure(new HL7ParsingError(`Unknown segment '${type_id}'.`))
			return
		}
		
		super(grammar, body, entity, delimiters)
		
		let field_bodies = body.split(delimiters["components"][0]).slice(1)
		
		// Special code for MSH
		if (type_id == "MSH")
			field_bodies.unshift(delimiters["components"][0])
		
		console.log(field_bodies)
		
		this.fields = []
		for (let constituent_i = 0; constituent_i < entity.constituents.length; constituent_i++) {
			let constituent = entity.constituents[constituent_i]
			
			// HL7 allows trailing delimiters to be omitted  beyond the last non-empty field.
			// Thus, field_bodies may not be as long as constituents.
			let field_body = ""
			if (constituent_i < field_bodies.length) {
				field_body = field_bodies[constituent_i]
			}
			
			console.log(`Parsing '${field_body}' as ${entity.type_id}.${constituent.index} - '${constituent.description}'`)
			let new_field = new HL7ParsedConstituent(grammar, field_body, constituent, delimiters, 1)
			
			if (new_field.has_errors()) {
				if (new_field.malformed) {
					this.failure(new HL7ParsingError(`Constituent ${entity.type_id}.${constituent.index} is malformed.`, [new_field]))
				}
				else {
					this.errors.push(new HL7ParsingError(`Error(s) encountered while parsing constituent ${entity.type_id}.${constituent.index}.`, [new_field]))
				}
			}
			
			this.fields.push(new_field)
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
			this.failure(new HL7ParsingError("Internal Error"))
			throw new Error("Must not initialize an HL7ParsedConstituent except with an HL7Constituent")
		}
		
		let type = grammar.get_entity(entity.type)
		
		if (type == null) {
			this.failure(new HL7ParsingError(`Constituent is of unknown type '${entity.type}'.`))
			return
		}
		
		// Check level against this constituent's type's metatype.
		if (type.get_metatype() == "COMPOSITE") {
			if (level != 1) {
				this.failure(new HL7ParsingError("Internal Error"))
				throw new Error("For constituent of metatype COMPOSITE, 'level' must be 1.")
			}
		}
		else if (type.get_metatype() == "SUBCOMPOSITE") {
			if (level != 1 && level != 2) {
				this.failure(new HL7ParsingError("Internal Error"))
				throw new Error("For constituent of metatype SUBCOMPOSITE, 'level' must be 1 or 2.")
			}
		}
		else if (type.get_metatype() != "PRIMITIVE") {
			this.failure(new HL7ParsingError("Internal Error"))
			throw new Error("Must not pass a constituent to HL7ParsedConstituent other than 'COMPOSIT', 'SUBCOMPOSITE', or 'PRIMITVE'.")
		}
		
		// Array with results.
		// Each result represents one repetition of this.entity, repetitions are only valid at the segment and field level
		// (i.e. we're in an HL7ParsedSegment or an HL7ParsedConstituent where level == 1, that is, we're parsing a single segment or field.)
		// Where repetitions are invalid, this.repetitions will always have length zero or one.
		
		// Each result is an HL7ParsedEntity if this.entity is a composite or subcomposite,
		// A string if this.entity is a primitive.
		this.repetitions = []
		
		let repetition_bodies = [this.body]
		if (level == 1) { // On the field level, we split based on repetitions.
			repetition_bodies = this.body.split(delimiters["repeat"])
			if (repetition_bodies.length > entity.repeability) {
				this.errors.push(new HL7ParsingError(`Too many repetitions of ${entity.parent_type_id}.${entity.index}. Discarding extras.`))
				repetition_bodies = repetition_bodies.slice(0, entity.repeability)
			}
			
			// Check for repetitions of this field.
			if (repetition_bodies.length > 1) {
				if (repetition_bodies.length > entity.repeability) {
					this.errors.push(new HL7ParsingError(`Too many repetitions of ${entity.parent_type_id}.${entity.index}. Discarding extras.`))
					repetition_bodies = repetition_bodies.slice(0, entity.repeability)
				}
				
				// Recurse with the same params, but using only a single body.
				for (let repetition_body_i = 0; repetition_body_i < repetition_bodies.length; repetition_body_i++) {
					let repetition_body = repetition_bodies[repetition_body_i]
					
					let parsed_repetition = new HL7ParsedConstituent(this.grammar, repetition_body, this.entity, this.delimiters, level)
					console.assert(parsed_repetition.repetitions.length == 1, parsed_repetition)
					
					if (parsed_repetition.has_errors()) {
						let repetition_name = `${type.type_id}.${constituent.index} - '${constituent.description}' repetition ${repetition_body_i+1}`
						if (parsed_repetition.malformed && constituent.optionality == "R") {
							this.failure(new HL7ParsingError(`Constituent ${repetition_name} is malformed.`, [parsed_repetition]))
						}
						else {
							this.errors.push(new HL7ParsingError(`Error(s) encountered while parsing constituent ${repetition_name}.`, [parsed_repetition]))
						}
					}
					
					this.repetitions.push(parsed_repetition.repetitions[0])
				}
			}
		}
		
		// If the above function split the field, we should be done thanks to the recurse.
		if (repetition_bodies.length > 1) {
			console.assert(this.repetitions.length == repetition_bodies.length, this.repetitions, repetition_bodies)
			this.success()
			return
		}
		
		/* At this point, we know that we are parsing a single non-repeating instance. */
		
		this.repetitions = []
		if (type.get_metatype() == "PRIMITIVE") {
			// "" is what HL7 calls the "null value, it signifies a blank value as opposed to "no data"
			// Required fields can be blank. TODO: Am I sure of this?
			if (this.body == '""') {
				this.repetitions.push("")
			}
			// Check for empty field and error if the field is required.
			else if (this.body == "") {
				if (this.entity.optionality == "R") {
					this.failure(new HL7ParsingError(`Required field ${this.entity.parent_type_id}.${this.entity.index} is missing.`))
				}
				
				this.repetitions.push(null)
			}
			else {
				// TODO: Check lengths
				this.repetitions.push(this.body)
			}
		}
		else if (type.get_metatype() == "SUBCOMPOSITE" || type.get_metatype() == "COMPOSITE") {
			this.repetitions.push([])
			
			// Parsing an individual.
			let component_bodies = this.body.split(delimiters["components"][level])
			for (let constituent_i = 0; constituent_i < type.constituents.length; constituent_i++) {
				let constituent = type.constituents[constituent_i]
				let constituent_entity = this.grammar.get_entity(constituent.type_id)
				
				if (constituent_entity == null) {
					this.errors.push(new HL7ParsingError(`Can't parse constituent ${this.entity.type_id}.${constituent.index} of unknown type ${constituent.type_id}. Grammar file must be malformed.`))
					continue
				}
				
				// HL7 allows trailing delimiters to be omitted beyond the last non-empty component.
				// Thus, component_bodies may not be as long as constituents.
				let component_body = ""
				if (constituent_i < component_bodies.length) {
					component_body = component_bodies[constituent_i]
				}
				let component_name = `${type.type_id}.${constituent.index} - '${constituent.description}' (${constituent.optionality})`
				
				console.log(`Parsing '${component_body}' as ${component_name}`)
				let parsed_component = new HL7ParsedConstituent(this.grammar, component_body, constituent, delimiters, level+1)
				
				if (parsed_component.has_errors()) {
					if (parsed_component.malformed && constituent.optionality == "R") {
						console.log("malformed constituent.")
						this.failure(new HL7ParsingError(`Constituent ${component_name} is malformed.`, [parsed_component]))
					}
					else {
						console.log("erroneous constituent.")
						this.errors.push(new HL7ParsingError(`Error(s) encountered while parsing constituent ${component_name}.`, [parsed_component]))
					}
				}
				
				this.repetitions[0].push(parsed_component)
			}
		}
		
		// Fucking hell
		if (this.malformed == null) {
			this.success()
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