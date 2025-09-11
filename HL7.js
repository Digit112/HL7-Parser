class HL7Delimiters {
	constructor(seg_sep, comp_sep, subcomp_sep, rep_sep, esc) {
		this.seg_sep = seg_sep
		this.comp_sep = comp_sep
		this.subcomp_sep = subcomp_sep
		
		this.rep_sep = rep_sep
		this.esc = esc
	}
}

class HL7Primitive {
	// Creates a primitive from an id and specification object (the value from underlying JSON).
	// file_of_origin is the file this definition came from, and is used in error reporting.
	constructor(type_id, body, file_of_origin) {
		if (typeof body != "object")
			throw new HL7GrammarError(`PRIMITIVE specification must be of type 'object', not '${typeof body}.`, file_of_origin)
		
		this.type_id = type_id
		this.file_of_origin = file_of_origin
		
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
}

// Base class for composites, segments, and messages, which are internally all basically the same.
class HL7NonPrimitive {
	// Creates a non-primitive from an id and specification object (the value from underlying JSON).
	// file_of_origin is the file this definition came from, and is used in error reporting.
	constructor(type_id, body, file_of_origin) {
		// TODO CONSTRUCTOR THIS AIN'T DONE YET IT'S JUST A COPY OF PRIMITIVE!
		if (typeof body != "object")
			throw new HL7GrammarError(`PRIMITIVE specification must be of type 'object', not '${typeof body}.`, file_of_origin)
		
		this.type_id = type_id
		this.file_of_origin = file_of_origin
		
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
}

// An HL7 Segment is a single line in an HL7 message.
// It contains delimited fields, sub-fields, and sub-sub-fields.
// The delimiters depend on the message and must be passed to this function UNLESS the segment is an MSH (Message Header) segment,
// from which the delimiters are read, which is always the first segment in a message.
class HL7Segment extends HL7NonPrimitive {
	constructor(type_id, body, file_of_origin) {
		super(type_id, body, file_of_origin)
	}
	
	get_metatype() {
		return "SEGMENT"
	}
}

class HL7Message {
	constructor(raw) {
		if (raw.length < 8) throw new Error(`HL7 message '${raw}' has insufficient length.`)
		if 	(!raw.startsWith("MSH")) throw new Error(`HL7 message must begin wiwth an 'MSH' segment, not ${raw.substring(0, 3)}`)
	
		// Extract delimiters.
		this.delimiters = new HL7Delimiters(raw[3], raw[4], raw[7], raw[5], raw[6])
	}
}