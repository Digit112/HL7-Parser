class HL7GrammarRenderer {
	constructor(grammar) {
		this.grammar = grammar
	}
	
	// Generates and returns a div with a paragraph for every error currently reported on this object.
	// That div has a header with an option to collapse or expand the errors, collapsed by default.
	render_errors() {
		let container_div = document.createElement("div")
		let header_div = document.createElement("div")
		header_div.setAttribute("class", "grammar-syntax-errors-header")
		
		// No errors, simple text explaining.
		if (this.grammar.grammar_syntax_errors.length == 0) {
			let header_text = documnet.createElement("span")
			header_text.setAttribute("class", "grammar-syntax-no-errors")
			header_text.textContent = `HL7 ${this.grammar.version_id} compiled without error.`
			
			header_div.replaceChildren(header_text)
			container_div.replaceChildren(header_div)
			
			return container_div
		}
		else {
			let errors_div = document.createElement("div")
			errors_div.id = `HL7-Version-${this.grammar.version_id}-errors`
			errors_div.style.display = "none" // Hit expand_buutton to show.
			
			let expand_button = document.createElement("button")
			expand_button.setAttribute("class", "expand-button")
			expand_button.textContent = "+"
			expand_button.addEventListener("click", () => {
				if (errors_div.style.display == "none") {
					errors_div.style.display = "block"
					expand_button.textContent = "-"
				}
				else {
					errors_div.style.display = "none"
					expand_button.textContent = "+"
				}
			})
			
			let header_text = document.createElement("span")
			header_text.setAttribute("class", "grammar-syntax-errors")
			header_text.textContent = `HL7 ${this.grammar.version_id} compiled with ${this.grammar.grammar_syntax_errors.length} errors.`
			
			let error_paragraphs = []
			
			for (let error of this.grammar.grammar_syntax_errors) {
				let next_error = document.createElement("p")
				next_error.setAttribute("class", "grammar-syntax-error-text")
				next_error.textContent = error.toString()
				error_paragraphs.push(next_error)
			}
			
			errors_div.replaceChildren(...error_paragraphs)
			
			header_div.replaceChildren(expand_button, header_text)
			container_div.replaceChildren(header_div, errors_div)
			return container_div
		}
	}
}