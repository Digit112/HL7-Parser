class HL7Delimiters {
	constructor(seg_sep, comp_sep, subcomp_sep, rep_sep, esc) {
		this.seg_sep = seg_sep
		this.comp_sep = comp_sep
		this.subcomp_sep = subcomp_sep
		
		this.rep_sep = rep_sep
		this.esc = esc
	}
}

// An HL7 Segment is a single line in an HL7 message.
// It contains delimited fields, sub-fields, and sub-sub-fields.
// The delimiters depend on the message and must be passed to this function UNLESS the segment is an MSH (Message Header) segment,
// from which the delimiters are read, which is always the first segment in a message.
class HL7Segment {
	constructor(raw, delimiters=null) {
		if (raw.length < 4) throw new Error(`Invalid segment '${raw}' has insufficient length.`)
		
		let segment_type = raw.substring(0, 3)
		
		// Check that we should expect an MSH and extract delimiters.
		if (delimiters == null) {
			if (segment_type != "MSH") throw new Error(`HL7 Messages must begin with an MSH segment, not '${segment_type}'`)
			
			if (raw.length < 8) throw new Error(
		}
	}
}

class HL7Message {
	constructor(raw) {
		if (raw.length < 8) throw new Error(`HL7 message '${raw}' has insufficient length.`)
		if 	(!raw.startsWith("MSH") throw new Error(`HL7 message must begin wiwth an 'MSH' segment, not ${raw.substring(0, 3)}`)
	
		// Extract delimiters.
		this.delimiters = new HL7Delimiters(raw[3], raw[4], raw[7], raw[5], raw[6])
	}
}