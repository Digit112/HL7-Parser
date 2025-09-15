/*
	This class renders a segment as HTML.
	The rendered HTML has individual parts that can be clicked to show their descriptions.
*/
class HL7SegmentRenderer {
	constructor(parsed_segment) {
		this.parsed_segment = parsed_segment
		this.field_renderers = []
	}
	
	// Renders the segment into a span and returns it.
	// constituent_description_div is where selected constituents will have their descriptions placed.
	// entity_description_div is where selected entities will have their descriptions placed.
	render_segment(constituent_description_div, entity_description_div) {
		let rendered_segment = document.createElement("span")
		
		let segment_header = document.createElement("span")
		segment_header.setAttribute("class", "clickable")
		segment_header.textContent = this.parsed_segment.entity.type_id
		segment_header.addEventListener("click", () => this.render_description(constituent_description_div, entity_description_div))
		
		rendered_segment.append(segment_header)
		
		for (parsed_field of this.parsed_segment.fields) {
			let new_field_renderer = new HL7ConstituentRenderer(constituent_description_div, entity_description_div)
			this.field_renderers.push(new_field_renderer) // Dunno if this'll actually be useful later.
			
			let next_span = new_field_renderer.render_constituent(constituent_description_div, entity_description_div)
			rendered_segment.append(parsed_segment.
		}
	}
	
	render_description(constituent_description_div, entity_description_div, 1) {
		console.log("Rendering Description :)")
	}
}