class HL7GrammarError extends Error{
	constructor(error_message, file_of_origin) {
		super(`In '${file_of_origin}' - ${error_message}`)
	}
}

/*
	This class is capable of reading HL7 Grammar definition files.
	The resulting object is capable of reading and producing HL7 messages.
*/
class HL7Grammar {
	constructor(version_id) {
		this.version_id = version_id
		this.consumption_completed = false
		this.finalized = false
		
		this.grammar_syntax_errors = []
		
		this.tables = {}
		this.primitives = {}
		this.subcomposites = {}
		this.composites = {}
		this.segments = {}
		this.messages = {}
	}
	
	// This function consumes an object read from a JSON file.
	// Each entry defines an HL7 entity.
	// The file_of_origin is used only in error messages.
	async consume(definition, file_of_origin) {
		if (this.finalized || this.consumption_completed) throw new Error("Cannot consume additional HL7 grammar definitions after finalization.")
			
		for (let key in definition) {
			
			try {
				let delim = key.indexOf(" ")
				
				if (delim == -1)
					throw new HL7GrammarError(`Unable to extract type-id from entity definition \`${key}\`. It should take the form \`<metatype> <type-id>\`, with the space delimiter included.`, file_of_origin)
				
				let metatype = key.substr(0, delim)
				let type_id = key.substring(delim+1)
				
				// Check for redefinitions
				let previous_def = this.get_entity(type_id)
				if (previous_def != null)
					throw new HL7GrammarError(`Redefinition of ${metatype} **${type_id}** (Previously defined ${previous_def.get_metatype()} **${type_id}** in ${previous_def.file_of_origin}.)`, file_of_origin)
				
				// Get definition
				let body = definition[key]
				
				// Attempt construction of appropriate entity
				if (metatype == "PRIMITIVE") {
					this.primitives[type_id] = new HL7Primitive(type_id, body, file_of_origin, this)
				}
				else if (metatype == "SUBCOMPOSITE") {
					this.subcomposites[type_id] = new HL7Subcomposite(type_id, body, file_of_origin, this)
				}
				else if (metatype == "COMPOSITE") {
					this.composites[type_id] = new HL7Composite(type_id, body, file_of_origin, this)
				}
				else if (metatype == "SEGMENT") {
					this.segments[type_id] = new HL7Segment(type_id, body, file_of_origin, this)
				}
				else if (metatype == "MESSAGE") {
					this.messages[type_id] = new HL7Message(type_id, body, file_of_origin, this)
				}
				else if (metatype == "TABLE") {
					this.tables[type_id] = new HL7Table(type_id, body, file_of_origin, this)
				}
				else {
					throw new HL7GrammarError(`Invalid metatype \`${metatype}\` from entity definition \`${key}\`. It should be one of \`MESSAGE\`, \`SEGMENT\`, \`COMPOSITE\`, \`SUBCOMPOSITE\`, \`PRIMITIVE\`, or \`TABLE\`.`, file_of_origin)
				}
			}
			catch (err) {
				if (err instanceof HL7GrammarError) this.new_error(err)
				else throw err
			}
		}
	}
	
	// Performs checks of metatypes and reference integrity, which can only be done after we know for sure that all JSON files have been read (hence, finalize())
	finalize() {
		if (this.finalized) throw new Error("Cannot finalize an HL7Grammar more than once.")
		
		this.consumption_completed = true
			
		// Check that all constituents are types that exist and that their metatypes are valid.
		for (let subcomposite of Object.values(this.subcomposites)) {
			subcomposite.validate_constituents(["PRIMITIVE"])
		}
		for (let composite of Object.values(this.composites)) {
			composite.validate_constituents(["SUBCOMPOSITE", "PRIMITIVE"])
		}
		for (let segment of Object.values(this.segments)) {
			segment.validate_constituents(["COMPOSITE", "SUBCOMPOSITE", "PRIMITIVE"])
		}
		for (let message of Object.values(this.messages)) {
			message.validate_constituents(["SEGMENT"])
		}
		
		// Set the length on all tables
		for (let table of Object.values(this.tables)) {
			table.cache_length()
		}
		
		// Set length on all non-primitives constituents.
		// Each will cache the length on all constituents as needed first.
		// These lengths will be their own values, the value of the backing table if any, or the value of the backing type.
		for (let subcomposite of Object.values(this.subcomposites)) {
			subcomposite.cache_length()
		}
		for (let composite of Object.values(this.composites)) {
			composite.cache_length()
		}
		for (let segment of Object.values(this.segments)) {
			segment.cache_length()
		}
		for (let message of Object.values(this.messages)) {
			message.cache_length()
		}
		
		this.finalized = true
	}
	
