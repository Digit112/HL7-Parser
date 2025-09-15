/*
	Represents a parsed constituent other than segments, that is, a composite, subcomposite, or primitive.
	The passed entity type must be an HL7Constituent for one of those types.
	"level" gives the depth and thus determines the delimiter to use. 1 for "component", 2 for "subcomponent", or null.
*/
class HL7ParsedConstituent extends HL7ParsedEntity {
	constructor(grammar, body, entity, delimiters, level) {
		super(grammar, body, entity, delimiters)
		
		if (!(entity instanceof HL7Constituent)) {
			console.log(entity)
			this.failure(new HL7ParsingError("Internal Error"))
			throw new Error("Must not initialize an HL7ParsedConstituent except with an HL7Constituent")
		}
		
		let type = grammar.get_entity(entity.type)
		
		if (type == null) {
			this.failure(new HL7ParsingError(`Constituent is of unknown type '${entity.type}'.`))
			return
		}
		
		// Check level against this constituent's type's metatype.
		if (type.get_metatype() == "COMPOSITE") {
			if (level != 1) {
				this.failure(new HL7ParsingError("Internal Error"))
				throw new Error("For constituent of metatype COMPOSITE, 'level' must be 1.")
			}
		}
		else if (type.get_metatype() == "SUBCOMPOSITE") {
			if (level != 1 && level != 2) {
				this.failure(new HL7ParsingError("Internal Error"))
				throw new Error("For constituent of metatype SUBCOMPOSITE, 'level' must be 1 or 2.")
			}
		}
		else if (type.get_metatype() != "PRIMITIVE") {
			this.failure(new HL7ParsingError("Internal Error"))
			throw new Error("Must not pass a constituent to HL7ParsedConstituent other than 'COMPOSIT', 'SUBCOMPOSITE', or 'PRIMITVE'.")
		}
		
		// Array with results.
		// Each result represents one repetition of this.entity, repetitions are only valid at the segment and field level
		// (i.e. we're in an HL7ParsedSegment or an HL7ParsedConstituent where level == 1, that is, we're parsing a single segment or field.)
		// Where repetitions are invalid, this.repetitions will always have length zero or one.
		
		// Each result is an HL7ParsedEntity if this.entity is a composite or subcomposite,
		// A string if this.entity is a primitive.
		this.repetitions = []
		
		let repetition_bodies = [this.body]
		if (level == 1) { // On the field level, we split based on repetitions.
			repetition_bodies = this.body.split(delimiters["repeat"])
			if (repetition_bodies.length > entity.repeability) {
				this.errors.push(new HL7ParsingError(`Too many repetitions of ${entity.parent_type_id}.${entity.index}. Discarding extras.`))
				repetition_bodies = repetition_bodies.slice(0, entity.repeability)
			}
			
			// Check for repetitions of this field.
			if (repetition_bodies.length > 1) {
				if (repetition_bodies.length > entity.repeability) {
					this.errors.push(new HL7ParsingError(`Too many repetitions of ${entity.parent_type_id}.${entity.index}. Discarding extras.`))
					repetition_bodies = repetition_bodies.slice(0, entity.repeability)
				}
				
				// Recurse with the same params, but using only a single body.
				for (let repetition_body_i = 0; repetition_body_i < repetition_bodies.length; repetition_body_i++) {
					let repetition_body = repetition_bodies[repetition_body_i]
					
					let parsed_repetition = new HL7ParsedConstituent(this.grammar, repetition_body, this.entity, this.delimiters, level)
					console.assert(parsed_repetition.repetitions.length == 1, parsed_repetition)
					
					if (parsed_repetition.has_errors()) {
						let repetition_name = `${type.type_id}.${constituent.index} - '${constituent.description}' repetition ${repetition_body_i+1}`
						if (parsed_repetition.malformed && constituent.optionality == "R") {
							this.failure(new HL7ParsingError(`Constituent ${repetition_name} is malformed.`, [parsed_repetition]))
						}
						else {
							this.errors.push(new HL7ParsingError(`Error(s) encountered while parsing constituent ${repetition_name}.`, [parsed_repetition]))
						}
					}
					
					this.repetitions.push(parsed_repetition.repetitions[0])
				}
			}
		}
		
		// If the above function split the field, we should be done thanks to the recurse.
		if (repetition_bodies.length > 1) {
			console.assert(this.repetitions.length == repetition_bodies.length, this.repetitions, repetition_bodies)
			this.success()
			return
		}
		
		/* At this point, we know that we are parsing a single non-repeating instance. */
		
		this.repetitions = []
		if (type.get_metatype() == "PRIMITIVE") {
			// "" is what HL7 calls the "null value, it signifies a blank value as opposed to "no data"
			// Required fields can be blank. TODO: Am I sure of this?
			if (this.body == '""') {
				this.repetitions.push("")
			}
			// Check for empty field and error if the field is required.
			else if (this.body == "") {
				if (this.entity.optionality == "R") {
					this.failure(new HL7ParsingError(`Required field ${this.entity.parent_type_id}.${this.entity.index} is missing.`))
				}
				
				this.repetitions.push(null)
			}
			else {
				// TODO: Check lengths
				this.repetitions.push(this.body)
			}
		}
		else if (type.get_metatype() == "SUBCOMPOSITE" || type.get_metatype() == "COMPOSITE") {
			this.repetitions.push([])
			
			// Parsing an individual.
			let component_bodies = this.body.split(delimiters["components"][level])
			for (let constituent_i = 0; constituent_i < type.constituents.length; constituent_i++) {
				let constituent = type.constituents[constituent_i]
				let constituent_entity = this.grammar.get_entity(constituent.type_id)
				
				if (constituent_entity == null) {
					this.errors.push(new HL7ParsingError(`Can't parse constituent ${this.entity.type_id}.${constituent.index} of unknown type ${constituent.type_id}. Grammar file must be malformed.`))
					continue
				}
				
				// HL7 allows trailing delimiters to be omitted beyond the last non-empty component.
				// Thus, component_bodies may not be as long as constituents.
				let component_body = ""
				if (constituent_i < component_bodies.length) {
					component_body = component_bodies[constituent_i]
				}
				let component_name = `${type.type_id}.${constituent.index} - '${constituent.description}' (${constituent.optionality})`
				
				console.log(`Parsing '${component_body}' as ${component_name}`)
				let parsed_component = new HL7ParsedConstituent(this.grammar, component_body, constituent, delimiters, level+1)
				
				if (parsed_component.has_errors()) {
					if (parsed_component.malformed && constituent.optionality == "R") {
						console.log("malformed constituent.")
						this.failure(new HL7ParsingError(`Constituent ${component_name} is malformed.`, [parsed_component]))
					}
					else {
						console.log("erroneous constituent.")
						this.errors.push(new HL7ParsingError(`Error(s) encountered while parsing constituent ${component_name}.`, [parsed_component]))
					}
				}
				
				this.repetitions[0].push(parsed_component)
			}
		}
		
		// Fucking hell
		if (this.malformed == null) {
			this.success()
		}
	}
}