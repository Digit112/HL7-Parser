class HL7GrammarRenderer {
	constructor(grammar) {
		this.grammar = grammar
	}
	
	// Generates and returns a div with a paragraph for every error currently reported on the HL7 grammar itself.
	// These eerrors were created while loading the grammar file, and have nothing to do with any parsed messages.
	// That div has a header with an option to collapse or expand the errors, collapsed by default.
	render_errors() {
		// Create a single big error to serve as a header for all errors.
		let group_error_text = null
		if (this.grammar.grammar_syntax_errors.length == 0)
			group_error_text = `HL7 ${this.grammar.version_id} compiled without error.`
		else
			group_error_text = `HL7 ${this.grammar.version_id} compiled with ${this.grammar.grammar_syntax_errors.length} error(s).`
		
		let root_error = {"message": group_error_text, "citations": [{"errors": this.grammar.grammar_syntax_errors}]}
		let errors_div = render_errors([root_error])
		return errors_div
	}
}