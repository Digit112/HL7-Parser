class HL7ParsingError {
	// An error with a message and optionally an object whose errors are cited.
	// The citations are meant to demonstrate the cause of an error to a greater
	// degree of granularity than the creator of this error could reasonably intuit.
	// This chaining of citations allows the hierarchical arrangement of errors.
	constructor(message, citations=null) {
		if (this.citations != null) {
			if (!Array.isArray(citations)) {
				console.log(citations)
				throw new Error("Citations must be array or null.")
			}
			
			for (let citation of citations) {
				if (!(citation instanceof HL7ParsedEntity)) {
					console.log(citation)
					throw new Error("Citation must be HL7ParsedEntity")
				}
			}
		}
		
		this.message = message
		this.citations = citations
	}
}

/*
	This class accepts an HL7 grammar and parses the passed entity as per the grammar.
	The body is the raw text to be parsed,
	the entity is an HL7Entity to be parsed. Derivatives of this class have the actual parsing code.
	The "delimiters" is a simple object crafted by HL7ParsedMessage, whose constructor catalyzes the entire parsing process.
*/
class HL7ParsedEntity {
	constructor(grammar, body, entity, delimiters) {
		if (grammar == null)
			throw new Error("Grammar must not be null")
		if (body == null)
			throw new Error("Body must not be null")
		if (entity == null)
			throw new Error("Entity must not be null")
		
		this.grammar = grammar
		this.body = body
		this.entity = entity
		this.delimiters = delimiters
		
		this.errors = []
		this.malformed = null
	}
	
	success() {
		this.malformed = false
	}
	
	failure(reason) {
		if (reason == null)
			// This ensures that all malformed entities have at least one, relevant error.
			throw new Error("Parsing failure must have an accompanying reason.")
		if (!(reason instanceof HL7ParsingError))
			throw new Error("Parsing failure's reason must be an HL7ParsingError.")
		
		// Reason for total parsing failure is always first,
		// although there is no reason that this function couldn't be called multiple times.
		this.errors.unshift(reason)
		this.malformed = true
	}
	
	has_errors() {
		return this.errors.length > 0
	}
}