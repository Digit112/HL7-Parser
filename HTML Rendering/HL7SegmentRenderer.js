/*
	This class renders a segment as HTML.
	The rendered HTML has individual parts that can be clicked to show their descriptions.
	constituent_description_div is where selected constituents will have their descriptions placed.
	entity_description_div is where selected entities will have their descriptions placed.
*/
class HL7SegmentRenderer {
	constructor(parsed_segment, constituent_description_div, entity_description_div) {
		this.parsed_segment = parsed_segment
		this.constituent_description_div = constituent_description_div
		this.entity_description_div = entity_description_div
		
		// Construct renderers for child elements.
		this.field_renderers = []
		for (let parsed_field of this.parsed_segment.fields) {
			let new_field_renderer = new HL7ConstituentRenderer(parsed_field, this.constituent_description_div, this.entity_description_div)
			this.field_renderers.push(new_field_renderer)
		}
	}
	
	// Renders the segment into a span and returns it.
	render() {
		let rendered_segment = document.createElement("span")
		
		let segment_header = document.createElement("span")
		segment_header.setAttribute("class", "token-atom")
		segment_header.textContent = this.parsed_segment.entity.type_id
		segment_header.addEventListener("click", () => this.render_description())
		
		rendered_segment.append(segment_header)
		
		let parsed_fields = this.parsed_segment.fields
		if (this.parsed_segment.entity.type_id == "MSH") parsed_fields.shift()
		
		for (let field_renderer of this.field_renderers) {
			let field_delimiter = this.parsed_segment.delimiters["components"][0]
			let next_span = field_renderer.render(1)
			rendered_segment.append(field_delimiter, next_span)
		}
		
		return rendered_segment
	}
	
	render_description() {
		console.log(this.parsed_segment)
		
		let description_suffix = this.parsed_segment.entity.description != "" ? ` - ${this.parsed_segment.entity.description}` : ""
		let one_line_descripption = `SEGMENT ${this.parsed_segment.entity.type_id}${description_suffix}`
		
		// Generate from w/ link if possible
		let from_span = null
		if (this.parsed_segment.entity.from != "") {
			from_span = document.createElement("span")
			if (this.parsed_segment.grammar.from != "") {
				let hl7_link = document.createElement("a")
				hl7_link.setAttribute("href", this.parsed_segment.grammar.from)
				hl7_link.textContent = `HL7 ${this.parsed_segment.grammar.version_id}`
				
				from_span.append("From ", hl7_link, ` § ${this.parsed_segment.entity.from}`)
			}
			else {
				from_span.append(`From HL7 ${this.parsed_segment.grammar.version_id} § ${this.parsed_segment.entity.from}`)
			}
		}
		
		// Generate Errors Collapsible
		let errors_div = document.createElement("div")
		let errors_header_div = document.createElement("div")
		errors_header_div.style.display = "flex"
		
		let errors_text = document.createElement("span")
		if (this.parsed_segment.errors.length == 0) {
			errors_text.setAttribute("class", "no-errors")
			errors_text.textContent = "Segment parsed without issue."
			
			errors_header_div.append(errors_text)
			errors_div.append(errors_header_div)
		}
		else {
			let errors_body_div = document.createElement("div")
			errors_body_div.style.display = "none"
			
			errors_text.setAttribute("class", "errors")
			errors_text.textContent = `Segment parsed with ${this.parsed_segment.errors.length} issues.`
		
			// Generic button to expand/collapse the body.
			let errors_expand_button = document.createElement("button")
			errors_expand_button.setAttribute("class", "expand-button")
			errors_expand_button.textContent = "+"
			errors_expand_button.addEventListener("click", () => {
				if (errors_body_div.style.display == "none") {
					errors_body_div.style.display = "block"
					errors_expand_button.textContent = "-"
				}
				else {
					errors_body_div.style.display = "none"
					errors_expand_button.textContent = "+"
				}
			})
			
			// Generate 
			
			errors_header_div.append(errors_expand_button, errors_text)
			errors_div.append(errors_header_div, errors_body_div)
		}
		
		
		// Create header and body of explanation
		let header = document.createElement("div")
		header.setAttribute("id", "parsed-entity-description-header")
		header.textContent = one_line_descripption
		
		let body = document.createElement("div")
		body.setAttribute("id", "parsed-entity-description-body")
		
		if (this.parsed_segment.entity.long_description != "") {
			body.append(this.parsed_segment.entity.long_description)
			if (from_span != null) body.append(document.createElement("br"))
		}
		if (from_span != null) {
			body.append(from_span)
		}
		
		// Show errors, if any.
		body.append(errors_div)
		
		this.constituent_description_div.replaceChildren(header, body)
	}
}