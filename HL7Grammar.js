class HL7GrammarError extends Error{
	constructor(error_message, file_of_origin) {
		super(`In file ${file_of_origin}; ${error_message}`)
	}
}

/*
	This class is capable of reading HL7 Grammar definition files.
	The resulting object is capable of reading and producing HL7 messages.
*/
class HL7Grammar {
	constructor(version_id) {
		this.version_id = version_id
		this.finalized = false
		
		this.grammar_syntax_errors = []
		
		this.tables = {}
		this.primitives = {}
		this.composites = {}
		this.segments = {}
		this.messages = {}
	}
	
	// This function consumes an object read from a JSON file.
	// Each entry defines an HL7 entity.
	// The file_of_origin is used only in error messages.
	async consume(definition, file_of_origin) {
		if (this.finalized) throw new Error("Cannot consume additional HL7 grammar definitions after finalization.")
			
		for (let key in definition) {
			let body = definition[key]
			let [metatype, type_id] = key.split(" ", 2).map(item => item.trim())
			
			try {
				// Check for redefinitions
				let previous_def = this.get_entity(type_id)
				if (previous_def != null)
					throw new HL7GrammarError(`Redefinition of ${metatype} **${type_id}** (Previously defined ${previous_def.get_metatype()} **${type_id}** in ${previous_def.file_of_origin}.)`)
				
				// Attempt construction of appropriate entity
				if (metatype == "PRIMITIVE") {
					this.primitives[type_id] = new HL7Primitive(type_id, body, file_of_origin, this)
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
			}
			catch (err) {
				if (err instanceof HL7GrammarError) this.new_error(err)
				else throw err
			}
		}
	}
	
	// Performs checks of metatypes and reference integrity, which can only be done after we know for sure that all JSON files have been read (hence, finalize())
	finalize() {
		if (this.finalized) throw new Error("Cannot finalize an HL7Grammar twice.")
			
		// Check that all constituents are types that exist and that their metatypes are valid.
		for (let composite of Object.values(this.composites)) {
			composite.validate_constituents(["PRIMITIVE"])
		}
		for (let segment of Object.values(this.segments)) {
			segment.validate_constituents(["COMPOSITE", "PRIMITIVE"])
		}
		for (let message of Object.values(this.messages)) {
			message.validate_constituents(["SEGMENT"])
		}
		
		// Set lengths on all constituents.
		// Ensure no constituent has a length greater than its base type
		
		// Set the length on all tables
		// Set the length on all table-referencing fields based on the tables.
		// Set the length of all non-primitives based on their constituents.
		
		this.finalize = true
	}
	
	// Returns the entity identified by the passed type_id if it exists, null otherwise.
	get_entity(type_id) {
		if (type_id in this.tables) {
			return this.tables[type_id]
		}
		else if (type_id in this.primitives) {
			return this.primitives[type_id]
		}
		else if (type_id in this.composites) {
			return this.composites[type_id]
		}
		else if (type_id in this.segments) {
			return this.segments[type_id]
		}
		else if (type_id in this.messages) {
			return this.messages[type_id]
		}
		else {
			return null
		}
	}
	
	// Report a new error interpreting the grammar file.
	new_error(hl7_grammar_error) {
		this.grammar_syntax_errors.push(hl7_grammar_error)
	}
	
	// Generates and returns a div with a paragraph for every error currently reported on this object.
	get_errors_as_HTML() {
		let error_paragraphs = []
		
		for (let error of this.grammar_syntax_errors) {
			let next_error = document.createElement("p")
			next_error.textContent = error.toString()
			error_paragraphs.push(next_error)
		}
		
		let errors_div = document.createElement("div")
		errors_div.id = `HL7-Version-${this.version_id}-errors`
		errors_div.replaceChildren(...error_paragraphs)
		
		return errors_div
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
		this.debug_review_all_composites()
		this.debug_review_all_segments()
		this.debug_review_all_messages()
	}
}