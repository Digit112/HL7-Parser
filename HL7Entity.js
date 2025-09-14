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
	
	// Returns the value corresponding to the passed key on the passed dictionary
	// if it exists, or the default otherwise.
	// Throws an HL7GrammarError if the type of the read value doesn't match the specified type.
	// Will also throw if numeric values don't fall in the passed range.
	attempt_read(body, type, key, my_name, default_value=null, min_value=-Infinity, max_value=+Infinity) {
		if (!["boolean", "integer", "float", "string", "array", "object"].includes(type))
			throw new Error(`Invalid type '${type}' passed to attempt_read()`)
		
		if (max_value < min_value)
			throw new Error("max_value must not be less than min_value.")
		
		if (key in body) {
			let value = body[key]
			
			// Figure out the exact type of this value, noting a difference between integers and floats.
			let type_of_value = Array.isArray(value) ? "array" : typeof value
			if (type_of_value == "number") {
				if (Number.isInteger(value))
					type_of_value = "integer"
				else
					type_of_value = "float"
			}
			
			if (type_of_value != type && !(type_of_value == "integer" && type == "float")) // Note an integer is acceptable in a float field.
				throw new HL7GrammarError(`Field '${key}' on ${my_name} specification must be of type '${type}', not '${type_of_value}'.`, this.file_of_origin)
			
			if ((type == "integer" || type == "float") && (value < min_value || value > max_value)) {
				let range_text = null
				if (min_value > -Infinity) {
					if (max_value < Infinity)
						range_text = `greater than ${min_value} and less than ${max_value}`
					else
						range_text = `greater than ${min_value}`
				}
				else {
					if (max_value < Infinity)
						range_text = `less than ${max_value}`
					else
						console.assert(false, "Type is apparently less than -Infinity or greater than +Infinity.")
				}
				
				throw new HL7GrammarError(`Field '${key}' on ${my_name} specification must be ${range_text}.`)
			}
			
			return value
		}
		else {
			return default_value
		}
	}
}