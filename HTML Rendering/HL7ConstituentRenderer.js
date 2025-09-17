class HL7ConstituentRenderer extends HL7EntityRenderer {
	// Creates a renderer for a particular constituent.
	// Despite being constituents, segments are handled by HL7SegmentRenderer and will be rejected by this class.
	constructor(parsed_entity, parent_renderer) {
		super(parsed_entity)
		
		this.parent_renderer = parent_renderer
		
		console.log(this)
		
		this.constituent_description_div = parent_renderer.constituent_description_div
		this.entity_description_div = parent_renderer.entity_description_div
		
		// A renderer for each repetition of the passed parsed_entity.
		// A constituent's repetitions only ever have one repetition.
		// Despite being constituents - and repeatable - segment repetitions are not represeented here.
		// Segments and segment groups are handled by the HL7ParsedMessage and HL7MessageRenderer classes.
		this.repetitions = null
		
		// Get the type of the constituent.
		if (this.parsed_entity instanceof HL7ParsedConstituent) {
			this.constituent_type = this.parsed_entity.grammar.get_entity(this.parsed_entity.entity.type)
			if (this.constituent_type == null)
				throw new Error(`Underlying constituent type '${this.parsed_entity.entity.type} is unknown`)
		}
		else {
			console.log(this)
			this.constituent_type = this.parsed_entity.grammar.get_entity(this.parsed_entity.entity.type_id)
			if (this.constituent_type == null)
				throw new Error(`Underlying segment type '${this.parsed_entity.entity.type_id} is unknown`)
		}
		
		// Construct renderers for child elements.
		if (this.parsed_entity instanceof HL7ParsedConstituent) {
			if (this.constituent_type.get_metatype() != "PRIMITIVE") {
				this.repetitions = []
				for (let rep_i = 0; rep_i < this.parsed_entity.repetitions.length; rep_i++) {
					let parsed_repetition = this.parsed_entity.repetitions[rep_i]
					
					let component_renderers = []
					for (let comp_i = 0; comp_i < parsed_repetition.length; comp_i++) {
						let component = parsed_repetition[comp_i]
						component_renderers.push(new HL7ConstituentRenderer(component, this))
					}
					
					this.repetitions.push(component_renderers)
				}
			}
			else {
				// A parsed primitive entity has strings for repetitions.
				// Therefore, it makes no sense to make ConstituentRenderers out of them.
				this.repetitions = null
			}
		}
		else if (this.parsed_entity instanceof HL7ParsedSegment) {
			let field_renderers = []
			for (let parsed_field of this.parsed_entity.fields) {
				let new_field_renderer = new HL7ConstituentRenderer(parsed_field, this)
				field_renderers.push(new_field_renderer)
			}
			
			this.repetitions = [field_renderers]
		}
		else {
			throw new Error("Passed parsed entity must be an HL7ParsedConstituent or HL7ParsedSegment.")
		}
	}
	
	// Level determines the delimiters to use (the characters themselves are stashed in this.parsed_entity.delimiters)
	// Level must be 1 or 2, level 0 is the field delimiter which is only used by HL7SegmentRenderer
	render(level) {
		let rendered_constituent = document.createElement("span")
		
		for (let rep_i = 0; rep_i < this.parsed_entity.repetitions.length; rep_i++) {
			let repetition = this.parsed_entity.repetitions[rep_i]
			if (rep_i > 0) rendered_constituent.append(this.parsed_entity.delimiters["repeat"])
				
			let rendered_repetition = document.createElement("span")
			
			if (this.constituent_type.get_metatype() == "PRIMITIVE") {
				rendered_repetition.setAttribute("class", "token-atom")
				rendered_repetition.addEventListener("click", () => {this.render_description()})
				
				if (this.parsed_entity.body.length > 0) {
					rendered_repetition.textContent = this.parsed_entity.body
				}
				else {
					rendered_repetition.setAttribute("class", "token-atom token-atom-empty")
					rendered_repetition.textContent = "␣"
				}
			}
			// Must be SEGMENT, COMPOSITE, SUBCOMPOSITE
			else { 
				for (let comp_i = 0; comp_i < repetition.length; comp_i++) {
					let component = repetition[comp_i]
					
					if (comp_i > 0) rendered_constituent.append(this.parsed_entity.delimiters["components"][level])
					let component_renderer = this.repetitions[rep_i][comp_i]
					let rendered_component = component_renderer.render(level+1)
					
					rendered_repetition.append(rendered_component)
				}
			}
			
			rendered_constituent.append(rendered_repetition)
		}
		
		return rendered_constituent
	}
	
	render_description() {
	}
}