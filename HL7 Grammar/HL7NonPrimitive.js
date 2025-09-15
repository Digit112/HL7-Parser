// Base class for composites, segments, and messages, which are internally all basically the same.
class HL7NonPrimitive extends HL7Entity {
	// Creates a non-primitive from an id and specification object (the value from underlying JSON).
	// "kind" is the exact metatype of this entity, used to clarify error messages.
	// "file_of_origin" is the file this definition came from, and is used in error reporting.
	constructor(type_id, body, kind, file_of_origin, grammar) {
		super(type_id, file_of_origin, grammar)
		
		this.last_constituent_id = null
		
		let my_name = `${kind} ${type_id}` // Used in error messages
		
		if (typeof body != "object" || Array.isArray(body))
			throw new HL7GrammarError(`${my_name} specification must be of type 'object' or 'array'.`, file_of_origin)
		
		this.description = this.attempt_read(body, "string", "description", my_name, "")
		this.long_description = this.attempt_read(body, "string", "long-description", my_name, "")
		this.from = this.attempt_read(body, "string", "from", my_name, "")
		this.max_length = null
		
		if ("constituents" in body) {
			if (!Array.isArray(body["constituents"]))
				throw new HL7GrammarError(`Field 'constituents' on ${my_name} specification must be of type 'array', not '${typeof body["constituents"]}'.`, file_of_origin)
			
			this.constituents = []
			let next_constituent_id = 1 // ID actually used to number constituents by the HL7 standard, which is a 1-based index incrementing through groups.
			for (let constituent_index = 0; constituent_index < body["constituents"].length; constituent_index++) {
				// This try-catch allows errors to be detected in multiple constituents on a single entity definition.
				// Otherwise, the first error in any constituent would float all the way up to consume() which would move on to the next entity.
				try { 
					let constituent_body = body["constituents"][constituent_index]
					let new_constituent = new HL7Constituent(next_constituent_id, 0, constituent_body, kind, type_id, file_of_origin, grammar)
					this.constituents.push(new_constituent)
					next_constituent_id = new_constituent.last_constituent_id + 1
				}
				catch (err) {
					if (err instanceof HL7GrammarError) this.grammar.new_error(err)
					else throw err
				}
			}
			
			this.last_constituent_id = next_constituent_id - 1
		}
		else throw new HL7GrammarError(`Mandatory field 'constituents' on ${my_name} specification is missing.`, file_of_origin)
	}
	
	// Checks that the constituents on this item exist on the HL7 grammar.
	// Also checks that their metatypes are present in the passed array, this is the metatype checking system.
	validate_constituents(valid_types) {
		for (let constituent of this.constituents) {
			constituent.validate(valid_types, this.type_id)
		}
	}
	
	cache_length() {
		console.log("Caching length of " + this.type_id)
		let acc_max_length = 0
		for (let constituent of this.constituents) {
			console.log("Caching length of " + this.type_id + "." + constituent.index)
			console.log(constituent)
			constituent.cache_length()
			console.log(constituent.max_length)
			acc_max_length += constituent.max_length * constituent.repeatability
		}
		
		// Account for the length of the delimiters.
		acc_max_length += this.last_constituent_id - 1
		
		if (this.max_length != null) {
			let my_name = `${this.get_metatype()} ${this.type_id}`
			
			if (this.max_length > acc_max_length)
				throw new HL7GrammarError(`Explicitly specified length on ${my_name} specification is greater than the sums of the max lengths of the underlying fields. (${this.max_length} > ${acc_max_length}).`, this.file_of_origin)
			if (this.max_length < this.last_constituent_id)
				throw new HL7GrammarError(`Explicitly specified length on ${my_name} specification is not greater than the length required to store the ${this.last_constituent_id - 1} delimiters of this non-primitive. (${this.max_length} <= ${this.last_constituent_id - 1}).`, this.file_of_origin)
		}
		else {
			this.max_length = acc_max_length
		}
	}
	
	// Gets the constituent of this item which matches the passed index and depth letter.
	get_constituent(target_index, target_depth_letter=null) {
		if (!(target_index >= 1 && this.last_constituent_id >= target_index)) {
			throw new Error(`constituent target_index ${target_index} is not in the valid range 1 <= target_index <= ${this.last_constituent_id}`)
		}
		
		for (let constituent of this.constituents) {
			if (target_index <= constituent.last_constituent_id) {
				return constituent.get_constituent(target_index, target_depth_letter)
			}
		}
	}
	
	toString() {
		let description_text = this.description != null ? " - " + this.description : ""
		let length_text = this.max_length == null ? " LEN NULL" : (isFinite(this.max_length) ? " LEN " + this.max_length.toString().padStart(4, "·") : " LEN +INF")
		return `${this.type_id}${length_text}${description_text}`
	}
	
	explain() {
		let explanation = this.get_metatype() + " " + this.toString()
		
		let long_desc = ""
		if (this.long_description != "") long_desc += this.long_description + "\n"
		if (this.from != "") long_desc += "From " + this.grammar.version_id + " § " + this.from
		if (long_desc != "") explanation += "\n" + long_desc
		
		for (let constituent of this.constituents) {
			explanation += "\n" + constituent.toString(1)
		}
		
		console.log(explanation)
	}
}

// A subcomposite can appear as the subcomponent of a segment or composite, alongside primitives.
// The constituents of a subcomposite are always primitives.
class HL7Subcomposite extends HL7NonPrimitive {
	constructor(type_id, body, file_of_origin, grammar) {
		super(type_id, body, "SUBCOMPOSITE", file_of_origin, grammar)
	}
	
	get_metatype() {
		return "SUBCOMPOSITE"
	}
}

// A composite can appear as the subcomponent of a segment alongside primitives and subcomposites.
// The constituents of a composite may be subcomposites or primitives.
class HL7Composite extends HL7NonPrimitive {
	constructor(type_id, body, file_of_origin, grammar) {
		super(type_id, body, "COMPOSITE", file_of_origin, grammar)
	}
	
	get_metatype() {
		return "COMPOSITE"
	}
}

// An HL7 Segment is a single line in an HL7 message.
// It contains delimited fields with their own components and subcomponents.
// The constituents of a segment may be composites, subcomposites, or primitives.
class HL7Segment extends HL7NonPrimitive {
	constructor(type_id, body, file_of_origin, grammar) {
		super(type_id, body, "SEGMENT", file_of_origin, grammar)
	}
	
	get_metatype() {
		return "SEGMENT"
	}
}

// An HL7 message is a sequence of carriage return-separated segments.
// Each has a message type and an associated event type which is understood to correspond to a real-world event
// such as a patient admission or immunization which creates the need for information to flow between healthcare systems.
// The HL7 message is the commonly understand, discrete unit of transmission of such information.
class HL7Message extends HL7NonPrimitive {
	constructor(type_id, body, file_of_origin, grammar) {
		super(type_id, body, "MESSAGE", file_of_origin, grammar)
	}
	
	get_metatype() {
		return "MESSAGE"
	}
}