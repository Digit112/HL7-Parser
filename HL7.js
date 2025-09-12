class HL7Delimiters {
	constructor(seg_sep, comp_sep, subcomp_sep, rep_sep, esc) {
		this.seg_sep = seg_sep
		this.comp_sep = comp_sep
		this.subcomp_sep = subcomp_sep
		
		this.rep_sep = rep_sep
		this.esc = esc
	}
}

// Every definition in the grammar files corresponds to an HL7Entity.
// The types are Message, Segment, Composite, Primitive, and Table.
class HL7Entity {
	constructor(type_id, file_of_origin, grammar) {
		this.type_id = type_id
		this.file_of_origin = file_of_origin
		this.grammar = grammar
	}
}

class HL7Primitive extends HL7Entity {
	// Creates a primitive from an id and specification object (the value from underlying JSON).
	// file_of_origin is the file this definition came from, and is used in error reporting.
	constructor(type_id, body, file_of_origin, grammar) {
		super(type_id, file_of_origin, grammar)
		
		if (typeof body != "object")
			throw new HL7GrammarError(`PRIMITIVE specification must be of type 'object', not '${typeof body}.`, file_of_origin)
		
		if ("description" in body) {
			if (typeof body["description"] != "string")
				throw new HL7GrammarError(`Field 'description' on PRIMITIVE specification must be of type 'string', not '${typeof body["description"]}'.`, file_of_origin)
			this.description = body["description"]
		}
		else this.description = ""
		
		if ("long-description" in body) {
			if (typeof body["long-description"] != "string")
				throw new HL7GrammarError(`Field 'long-description' on PRIMITIVE specification must be of type 'string', not '${typeof body["long-description"]}'.`, file_of_origin)
			this.long_description = body["long-description"]
		}
		else this.long_description = ""
		
		if ("from" in body) {
			if (typeof body["from"] != "string")
				throw new HL7GrammarError(`Field 'from' on PRIMITIVE specification must be of type 'string', not '${typeof body["from"]}'.`, file_of_origin)
			this.from = body["from"]
		}
		else this.from = ""
		
		if ("length" in body) {
			if (typeof body["length"] != "number")
				throw new HL7GrammarError(`Field 'length' on PRIMITIVE specification must be of type 'number', not '${typeof body["length"]}'.`, file_of_origin)
			this.length = body["length"]
		}
		else this.length = Infinity // Unlimited
	}
	
	get_metatype() {
		return "PRIMITIVE"
	}
	
	toString() {
		return `${this.type_id} - ${this.description}${isFinite(this.length) ? ` (<=${this.length})` : ""}`
	}
}

// Represents the children of a non-primitive entity, that is, a composite, segment, or message.
// The index is as per the HL7 specification, being 1-based, and used in dot notation as in "MSH.11
// The parent fields and file_of_origin field are used in error reporting.
class HL7Constituent {
	constructor(constituent_index, body, parent_metatype, parent_type_id, file_of_origin, grammar) {
		this.index = constituent_index
		this.parent_metatype = parent_metatype
		this.parent_type_id = parent_type_id
		this.file_of_origin = file_of_origin
		this.grammar = grammar
		
		let my_name = `${parent_metatype} ${parent_type_id}.${constituent_index}`
		
		if (typeof body != "object")
			throw new HL7GrammarError(`${parent_metatype} constituent specification must be of type 'object', not '${typeof body}.`, file_of_origin)
		
		if ("description" in body) {
			if (typeof body["description"] != "string")
				throw new HL7GrammarError(`Field 'description' on ${my_name} specification must be of type 'string', not '${typeof body["description"]}'.`, file_of_origin)
			this.description = body["description"]
		}
		else this.description = ""
		
		if ("long-description" in body) {
			if (typeof body["long-description"] != "string")
				throw new HL7GrammarError(`Field 'long-description' on ${my_name} specification must be of type 'string', not '${typeof ["long-description"]}'.`, file_of_origin)
			this.long_description = body["long-description"]
		}
		else this.long_description = ""
		
		if ("from" in body) {
			if (typeof body["from"] != "string")
				throw new HL7GrammarError(`Field 'from' on ${my_name} specification must be of type 'string', not '${typeof body["from"]}'.`, file_of_origin)
			this.from = body["from"]
		}
		else this.from = ""
		
		if ("type" in body) {
			if (typeof body["type"] != "string")
				throw new HL7GrammarError(`Field 'type' on ${my_name} specification must be of type 'string', not '${typeof body["type"]}'.`, file_of_origin)
			this.type = body["type"]
		}
		else throw new HL7GrammarError(`Mandatory field 'type' on ${my_name} specification is missing.`, file_of_origin)

		if ("length" in body) {
			if (typeof body["length"] != "number")
				throw new HL7GrammarError(`Field 'length' on ${my_name} specification must be of type 'number', not '${typeof body["length"]}'.`, file_of_origin)
			this.length = body["length"]
		}
		else this.length = null // Calculated based on constituent type.
		
		if ("optionality" in body) {
			if (typeof body["optionality"] != "string")
				throw new HL7GrammarError(`Field 'optionality' on ${my_name} specification must be of type 'string', not '${typeof body["optionality"]}'.`, file_of_origin)
			if (!["R", "O", "C", "B", "W"].includes(body["optionality"]))
				throw new HL7GrammarError(`Field 'optionality' on ${my_name} specification must be one of "R", "O", "C", "B", or "W", not '${body["optionality"]}'.`, file_of_origin)
			this.optionality = body["optionality"]
		}
		else throw new HL7GrammarError(`Mandatory field 'optionality' on ${my_name} specification is missing.`, file_of_origin)

		if ("repeatability" in body) {
			if (typeof body["repeatability"] != "number")
				throw new HL7GrammarError(`Field 'repeatability' on ${my_name} specification must be of type 'number', not '${typeof body["repeatability"]}'.`, file_of_origin)
			this.repeatability = body["repeatability"]
		}
		else this.repeatability = 1
		
		if ("table" in body) {
			if (typeof body["table"] != "string")
				throw new HL7GrammarError(`Field 'table' on ${my_name} specification must be of type 'string', not '${typeof body["table"]}'.`, file_of_origin)
			this.table = body["table"]
		}
		else this.table = ""
	}
	
