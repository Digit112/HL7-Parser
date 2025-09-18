/*
	This class renders a segment as HTML.
	The rendered HTML has individual parts that can be clicked to show their descriptions.
	constituent_description_div is where selected constituents will have their descriptions placed.
	entity_description_div is where selected entities will have their descriptions placed.
*/
class HL7SegmentRenderer {
	constructor(parsed_segment, message_renderer, constituent_description_div, entity_description_div) {
		if (!(parsed_segment instanceof HL7ParsedSegment)) {
			console.log(parsed_segment)
			throw new Error("parsed_segment must be HL7ParsedSegment.")
		}
		
		if (!(message_renderer instanceof HL7MessageRenderer)) {
			console.log(message_renderer)
			throw new Error("message_renderer must be HL7MessageRenderer.")
		}
		
		this.parsed_segment = parsed_segment
		this.message_renderer = message_renderer
		this.constituent_description_div = constituent_description_div
		this.entity_description_div = entity_description_div
		
		
		let my_parsed_fields = this.parsed_segment.fields
		if (this.parsed_segment.entity.type_id == "MSH") // Don't show MSH.1 (field delimiter)
			my_parsed_fields = my_parsed_fields.slice(1)
		
		// Construct renderers for child elements.
		this.field_renderers = []
		for (let parsed_field of my_parsed_fields) {
			let new_field_renderer = new HL7ConstituentRenderer(parsed_field, this, this.constituent_description_div, this.entity_description_div)
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
		
		for (let field_renderer of this.field_renderers) {
			let field_delimiter = this.parsed_segment.delimiters["components"][0]
			let next_span = field_renderer.render(1)
			rendered_segment.append(field_delimiter, next_span)
		}
		
		return rendered_segment
	}
	
	// Render a lengthy description of this segment.
	// Unlike the ConstituentRenderer, this pulls its description from the backing segment type
	// rather than from its 
	render_description() {
		let type_span = document.createElement("span")
		type_span.textContent = `SEGMENT ${this.parsed_segment.entity.type_id}`
		
		let supercomponent_span = document.createElement("span")
		let parent_message_entity = this.message_renderer.parsed_message.entity
		if (parent_message_entity != null)
			supercomponent_span.setAttribute("class", "description-link")
			supercomponent_span.textContent = `${this.message_renderer.parsed_message.entity.type_id}`
			supercomponent_span.addEventListener("click", () => this.message_renderer.render_description())
		
		let description_suffix = this.parsed_segment.entity.description != "" ? ` - ${this.parsed_segment.entity.description}` : ""
		let one_line_description = `${this.parsed_segment.entity.type_id}${description_suffix}`
		
		let errors_div = this.render_errors()
		let long_desc_div = render_long_description(this.parsed_segment.entity)
		
		// Create header and body of explanation
		let header = document.createElement("div")
		header.setAttribute("class", "description-header")
		header.textContent = one_line_description
		
		let body = document.createElement("div")
		
		let subtitle = document.createElement("div")
		subtitle.setAttribute("class", "description-subtitle")
		subtitle.append(type_span)
		if (parent_message_entity != null)
			subtitle.append(" OF ", supercomponent_span)
		
		// Show errors, if any.
		body.append(long_desc_div, errors_div)
		
		this.constituent_description_div.replaceChildren(header, subtitle, body)
	}
	
	// Wraps this entity's errors in a single error with a nice header and returns it.
	render_errors() {
		let root_error_text = ""
		if (this.parsed_segment.errors.length == 0)
			root_error_text = "Segment parsed without error."
		else
			root_error_text = `Segment parsed with ${this.parsed_segment.errors.length} error(s).`
		
		let root_error = new HL7ParsingError(root_error_text, [this.parsed_segment])
		return render_errors([root_error])
	}
}