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
		// console.log(parsed_constituent)
	}
	
	// Level determines the delimiters to use (the characters themselves are stashed in this.parsed_constituent.delimiters)
	// Level must be 1 or 2, level 0 is the field delimiter which is only used by HL7SegmentRenderer
	render(level) {
		let rendered_constituent = document.createElement("span")
		
		if (this.constituent_type.get_metatype() == "PRIMITIVE") {
			if (this.parsed_constituent.body != "") {
				rendered_constituent.setAttribute("class", "token-atom")
				rendered_constituent.textContent = this.parsed_constituent.body
				rendered_constituent.addEventListener("click", () => this.render_description())
			}
			else {
				rendered_constituent.setAttribute("class", "token-atom token-atom-empty")
				rendered_constituent.textContent = "␣"
			}
		}
		else { // Must be COMPOSITE or SUBCOMPOSITE
			for (let rep_i = 0; rep_i < this.parsed_constituent.repetitions.length; rep_i++) {
				let repetition = this.parsed_constituent.repetitions[rep_i]
				
				if (rep_i > 0) rendered_constituent.append(this.parsed_constituent.delimiters["repeat"])
				for (let comp_i = 0; comp_i < repetition.length; comp_i++) {
					let component = repetition[comp_i]
					
					if (comp_i > 0) rendered_constituent.append(this.parsed_constituent.delimiters["components"][level])
					let component_renderer = new HL7ConstituentRenderer(component, this, this.constituent_description_div, this.entity_description_div)
					let rendered_component = component_renderer.render(level+1)
					
					rendered_constituent.append(rendered_component)
				}
			}
		}
		
		return rendered_constituent
	}
	
	render_description() {
		console.log("Rendering constituent description")
	}
}