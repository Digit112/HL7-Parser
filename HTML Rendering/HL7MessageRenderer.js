/*
	This class renders a message as an HTML div.
	The rendered HTML has individual parts that can be clicked to show their descriptions.
	constituent_description_div is where selected constituents will have their descriptions placed.
	entity_description_div is where selected entities will have their descriptions placed.
*/
class HL7MessageRenderer {
	constructor(parsed_message, constituent_description_div, entity_description_div) {
		if (!(parsed_message instanceof HL7ParsedMessage)) {
			console.log(parsed_message)
			throw new Error("parsed_message must be HL7ParsedMessage.")
		}
		
		this.parsed_message = parsed_message
		this.constituent_description_div = constituent_description_div
		this.entity_description_div = entity_description_div
	}
	
	render() {
		let message_div = document.createElement("div")
		
		for (let segment of this.parsed_message.segments) {
			let segment_renderer = new HL7SegmentRenderer(segment, this, this.constituent_description_div, this.entity_description_div)
			
			// TODO: How to deal with segment groups?
			let rendered = segment_renderer.render()
			
			message_div.append(rendered, document.createElement("br"))
		}
		
		return message_div
	}
	
	render_description() {
		console.log(this)
		
		let description_suffix = this.parsed_message.entity.description != "" ? ` - ${this.parsed_message.entity.description}` : ""
		let one_line_description = `${this.parsed_message.entity.type_id}${description_suffix}`
		
		let errors_div = this.render_errors()
		let long_desc_div = render_long_description(this.parsed_message.entity)
		
		// Create header and body of explanation
		let header = document.createElement("div")
		header.setAttribute("class", "description-header")
		header.textContent = one_line_description
		
		let body = document.createElement("div")
		
		// Show errors, if any.
		body.append(long_desc_div, errors_div)
		
		this.constituent_description_div.replaceChildren(header, body)
	}
	
	render_errors() {
		let root_error_text = ""
		if (this.parsed_message.errors.length == 0)
			root_error_text = "Message parsed without error."
		else
			root_error_text = `Message parsed with ${this.parsed_message.errors.length} error(s).`
		
		let root_error = new HL7ParsingError(root_error_text, [this.parsed_message])
		return render_errors([root_error])
	}
}

/*
MSH|^~\&|EPIC|EPICADT|iFW|SMSADT|199912271408|CHARRIS|ADT^A01|1817457|D|2.3
EVN|A01|199912261030||02|1234^Doe^John^^^^^^auth1&auth1.com&DNS^^^^^auth2&auth2.com&DNS|199912261010
*/