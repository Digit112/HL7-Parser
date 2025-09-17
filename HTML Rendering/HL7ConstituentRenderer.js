class HL7ConstituentRenderer {
	// Creates a renderer for a particular constituent.
	// Despite being constituents, segments are handled by HL7SegmentRenderer and will be rejected by this class.
	constructor(parsed_constituent, parent_renderer, constituent_description_div, entity_description_div) {
		if (!(parsed_constituent instanceof HL7ParsedConstituent)) {
			console.log(parsed_constituent)
			throw new Error("parsed_constituent must be HL7ParsedConstituent.")
		}
		
		if (!(parent_renderer instanceof HL7SegmentRenderer || parent_renderer instanceof HL7ConstituentRenderer)) {
			console.log(parent_renderer)
			throw new Error("parent_renderer must be HL7SegmentRenderer or HL7ConstituentRenderer.")
		}
		
		this.parsed_constituent = parsed_constituent
		this.parent_renderer = parent_renderer
		
		this.constituent_type = this.parsed_constituent.grammar.get_entity(this.parsed_constituent.entity.type)
		if (this.constituent_type == null)
			throw new Error(`Parsed constituent is of unknown type '${this.parsed_constituent.entity.type}'.`)
		
		this.constituent_description_div = constituent_description_div
		this.entity_description_div = entity_description_div
		
		// Build out constituent renderers
		if (this.constituent_type.get_metatype() == "PRIMITIVE") {
			this.repetition_renderers = null // No constituents to render.
		}
		else if (this.constituent_type.get_metatype() == "COMPOSITE" || this.constituent_type.get_metatype() == "SUBCOMPOSITE") {
			this.repetition_renderers = []
			for (let rep_i = 0; rep_i < this.parsed_constituent.repetitions.length; rep_i++) {
				let repetition = this.parsed_constituent.repetitions[rep_i]
				
				let component_renderers = []
				for (let comp_i = 0; comp_i < repetition.length; comp_i++) {
					component_renderers.push(new HL7ConstituentRenderer(repetition[comp_i], this, this.constituent_description_div, this.entity_description_div))
				}
				
				this.repetition_renderers.push(component_renderers)
			}
		}
		else {
			console.log(this.constituent_type)
			throw new Error("parsed_constituent must have backing type of 'PRIMITIVE', 'SUBCOMPOSITE', or 'COMPOSITE'.")
		}
		
		// console.log(parsed_constituent)
	}
	
	// Level determines the delimiters to use (the characters themselves are stashed in this.parsed_constituent.delimiters)
	// Level must be 1 or 2, level 0 is the field delimiter which is only used by HL7SegmentRenderer
	render(level) {
		let rendered_constituent = document.createElement("span")
		
		if (this.constituent_type.get_metatype() == "PRIMITIVE") {
			rendered_constituent.addEventListener("click", () => this.render_description())
			
			if (this.parsed_constituent.body != "") {
				rendered_constituent.setAttribute("class", "token-atom")
				rendered_constituent.textContent = this.parsed_constituent.body
			}
			else {
				rendered_constituent.setAttribute("class", "token-atom token-atom-empty")
				rendered_constituent.textContent = "␣"
			}
		}
		else { // Must be COMPOSITE or SUBCOMPOSITE
			for (let rep_i = 0; rep_i < this.parsed_constituent.repetitions.length; rep_i++) {
				let repetition_renderer = this.repetition_renderers[rep_i]
				
				if (rep_i > 0) rendered_constituent.append(this.parsed_constituent.delimiters["repeat"])
				for (let comp_i = 0; comp_i < repetition_renderer.length; comp_i++) {
					if (comp_i > 0) rendered_constituent.append(this.parsed_constituent.delimiters["components"][level])
					let component_renderer = repetition_renderer[comp_i]
					let rendered_component = component_renderer.render(level+1)
					
					rendered_constituent.append(rendered_component)
				}
			}
		}
		
		return rendered_constituent
	}
	
	render_description() {
		console.log(this.parsed_constituent)
		
		let type_span = document.createElement("span")
		type_span.setAttribute("class", "description-link")
		type_span.textContent = `${this.constituent_type.get_metatype()} ${this.parsed_constituent.entity.type}`
		
		let supercomponent_span = document.createElement("span")
		supercomponent_span.setAttribute("class", "description-link")
		supercomponent_span.addEventListener("click", () => this.parent_renderer.render_description())
		
		// Get parent entity
		if (this.parent_renderer instanceof HL7ConstituentRenderer) {
			let parent_entity = this.parent_renderer.parsed_constituent.entity
			supercomponent_span.textContent = `${this.parsed_constituent.entity.parent_metatype} ${parent_entity.parent_type_id}.${parent_entity.index}`
		}
		else {
			let parent_entity = this.parent_renderer.parsed_segment.entity
			supercomponent_span.textContent = `SEGMENT ${parent_entity.type_id}`
		}
	
		let description_suffix = this.parsed_constituent.entity.description != "" ? ` - ${this.parsed_constituent.entity.description}` : ""
		let one_line_description = `${this.parsed_constituent.entity.parent_type_id}.${this.parsed_constituent.entity.index}${description_suffix}`
		
		let errors_div = this.render_errors()
		let long_desc_div = render_long_description(this.parsed_constituent.entity)
		
		// Create header and body of explanation
		let header = document.createElement("div")
		header.textContent = one_line_description
		
		let body = document.createElement("div")
		
		let subtitle = document.createElement("div")
		subtitle.setAttribute("class", "description-subtitle")
		subtitle.append(type_span, " OF ", supercomponent_span)
		
		// Show long description
		body.append(long_desc_div, errors_div)
		
		// Show errors, if any.
		body.append(errors_div)
		
		this.constituent_description_div.replaceChildren(header, subtitle, body)
	}
	
	render_errors() {
		let root_error_text = ""
		if (this.parsed_constituent.errors.length == 0)
			root_error_text = "Constituent parsed without error."
		else
			root_error_text = `Constituent parsed with ${this.parsed_constituent.errors.length} error(s).`
		
		let root_error = new HL7ParsingError(root_error_text, [this.parsed_constituent])
		return render_errors([root_error])
	}
}