	toString() {
		return `${this.parent_type_id}.${this.index} - ${this.description} (${this.type})${isFinite(this.length) ? ` (<=${this.length})` : ""}`
	}
}

// Base class for composites, segments, and messages, which are internally all basically the same.
class HL7NonPrimitive extends HL7Entity {
	// Creates a non-primitive from an id and specification object (the value from underlying JSON).
	// "kind" is the exact metatype of this entity, used to clarify error messages.
	// "file_of_origin" is the file this definition came from, and is used in error reporting.
	constructor(type_id, body, kind, file_of_origin, grammar) {
		super(type_id, file_of_origin, grammar)
		
		if (typeof body != "object")
			throw new HL7GrammarError(`${kind} specification must be of type 'object', not '${typeof body}.`, file_of_origin)
		
		if ("description" in body) {
			if (typeof body["description"] != "string")
				throw new HL7GrammarError(`Field 'description' on ${kind} specification must be of type 'string', not '${typeof body["description"]}'.`, file_of_origin)
			this.description = body["description"]
		}
		else this.description = ""
		
		if ("long-description" in body) {
			if (typeof body["long-description"] != "string")
				throw new HL7GrammarError(`Field 'long-description' on ${kind} specification must be of type 'string', not '${typeof body["long-description"]}'.`, file_of_origin)
			this.long_description = body["long-description"]
		}
		else this.long_description = ""
		
		if ("from" in body) {
			if (typeof body["from"] != "string")
				throw new HL7GrammarError(`Field 'from' on ${kind} specification must be of type 'string', not '${typeof body["from"]}'.`, file_of_origin)
			this.from = body["from"]
		}
		else this.from = ""
		
		if ("constituents" in body) {
			if (!Array.isArray(body["constituents"]))
				throw new HL7GrammarError(`Field 'constituents' on ${kind} specification must be of type 'array', not '${typeof body["constituents"]}'.`, file_of_origin)
			
			this.constituents = []
			for (let constituent_index = 0; constituent_index < body["constituents"].length; constituent_index++) {
				// This try-catch allows errors to be detected in multiple constituents on a single entity definition.
				// Otherwise, the first error in any constituent would float all the way up to consume() which would move on to the next entity.
				try { 
					let constituent_body = body["constituents"][constituent_index]
					this.constituents.push(new HL7Constituent(constituent_index+1, constituent_body, kind, type_id, file_of_origin, grammar))
				}
				catch (err) {
					if (err instanceof HL7GrammarError) this.grammar.new_error(err)
					else throw err
				}
			}
		}
		else throw new HL7GrammarError(`Mandatory field 'constituents' on ${kind} specification is missing.`, file_of_origin)
	}
	
	// Checks that the constituents on this item exist on the HL7 grammar.
	// Also checks that their metatypes are present in the passed array, this is the metatype checking system.
	validate_constituents(valid_types) {
		for (let constituent of this.constituents) {
			try {
				let constituent_name = `${this.type_id}.${constituent.index} - ${constituent.description}`
				
				let underlying_type = this.grammar.get_entity(constituent.type)
				
				if (underlying_type == null)
					throw new HL7GrammarError(`'${constituent_name}' specifies type ${constituent.type}, which does not exist.`, this.file_of_origin)
				
				if (!valid_types.includes(underlying_type.get_metatype())) {
					// Note the lack of support for more than two valid metatypes. It's not like it's gonna change anytime soon. Surely.
					let acceptable_metatypes_text = valid_types.length == 1 ? valid_types[0] : `${valid_types[0]} or ${valid_types[1]}`
					throw new HL7GrammarError(`'${constituent_name}' specifies type ${constituent.type} (of ${underlying_type.file_of_origin}), which is of metatype ${underlying_type.get_metatype()}, not ${acceptable_metatypes_text}.`, this.file_of_origin)
				}
			}
			catch (err) {
				if (err instanceof HL7GrammarError) this.grammar.new_error(err)
				else throw err
			}
		}
	}
	
	toString() {
		return `${this.type_id} - ${this.description}${isFinite(this.length) ? ` (<=${this.length})` : ""}`
	}
}

// A composite can appear as the subcomponent of a segment alongside primitives.
// The components of a composite are always primitives, and are delimited by the subcomponent separator.
class HL7Composite extends HL7NonPrimitive {
	constructor(type_id, body, file_of_origin, grammar) {
		super(type_id, body, "COMPOSITE", file_of_origin, grammar)
	}
	
	get_metatype() {
		return "COMPOSITE"
	}
}

// An HL7 Segment is a single line in an HL7 message.
// It contains delimited fields, sub-fields.
// The delimiters depend on the message and must be passed to this function UNLESS the segment is an MSH (Message Header) segment,
// from which the delimiters are read, which is always the first segment in a message.
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