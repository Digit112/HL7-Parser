/*
	This class renders a segment as HTML.
	The rendered HTML has individual parts that can be clicked to show their descriptions.
	constituent_description_div is where selected constituents will have their descriptions placed.
	entity_description_div is where selected entities will have their descriptions placed.
*/
class HL7SegmentRenderer extends HL7ConstituentRenderer {
	constructor(parsed_entity, parent_renderer) {
		super(parsed_entity, parent_renderer)
	}
	
	// Renders the segment into a span and returns it.
	render() {
		let rendered_segment = document.createElement("span")
		
		let segment_header = document.createElement("span")
		segment_header.setAttribute("class", "token-atom")
		segment_header.textContent = this.parsed_entity.entity.type_id
		segment_header.addEventListener("click", () => this.render_description())
		
		rendered_segment.append(segment_header)
		
		let parsed_fields = this.parsed_entity.fields
		if (this.parsed_entity.entity.type_id == "MSH") parsed_fields.shift()
		
		let field_renderers = this.repetitions[0]
		for (let field_renderer of field_renderers) {
			let field_delimiter = this.parsed_entity.delimiters["components"][0]
			let next_span = field_renderer.render(1)
			rendered_segment.append(field_delimiter, next_span)
		}
		
		return rendered_segment
	}
	
	render_description() {
		console.log(this.parsed_entity)
		
		let description_suffix = this.parsed_entity.entity.description != "" ? ` - ${this.parsed_entity.entity.description}` : ""
		let one_line_descripption = `SEGMENT ${this.parsed_entity.entity.type_id}${description_suffix}`
		
		// Generate from w/ link if possible
		let from_span = null
		if (this.parsed_entity.entity.from != "") {
			from_span = document.createElement("span")
			if (this.parsed_entity.grammar.from != "") {
				let hl7_link = document.createElement("a")
				hl7_link.setAttribute("href", this.parsed_entity.grammar.from)
				hl7_link.textContent = `HL7 ${this.parsed_entity.grammar.version_id}`
				
				from_span.append("From ", hl7_link, ` § ${this.parsed_entity.entity.from}`)
			}
			else {
				from_span.append(`From HL7 ${this.parsed_entity.grammar.version_id} § ${this.parsed_entity.entity.from}`)
			}
		}
		
		// Create header and body of explanation
		let header = document.createElement("div")
		header.setAttribute("id", "parsed-entity-description-header")
		header.textContent = one_line_descripption
		
		let body = document.createElement("div")
		body.setAttribute("id", "parsed-entity-description-body")
		
		if (this.parsed_entity.entity.long_description != "") {
			body.append(this.parsed_entity.entity.long_description)
			if (from_span != null) body.append(document.createElement("br"))
		}
		if (from_span != null) {
			body.append(from_span)
		}
		
		// Show errors, if any.
		let errors_div = this.render_errors()
		body.append(errors_div)
		
		this.constituent_description_div.replaceChildren(header, body)
	}
}