	// Returns the entity identified by the passed type_id if it exists, null otherwise.
	get_entity(type_id) {
		let type_parts = type_id.split(".")
		
		if (type_parts.length < 1) throw new Error(`Invalid type_id ${type_id}`)
		
		let entity_container = null
		if (type_parts[0] in this.tables) {
			entity_container = this.tables[type_parts[0]]
		}
		else if (type_parts[0] in this.primitives) {
			entity_container = this.primitives[type_parts[0]]
		}
		else if (type_parts[0] in this.subcomposites) {
			entity_container = this.subcomposites[type_parts[0]]
		}
		else if (type_parts[0] in this.composites) {
			entity_container = this.composites[type_parts[0]]
		}
		else if (type_parts[0] in this.segments) {
			entity_container = this.segments[type_parts[0]]
		}
		else if (type_parts[0] in this.messages) {
			entity_container = this.messages[type_parts[0]]
		}
		else {
			return null
		}
		
		if (type_parts.length == 1) {
			return entity_container
		}
		else {
			if (!(entity_container instanceof HL7NonPrimitive)) {
				throw new Error(`Invalid type_id ${type_id} identifies index into non-indexable ${entity_container.get_metatype()}`)
			}
			
			if (type_parts.length == 2) {
				return entity_container.get_constituent(type_parts[1])
			}
			else {
				return entity_container.get_constituent(type_parts[1], type_parts[2])
			}
		}
	}
	
	// Report a new error interpreting the grammar file.
	new_error(hl7_grammar_error) {
		this.grammar_syntax_errors.push(hl7_grammar_error)
	}
	
	// Displays a lengthy formatted description of the specified type.
	explain(type_id) {
		let entity = this.get_entity(type_id)
		
		if (entity == null) {
			console.log("No such entity.")
		}
		else {
			entity.explain()
		}
	}
	
	// Logs a list of all known entities on this grammar to the console.
	debug_review_all_primitives() {
		let debug_str = ""
		debug_str += "PRIMITIVES:\n"
		for (let entity of Object.values(this.primitives)) {
			debug_str += entity.toString() + "\n"
		}
		
		console.log(debug_str)
	}
	
	// Logs a list of all subcomposites and their constituents
	debug_review_all_subcomposites() {
		let debug_str = ""
		debug_str += "SUBCOMPOSITES:\n"
		for (let entity of Object.values(this.subcomposites)) {
			debug_str += entity + "\n"
			for (let constituent of entity.constituents) {
				debug_str += "  " + constituent + "\n"
			}
			
		}
		
		console.log(debug_str)
	}
	
	// Logs a list of all composites and their constituents
	debug_review_all_composites() {
		let debug_str = ""
		debug_str += "COMPOSITES:\n"
		for (let entity of Object.values(this.composites)) {
			debug_str += entity + "\n"
			for (let constituent of entity.constituents) {
				debug_str += "  " + constituent + "\n"
			}
			
		}
		
		console.log(debug_str)
	}
	
	// Logs a list of all segments and their constituents
	debug_review_all_segments() {
		let debug_str = ""
		debug_str += "SEGMENTS:\n"
		for (let entity of Object.values(this.segments)) {
			debug_str += entity + "\n"
			for (let constituent of entity.constituents) {
				debug_str += "  " + constituent + "\n"
			}
			
		}
		
		console.log(debug_str)
	}
	
	// Logs a list of all messages and their constituents
	debug_review_all_messages() {
		let debug_str = ""
		debug_str += "MESSAGES:\n"
		for (let entity of Object.values(this.messages)) {
			debug_str += entity + "\n"
			for (let constituent of entity.constituents) {
				debug_str += "  " + constituent + "\n"
			}
			
		}
		
		console.log(debug_str)
	}
	
	debug_review_all_entities() {
		this.debug_review_all_primitives()
		this.debug_review_all_subcomposites()
		this.debug_review_all_composites()
		this.debug_review_all_segments()
		this.debug_review_all_messages()
	}
}