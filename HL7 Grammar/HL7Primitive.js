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
			this.max_length = body["length"]
		}
		else this.max_length = Infinity // Unlimited
	}
	
	get_metatype() {
		return "PRIMITIVE"
	}
	
	toString() {
		let description_text = this.description != "" ? " - " + this.description : ""
		let length_text = isFinite(this.max_length) ? " LEN " + this.max_length.toString().padStart(4, "·") : " LEN +INF "
		return `${this.type_id}${length_text}${description_text}`
	}
	
	explain() {
		let explanation = this.get_metatype() + " " + this.toString()
		
		let long_desc = ""
		if (this.long_description != "") long_desc += this.long_description + "\n"
		if (this.from != "") long_desc += "From " + this.grammar.version_id + " § " + this.from + "\n"
		if (long_desc != "") explanation += "\n" + long_desc
		
		console.log(explanation)
	}
}