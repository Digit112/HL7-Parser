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
		this.field_renderers = []
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
		
		for (let parsed_field of this.parsed_segment.fields) {
			let new_field_renderer = new HL7ConstituentRenderer(parsed_field, this.constituent_description_div, this.entity_description_div)
			this.field_renderers.push(new_field_renderer) // Dunno if this'll actually be useful later.
			
			let next_span = new_field_renderer.render(1)
			rendered_segment.append(this.parsed_segment.delimiters["components"][0], next_span)
		}
		
		return rendered_segment
	}
	
	render_description() {
		console.log("Rendering Description :)")
		
		this.constituent_description_div
	}
}