/*
	This class renders a message as an HTML div.
	The rendered HTML has individual parts that can be clicked to show their descriptions.
	constituent_description_div is where selected constituents will have their descriptions placed.
	entity_description_div is where selected entities will have their descriptions placed.
*/
class HL7MessageRenderer extends HL7EntityRenderer {
	constructor(parsed_message, constituent_description_div, entity_description_div) {
		super(parsed_message)
		this.constituent_description_div = constituent_description_div
		this.entity_description_div = entity_description_div
	}
	
	render() {
		let message_div = document.createElement("div")
		
		for (let segment of this.parsed_entity.segments) {
			let segment_renderer = new HL7SegmentRenderer(segment, this)
			
			// TODO: How to deal with segment groups?
			let rendered = segment_renderer.render()
			
			message_div.append(rendered, document.createElement("br"))
		}
		
		return message_div
	}
}

/*
MSH|^~\&|EPIC|EPICADT|iFW|SMSADT|199912271408|CHARRIS|ADT^A01|1817457|D|2.3
EVN|A01|199912261030||02|1234^Doe^John^^^^^^auth1&auth1.com&DNS^^^^^auth2&auth2.com&DNS|199912261010
*/