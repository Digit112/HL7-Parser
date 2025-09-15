// Represents the children of a non-primitive entity, that is, a subcomposite, composite, segment, or message.
// The index is as per the HL7 specification, being 1-based, and used in dot notation as in "MSH.11
// The parent fields and file_of_origin field are used in error reporting.
class HL7Constituent extends HL7Entity {
	constructor(first_constituent_id, depth, body, parent_metatype, parent_type_id, file_of_origin, grammar) {
		let depth_letter = String.fromCharCode(65 + Math.min(depth, 25)) // Note after depth letter Z it just uses Z forever.
		let my_type_id = "constituents" in body ? `${parent_type_id}.${first_constituent_id}.${depth_letter}` : `${parent_type_id}.${first_constituent_id}`
		super(my_type_id, file_of_origin, grammar)
		
		this.index = first_constituent_id
		this.depth_letter = depth_letter
		this.parent_metatype = parent_metatype
		this.parent_type_id = parent_type_id
		
		// If this is an individual constituent, this is equal to the value of first_consituent_id that was passed to the constructor.
		// Otherwise, if this is a segment group, it's that same number plus the total number of segments descending from this segment group, minus 1.
		// Note that the latter definition implies the former since an individual constituent is like a group of 1 constituent.
		// It is output in debugging and error messages to identify the segment in a group-agnostic way.
		this.last_constituent_id = null
		
		let my_name = `${this.parent_metatype} ${this.parent_type_id}.${this.index}`
		
		if (typeof body != "object" || Array.isArray(body))
			throw new HL7GrammarError(`${my_name} specification must be of type 'object'.`, file_of_origin)
		
		this.description = this.attempt_read(body, "string", "description", my_name, "")
		this.long_description = this.attempt_read(body, "string", "long-description", my_name, "")
		this.from = this.attempt_read(body, "string", "from", my_name, "")
		
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
					let new_constituent = new HL7Constituent(next_constituent_id, depth+1, constituent_body, parent_metatype, parent_type_id, file_of_origin, grammar)
					this.constituents.push(new_constituent)
					next_constituent_id = new_constituent.last_constituent_id + 1
				}
				catch (err) {
					if (err instanceof HL7GrammarError) this.grammar.new_error(err)
					else throw err
				}
			}
			
			this.type = null
			this.max_length = null
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
				this.max_length = body["length"]
			}
			else this.max_length = null // Calculated based on constituent type.
			
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
					// Generate textual representation of valid types list.
					let acceptable_metatypes_text = valid_types[0]
					for (let i = 1; i < valid_types.length; i++) {
						if (i == valid_types.length-1)
							acceptable_metatypes_text += ", or "
						else
							acceptable_metatypes_text += ", "
						
						acceptable_metatypes_text += valid_types[i]
					}
					
					
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
		if (this.grammar.finalized) throw new Error("Can't calculate lengths after grammar is finalized. All lengths should be cached.")
		
		let my_name = `${this.parent_metatype} ${this.parent_type_id}.${this.index}` // For error reporting.
		
		// An individual constituent's length, if not explicitly specified, is the length of its backing table if available or the length of its backing type otherwise.
		if (!this.is_segment_group()) {
			// Obtain backing type and backing table.
			let type_entity = this.grammar.get_entity(this.type)
			
			// Check for a null underlying type.
			// This error must've been reported earlier during validation error, but such errors do not prevent parsing from continuing.
			if (type_entity == null) {
				type_entity = { // Create dummy underlying type
					"length": Infinity,
					"get_metatype": () => "UNDEFINED"
				}
			}
			
			let table_entity = null
			if (this.table != null) {
				table_entity = this.grammar.get_entity(this.table)
				
				if (table_entity != null) // Null tables usually correspond to user-defined tables.
					console.assert(table_entity.max_length != null)
			}

			// Error checking that all lengths make sense!
			// An explicitly specified length must be sufficent to represent the values in its backing table, if any, but small enough to not exceed the max length of its backing type.
			// Of course, the taable length must also be less than the max length of the backing type.
			
			// Check that explicitly specified length is consistent with backing table length.
			if (table_entity != null && this.max_length != null && table_entity.max_length > this.max_length)
				this.grammar.new_error(new HL7GrammarError( // Note this "Error" doesn't actually stop processing.
					`Explicitly-specified length on ${my_name} is insufficient to express the values in the backing table 'TABLE ${this.table}' whose length is greater (${table_entity.max_length} > ${this.max_length}).`
				), this.file_of_origin)
		
			// Check that table length is consistent with underlying type length.
			if (table_entity != null && table_entity.max_length != null && table_entity.max_length > type_entity.max_length)
				this.grammar.new_error(new HL7GrammarError( // Note this "Error" doesn't actually stop processing.
					`Length of the underlying type '${type_entity.get_metatype()} ${this.type}' on ${my_name} is insufficient to express the values in the backing table 'TABLE ${this.table}' whose length is greater: (${table_entity.max_length} > ${type_entity.max_length}).`
				), this.file_of_origin)
			
			// Check that explicitly specified length is consistent with backing type length.
			if (this.max_length != null && this.max_length > type_entity.max_length)
				this.grammar.new_error(new HL7GrammarError( // Note this "Error" doesn't actually stop processing.
					`Length of the underlying type '${type_entity.get_metatype()} ${this.type}' on ${my_name} is less than the explicitly-specified length and is therefore insufficient: (${type_entity.max_length} < ${this.max_length}).`
				), this.file_of_origin)
			
			// Okay, now we can actually set the length:
			if (this.max_length == null) {
				if (table_entity != null) {
					this.max_length = table_entity.max_length
				}
				else {
					this.max_length = type_entity.max_length
				}
			}
		}
		// A segment group's length is, of course, the sum of the lengths of its constituents, plus the number of delimiters.
		// The segment delimiter is always a carriage-return, which is distinct from a CRLF or an LF alone.
		else {
			// Length must never be explicitly specified on a segment group, for now.
			// if (this.max_length != null) { ... }
			
			// A segment group must also never have a backing table or type, simplifying the calculation drastically.
			
			this.max_length = this.constituents.length - 1 // Account for the length of the segment delimiters.
			for (let constituent of this.constituents) {
				constituent.cache_length()
				this.max_length += constituent.max_length
			}
		}
	}
	
	is_segment_group() {
		return this.constituents != null
	}
	
	// Returns this constituent if it matches the requested index and depth letter,
	// Searches constituents if this is a segment group.
	get_constituent(target_index, target_depth_letter=null) {
		if (!(target_index >= 1 && this.last_constituent_id >= target_index)) {
			throw new Error(`constituent target_index ${target_index} is not in the valid range 1 <= target_index <= ${this.last_constituent_id}`)
		}
		
		if (this.is_segment_group()) {
			if (target_depth_letter != null && target_depth_letter == this.depth_letter) {
				return this
			}
			
			for (let constituent of this.constituents) {
				if (target_index <= constituent.last_constituent_id) {
					return constituent.get_constituent(target_index, target_depth_letter)
				}
			}
		}
		else {
			return this
		}
		
		return null
	}
	
	toString(indent=0) {
		let optionality_text = this.optionality + " "
		let repeatability_text = isFinite(this.repeatability) ? this.repeatability.toString().padStart(3, "·") : "INF"
		let description_text = this.description != null ? " - " + this.description : ""
		
		let index_text = this.index.toString().padEnd(2)
	
		let indent_text = ""
		for (let i = 0; i < indent; i++) indent_text += "  "
		
		if (this.is_segment_group()) {
			let explanation = indent_text + `GROUP ${this.parent_type_id}.${index_text}.${this.depth_letter} ${optionality_text}${repeatability_text}${description_text}`
			for (let constituent of this.constituents) {
				explanation += "\n" + constituent.toString(indent+1)
			}
			
			return explanation
		}
		else {
			let length_text = this.max_length == null ? "LEN NULL " : (isFinite(this.max_length) ? "LEN " + this.max_length.toString().padStart(4, "·") + " " : "LEN +INF ")
			return `${indent_text}${this.parent_type_id}.${index_text} ${length_text}${optionality_text}${repeatability_text} (${this.type})${description_text}`
		}
	}
	
	explain() {
		let explanation = "CONSTITUENT " + this.toString()
		
		let long_desc = ""
		if (this.long_description != "") long_desc += this.long_description + "\n"
		if (this.from != "") long_desc += "From " + this.grammar.version_id + " § " + this.from
		if (long_desc != "") explanation += "\n" + long_desc
		
		if (this.is_segment_group()) {
			for (let constituent of this.constituents) {
				explanation += "\n  " + constituent.toString()
			}
		}
		
		console.log(explanation)
	}
}