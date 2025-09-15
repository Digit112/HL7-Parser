class HL7Table extends HL7Entity {
	constructor(type_id, body, file_of_origin, grammar) {
		super(type_id, file_of_origin, grammar)
		
		let my_name = `TABLE ${type_id}`
		
		this.description = this.attempt_read(body, "string", "description", my_name, "")
		this.long_description = this.attempt_read(body, "string", "long-description", my_name, "")
		this.from = this.attempt_read(body, "string", "from", my_name, "")
		
		this.max_length = this.attempt_read(body, "integer", "length", my_name, null, 0, Infinity)
		
		if (!("values" in body))
			throw new HL7GrammarError(`Mandatory field 'values' on ${my_name} specification is missing.`, file_of_origin)
		
		let values = body["values"]
		if (typeof values != "object")
			throw new HL7GrammarError(`Field 'values' on ${my_name} specification must be object or array, not ${typeof values}.`, file_of_origin)
		
		// key-value pairs appear as array of 2-tuples.
		if (Array.isArray(values)) {
			for (let pair of values) {
				if (!Array.isArray(pair))
					throw new HL7GrammarError(`Field 'values' on ${my_name} specification, when it is an array, must contain only arrays.`, file_of_origin)
				
				if (pair.length != 2)
					throw new HL7GrammarError(`Field 'values' on ${my_name} specification, when it is an array, must contain only arrays of length 2 (key-value pairs), not ${pair.length}.`, file_of_origin)
				
				for (let i = 0; i < 2; i++) {
					let index_string = i == 0 ? "keys" : "values"
					if (typeof pair[i] != "string" && !Array.isArray(pair[i]))
						throw new HL7GrammarError(`${index_string} in field 'values' on ${my_name} specification, must always be a string or array, not ${typeof pair[i]}.`, file_of_origin)
				}
				
				this.values = values
			}
		}
		// key-value pairs appear as dictionary
		else {
			for (let key in values) {
				if (typeof values[key] != "string" && !Array.isArray(values[key]))
					throw new HL7GrammarError(`${index_string} in field 'values' on ${my_name} specification, must always be a string or array, not ${typeof pair[i]}.`, file_of_origin)
			}
			
			this.values = []
			for (let key in values) {
				this.values.push([key, values[key]])
			}
		}
	}
	
	cache_length() {
		let acc_max_length = 0
		for (let pair of this.values) {
			if (typeof(pair[0]) == "string") {
				var key_length = pair[0].length
			}
			else {
				var key_length = pair[0].reduce((acc, item) => acc + item.length, 0) + pair[0].length - 1
			}
			
			if (key_length > acc_max_length) acc_max_length += key_length
		}
		
		if (this.max_length != null) {
			if (this.max_length < acc_max_length)
				throw new HL7GrammarError(`Explicitly specified length on TABLE ${this.type_id} specification is insufficient to represent the values of the table (${this.max_length} < ${acc_max_length}).`, file_of_origin)
		}
		else {
			this.max_length = acc_max_length
		}
	}
	
	get_metatype() {
		return "TABLE"
	}
	
	toString() {
		let description_text = this.description != null ? " - " + this.description : ""
		let length_text = this.max_length == null ? " LEN NUL" : " LEN " + this.max_length.toString().padStart(3, "·")
		return `${this.type_id}${length_text}${description_text}`
	}
	
	explain() {
		let explanation = this.get_metatype() + " " + this.toString()
		
		let long_desc = ""
		if (this.long_description != "") long_desc += this.long_description + "\n"
		if (this.from != "") long_desc += "From " + this.grammar.version_id + " § " + this.from
		if (long_desc != "") explanation += "\n" + long_desc
		
		for (let pair of this.values) {
			let key_text = typeof pair[0] == "string" ? pair[0] : pair[0].join("&")
			let val_text = typeof pair[1] == "string" ? pair[1] : pair[1].join(", ")
			explanation += `\n${key_text} : ${val_text}`
		}
		
		console.log(explanation)
	}
}