/*
	Represents the result of parsing a segment.
	Since a segment declares its type, the type need not be specified.
*/
class HL7ParsedSegment extends HL7ParsedEntity {
	constructor(grammar, body, delimiters) {
		if (body.length < 4) {
			super(grammar, body)
			this.failure(new HL7ParsingError("Segment too short."))
			return
		}
		
		let type_id = body.slice(0, 3)
		let entity = grammar.get_entity(type_id)
		if (entity == null) {
			super(grammar, body)
			this.failure(new HL7ParsingError(`Unknown segment '${type_id}'.`))
			return
		}
		
		super(grammar, body, entity, delimiters)
		
		let field_bodies = body.split(delimiters["components"][0]).slice(1)
		
		// Special code for MSH
		if (type_id == "MSH")
			field_bodies.unshift(delimiters["components"][0])
		
		this.fields = []
		for (let constituent_i = 0; constituent_i < entity.constituents.length; constituent_i++) {
			let constituent = entity.constituents[constituent_i]
			
			// HL7 allows trailing delimiters to be omitted  beyond the last non-empty field.
			// Thus, field_bodies may not be as long as constituents.
			let field_body = ""
			if (constituent_i < field_bodies.length) {
				field_body = field_bodies[constituent_i]
			}
			
			//console.log(`Parsing '${field_body}' as ${entity.type_id}.${constituent.index} - '${constituent.description}'`)
			let new_field = new HL7ParsedConstituent(grammar, field_body, constituent, delimiters, 1)
			
			if (new_field.has_errors()) {
				if (new_field.malformed && constituent.optionality == "R") {
					this.failure(new HL7ParsingError(`Constituent ${entity.type_id}.${constituent.index} is malformed.`, [new_field]))
				}
				else {
					this.errors.push(new HL7ParsingError(`Error(s) encountered while parsing constituent ${entity.type_id}.${constituent.index}.`, [new_field]))
				}
			}
			
			this.fields.push(new_field)
		}
	}
}