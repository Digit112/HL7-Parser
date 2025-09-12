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
		
		let my_name = `PRIMITIVE ${this.type_id}`
		
		if (typeof body != "object" || Array.isArray(body))
			throw new HL7GrammarError(`${my_name} specification must be of type 'object'.`, file_of_origin)
		
		if ("description" in body) {
			if (typeof body["description"] != "string")
				throw new HL7GrammarError(`Field 'description' on ${my_name} specification must be of type 'string', not '${typeof body["description"]}'.`, file_of_origin)
			this.description = body["description"]
		}
		else this.description = ""
		
		if ("long-description" in body) {
			if (typeof body["long-description"] != "string")
				throw new HL7GrammarError(`Field 'long-description' on ${my_name} specification must be of type 'string', not '${typeof body["long-description"]}'.`, file_of_origin)
			this.long_description = body["long-description"]
		}
		else this.long_description = ""
		
		if ("from" in body) {
			if (typeof body["from"] != "string")
				throw new HL7GrammarError(`Field 'from' on ${my_name} specification must be of type 'string', not '${typeof body["from"]}'.`, file_of_origin)
			this.from = body["from"]
		}
		else this.from = ""
		
		if ("length" in body) {
			if (typeof body["length"] != "number")
				throw new HL7GrammarError(`Field 'length' on ${my_name} specification must be of type 'number', not '${typeof body["length"]}'.`, file_of_origin)
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
	constructor(first_constituent_id, body, parent_metatype, parent_type_id, file_of_origin, grammar) {
		this.index = first_constituent_id
		this.parent_metatype = parent_metatype
		this.parent_type_id = parent_type_id
		this.file_of_origin = file_of_origin
		this.grammar = grammar
		
		// If this is an individual constituent, this is equal to the value of first_consituent_id that was passed to the constructor.
		// Otherwise, if this is a segment grup, it's that same number plus the total number of segments descending from this segmeent group, minus 1.
		// Note that the latter definition implies the former since an individual consituent is like a group of 1 constituent.
		// It is output in debugging and error messages to identidy the segment in a group-agnostic way.
		this.last_constituent_id = null
		
		let my_name = `${this.parent_metatype} ${this.parent_type_id}.${this.index}`
		
		if (typeof body != "object" || Array.isArray(body))
			throw new HL7GrammarError(`${my_name} specification must be of type 'object'.`, file_of_origin)
		
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
		
		if ("optionality" in body) {
			if (typeof body["optionality"] != "string")
				throw new HL7GrammarError(`Field 'optionality' on ${my_name} specification must be of type 'string', not '${typeof body["optionality"]}'.`, file_of_origin)
			if (!["R", "O", "C", "B", "W"].includes(body["optionality"]))
				throw new HL7GrammarError(`Field 'optionality' on ${my_name} specification must be one of "R", "O", "C", "B", or "W", not '${body["optionality"]}'.`, file_of_origin)
			this.optionality = body["optionality"]
		}
		else throw new HL7GrammarError(`Mandatory field 'optionality' on ${my_name} specification is missing.`, file_of_origin)

		if ("repeatability" in body) {
			if (this.parent_metatype == "COMPOSITE")
				throw new HL7GrammarError(`Field 'repeatability' on ${my_name} specification must be of type 'number', not '${typeof body["repeatability"]}'.`, file_of_origin)
			if (typeof body["repeatability"] != "number")
				throw new HL7GrammarError(`Field 'repeatability' on ${my_name} specification must be of type 'number', not '${typeof body["repeatability"]}'.`, file_of_origin)
			if (body["repeatability"] < -1 || body["repeatability"] == 0 || !Number.isInteger(body["repeatability"]))
				throw new HL7GrammarError(`Field 'repeatability' on ${my_name} specification must be a positive integer or -1 for unlimited repetitions, not '${body["repeatability"]}'.`, file_of_origin)
			if (body["repeatability"] == -1) this.repeatability = Infinity
			else this.repeatability = body["repeatability"]
			
		}
		else this.repeatability = 1
		
		// This is a segment group.
		if ("constituents" in body) {
			if (!Array.isArray(body["constituents"]))
				throw new HL7GrammarError(`Field 'constituents' on ${my_name} specification must be of type 'array', not '${typeof body["constituents"]}'.`, file_of_origin)
			
			if (this.parent_metatype != "MESSAGE")
				throw new HL7GrammarError(`Field 'constituents' on ${my_name} specification is only valid on a definition with metatype 'MESSAGE', not '${parent_metatype}'.`, file_of_origin)
			
			this.constituents = []
			let next_constituent_id = first_constituent_id
			for (let constituent_index = 0; constituent_index < body["constituents"].length; constituent_index++) {
				// This try-catch allows errors to be detected in multiple constituents on a single segment group definition.
				// Otherwise, the first error in any segment would float up to the segment group constituent constructor which would move on to the next constituent.
				try {
					let constituent_body = body["constituents"][constituent_index]
					let new_constituent = new HL7Constituent(next_constituent_id, constituent_body, parent_metatype, parent_type_id, file_of_origin, grammar)
					this.constituents.push(new_constituent)
					next_constituent_id = new_constituent.last_constituent_id + 1
				}
				catch (err) {
					if (err instanceof HL7GrammarError) this.grammar.new_error(err)
					else throw err
				}
			}
			
			this.type = null
			this.length = null
			this.table = null
			this.last_constituent_id = next_constituent_id - 1
		}
		// This is an individual constituent
		else {
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
			
			if ("table" in body) {
				if (typeof body["table"] != "string")
					throw new HL7GrammarError(`Field 'table' on ${my_name} specification must be of type 'string', not '${typeof body["table"]}'.`, file_of_origin)
				this.table = body["table"]
			}
			else this.table = null
			
			this.constituents = null
			this.last_constituent_id = first_constituent_id // = this.index
		}
	}
	
	// Checks that the underlying type of this constituent exists and has a metatype found in the valid_types list.
	// If this constituent is a segment group, calls itself recursively on its own constituents.
	validate(valid_types, parent_type_id) {
		try {
			let constituent_name = `${parent_type_id}.${this.index} - ${this.description}`
			
			if (this.is_segment_group()) {
				for (let constituent of this.constituents) {
					constituent.validate(valid_types, parent_type_id)
				}
			}
			else {
				let underlying_type = this.grammar.get_entity(this.type)
				if (underlying_type == null)
					throw new HL7GrammarError(`'${constituent_name}' specifies type ${this.type}, which does not exist.`, this.file_of_origin)
				
				if (!valid_types.includes(underlying_type.get_metatype())) {
					// Note the lack of support for more than two valid metatypes. It's not like it's gonna change anytime soon. Surely.
					let acceptable_metatypes_text = valid_types.length == 1 ? valid_types[0] : `${valid_types[0]} or ${valid_types[1]}`
					throw new HL7GrammarError(`'${constituent_name}' specifies type ${this.type} (of ${underlying_type.file_of_origin}), which is of metatype ${underlying_type.get_metatype()}, not ${acceptable_metatypes_text}.`, this.file_of_origin)
				}
			}
		}
		catch (err) {
			if (err instanceof HL7GrammarError) this.grammar.new_error(err)
			else throw err
		}
	}
	
	// Calculates the length of this field and stores it.
	// TODO: Alternatively, length caching could be recursive. It would be critical that *all* lengths are cached before finalization since it can result in many errors.
	//       In this case, the grammar's job would merely be to call the recursive method on all messages.
	cache_length() {
		// grammar.finalized() sets "consumption_completed" to true when it starts, then sets "finalized" to true before returning.
		// It must cache entity lengths in a very particular order, so meethods like this one shouldn't be called outside of it.
		if (!this.grammar.consumption_completed) throw new Error("Can't cache lengths until consuption is completed.")
		if (!this.grammar.finalized) throw new Error("Can't calculate lengths after grammar is finalized. All lengths should be cached.")
		
		let my_name = `${this.parent_metatype} ${this.parent_type_id}.${this.index}` // For error reporting.
		
		// An individual constituent's length, if not explicitly specified, is the length of its backing table if available or the length of its backing type otherwise.
		if (!this.is_segment_group()) {
			// Obtain backing type and backing table.
			let type_entity = this.grammar.get_entity(this.type)
			console.assert(this.type_entity != null)
			console.assert(this.type_entity.length != null)
			
			let table_entity = null
			if (this.table != null) {
				table_entity = this.grammar.get_entity(this.table)
				
				if (table_entity != null) // Null tables usually correspond to user-defined tables.
					console.assert(table_entity.length != null)
			}

			// Error checking that all lengths make sense!
			// An explicitly specified length must be sufficent to represent the values in its backing table, if any, but small enough to not exceed the max length of its backing type.
			// Of course, the taable length must also be less than the max length of the backing type.
			
			// Check that explicitly specified length is consistent with backing table length.
			if (table_entity != null && this.length != null && table_entity.length > this.length)
				this.grammar.new_error(new HL7GrammarError( // Note this "Error" doesn't actually stop processing.
					`Explicitly-specified length on ${my_name} is insufficient to express the values in the backing table 'TABLE ${this.table}' whose length is greater (${table_entity.length} > ${this.length}).`
				), this.file_of_origin)
		
			// Check that table length is consistent with underlying type length.
			if (table_entity != null && table_entity.length != null && table_entity.length > type_entity.length)
				this.grammar.new_error(new HL7GrammarError( // Note this "Error" doesn't actually stop processing.
					`Length of the underlying type '${type_entity.get_metatype()} ${this.type}' on ${my_name} is insufficient to express the values in the backing table 'TABLE ${this.table}' whose length is greater: (${table_entity.length} > ${type_entity.length}).`
				), this.file_of_origin)
			
			// Check that explicitly specified length is consistent with backing type length.
			if (this.length != null && this.length > type_entity.length)
				this.grammar.new_error(new HL7GrammarError( // Note this "Error" doesn't actually stop processing.
					`Length of the underlying type '${type_entity.get_metatype()} ${this.type}' on ${my_name} is less than the explicitly-specified length and is therefore insufficient: (${type_entity.length} < ${this.length}).`
				), this.file_of_origin)
			
			// Okay, now we can actually set the length:
			if (this.length == null) {
				if (table_entity != null)
					this.length = table_entity.length
				else
					this.length = type_entity.length
			}
			
			if (this.length = null)
				throw new Error(`Failed to acquire length of individual constituent ${my_name}`)
		}
		// A segment group's length is, of course, the sum of the lengths of its constituents, plus the number of delimiters.
		// The segment delimiter is always a carriage-return, which is distinct from a CRLF or an LF alone.
		else {
			// Length must never be explicitly specified on a segment group, for now.
			// if (this.length != null) { ... }
			
			// A segment group must also never have a backing table or type, simplifying the calculation drastically.
			
			this.length = this.constituents.length - 1 // Account for the length of the segment delimiters.
			for (let constituent in this.constituents) {
				constituent.cache_length()
				this.length += constituent.length
			}
		}
	}
	
	is_segment_group() {
		return this.constituents != null
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
		
		let my_name = `${kind} ${type_id}`
		
		if (typeof body != "object" || Array.isArray(body))
			throw new HL7GrammarError(`${my_name} specification must be of type 'object'.`, file_of_origin)
		
		if ("description" in body) {
			if (typeof body["description"] != "string")
				throw new HL7GrammarError(`Field 'description' on ${my_name} specification must be of type 'string', not '${typeof body["description"]}'.`, file_of_origin)
			this.description = body["description"]
		}
		else this.description = ""
		
		if ("long-description" in body) {
			if (typeof body["long-description"] != "string")
				throw new HL7GrammarError(`Field 'long-description' on ${my_name} specification must be of type 'string', not '${typeof body["long-description"]}'.`, file_of_origin)
			this.long_description = body["long-description"]
		}
		else this.long_description = ""
		
		if ("from" in body) {
			if (typeof body["from"] != "string")
				throw new HL7GrammarError(`Field 'from' on ${my_name} specification must be of type 'string', not '${typeof body["from"]}'.`, file_of_origin)
			this.from = body["from"]
		}
		else this.from = ""
		
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
					let new_constituent = new HL7Constituent(next_constituent_id, constituent_body, kind, type_id, file_of_origin, grammar)
					this.constituents.push(new_constituent)
					next_constituent_id = new_constituent.last_constituent_id + 1
				}
				catch (err) {
					if (err instanceof HL7GrammarError) this.grammar.new_error(err)
					else throw err
				}
			}
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