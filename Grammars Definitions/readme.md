# HL7 Grammar Specification Documents

The HL7 Grammar specification folder contains JSON files defining the available messages, segments, composites, subcomposites, primitives, and tables, each is called an "HL7 Entity". These definitions are separated into folders corresponding to their respective HL7 version as it would appear in the Version ID segment of an MSH header (see table 0104).

These definitions all look like key-value pairs with a key having a metatype part and a type-id part, separated by a space, the type-id itself can also have spaces.

An HL7 message is split into segments which are themselves subdivided into components, these components may be a composite, subcomposite, or primitive. A composite may be made of subcomposites and primitives, while a subcomposite may only consist of primitives.

| Depth | Field Name   | Metatypes that can occupy this field | Can be constituents of           |
| :---: | :----------- | :----------------------------------- | :------------------------------- |
| 0     | Message      | MESSAGE                              |                                  |
| 1     | Segment      | SEGMENT                              | MESSAGE                          |
| 2     | Field        | COMPOSITE, SUBCOMPOSITE, PRIMITIVE   | SEGMENT                          |
| 3     | Component    | SUBCOMPOSITE, PRIMITIVE              | SEGMENT, COMPOSITE               |
| 4     | Subcomponent | PRIMITIVE                            | SEGMENT, COMPOSITE, SUBCOMPOSITE |

Think of a metatype (which isn't a real HL7 concept by the way) as categorizations that all HL7 types - including segments and messages themselves - fall into. They govern the way in which the type hierarchy can be arranged.

*For example*, because a segment is divided into fields, and all fields must have metatype of COMPOSITE, SUBCOMPOSITE, or PRIMITIVE, a segment's constituents must never have a metatype of MESSAGE. For example, if you specify that an "MSH" segment has a constituent of type "ORU R01", the metatype checker will see that this is invalid and yell at you, even though this grammar is not logically contradictory.

## Messages, Segments, Composites, & Primitives

The definitions for Messages, Segments, Composites, Subcomposites, and Primitives are shown below. Note that the first four are specified as a collection of what my implementation calls their "constituents".

```
"PRIMITIVE <type-id>": {
    "description": "<description>",
    "long-description": "<long description>",
    "from": "<section>",
    "length": <integer>
}
```

```
"<MESSAGE | SEGMENT | COMPOSITE | SUBCOMPOSITE> <type-id>": {
    "description": "<description>",
    "long-description": "<long description>",
    "from": "<section>",
    "constituents": [
        {
            "description": "<description>",
            "long-description": "<long description>",
            "from": "<section>",
            "type": "<type-id>",
            "length": <integer>,
            "optionality": "<O | C | R | B | W>",
            "repeatability": <integer>,
            "table": "<table-id>",
            "constituents": [ ... ]
        },
        ...
    }]
}
```

As you can see, the definitions for MESSAGE, SEGMENT, COMPOSITE, and SUBCOMPOSITE are so similar that they've been grouped into a single syntax. These four are called the "non-primitives". This mirrors the internal structure of the implementation, *but* the definitions are not identical, all fields are not valid for all non-primitive metatypes.

In all cases, the `type-id` key is the unique identifier for this message, segment, or data type as defined by HL7. Examples include "ORU R01", "MSH", and "ST".

The `description`, `long-description`, and `from` fields are all basically the same - they will be displayed to the user, typically come straight from the HL7 documentation (perhaps elided), and default to an empty string. `description` should be only a few words, whereas `long-description` may be anywhere from a short sentence to a paragraph and is used to explain semantics and edge cases. `from` is a dot-delimited specifier for a section of the HL7 specification, for example `"2.A.33.1"` which describes the Namespace ID field of the Hierarchic designator composite.

The constituent `type` field must match the `type-id` key on some other definition. That type's metatype must be valid as per the metatype checking rules summarized in the table above.

The `length` fields are optional. In the primitive definition, excluding the length causes it to default to infinity ("length" really means "maximum length"). In the non-primitive definitions, you specify the lengths of each constituent. Excluding the length causes it to inherit the length on the table, if specified, or the type of the constituent if not, this is common since the length of a constituent is often just the length of its type.

The length of an entire non-primitive is always the sum of the lengths of the constituents plus the number of delimiters needed to separate them. It cannot be manually specified.

The values for `optionality` correspond to "Optional", "Conditional", "Required", "Backward Compatible", and "Withdrawn".
The options "C", "B", and "W" are internally treated identically to optional ("O"), but are conformant with the specification and also provide information to readers of the file.

`repeatability` is the maximum number of times this constituent can appear, with -1 meaning it can appear an unlimited number of times. The `repeatability` field must only appear on the constituents of a `MESSAGE` (whose segments and segment groups may repeat) or of a `SEGMENT` (whose components may repeat). A composite's fields may not repeat.

`table` is specified on fields like ID or HD which are really just enums.

### Nested constituents

The `constituents` field is recursive, it can have constituents of its own. This models the HL7 concept of "segment groups" quite well. Many restrictions apply to this field, however. Firstly, that this feature is only valid on MESSAGE entities, since they are the only entities whose constituents are segments or segment groups (which are what we are grouping). Secondly, a constituent with a `constituents` field of its own must never have the `type`, `length`, or `table` attributes. Thirdly, the constituents of a constituent are always segments (or yet more segment groups).

The `optionality` and `repeatability` fields are really the things that make this feature so valuable. A constituent segment group with two segments inside can be made optional while those two segments are each required within the group. Thus, the two segments must appear as a pair or not at all. Or the group can be made repeatable, such that the segments must always repeat together as a pair. 

An early example is this constituent of MESSAGE ADT A01, an optional-repeatable group with a single required PR1 segment optionally followed by 1 or more required segments.

```
{
    "optionality": "O",
    "repeatability": -1,
    "constituents": [{
        "description": "Procedure",
        "type": "PR1",
        "optionality": "R"
    }, {
        "description": "Role",
        "type": "ROL",
        "optionality": "O",
        "repeatability": -1
    }]
}
```

HL7 2.3 § 2.11 refers to segment groups as a part of their "special notation" for messages as a convenience for defining segments which must appear together. In fact, it is much more, and has enormous implications for the parsing of HL7 messages. The most immediate is that some messages have multiple instances of a given segment in different groups or have one in a group and another outside a group. Since HL7 was (somewhat implicitly) ambivalent to the segment ordering except of course for the MSH segment, segment groups make it impossible to determine which of two segments is which.

To resolve this issue, later versions like HL7 2.5 § 2.5.2 impose restrictions on the ordering of fields in these situations. In short, two instances of a segment which are not repetitions of one another and which do not belong to a common group or which are both individual

### Constituent Indexing

The HL7Grammar object understands entity names like "MSH", "ST", and "HD" for segments, and also like "EVN.1" for the first constituent in the "EVN" type. Segment groups can also be indexed using a novel syntax, all groups have the same index as their first non-group member plus a so-called depth letter. So the group whose first member is IN1.14 will be called IN1.14.A (if it is not itself within a segment group. If PID.4 is the first member of a group who is the first member in an outer group, then the outer group is PID.4.A and the inner group is PID.4.B, and so on.

## Tables

Tables are like enum types and have definitions that look like this:

```
"TABLE <table-id>": {
    "description": "<description>",
    "long-description": "<long description>",
    "from": "<section>",
    "length": <integer>,
    "values": {
        "<value 1>": "<description 1>",
        "<value 2>": "<description 2>",
        ...,
        "<value n>": "<description n>"
    }
}
```

They don't map 1-to-1 to HL7's concept of a "type" and are instead bucketed into types. For example, an "ID" field might refer to a value from table "0155" - "Accept/application acknowledgment conditions" or perhaps a value from table "0399" - "Country code", or could be a user-defined ID.

The descriptions can all be whatever you like but - of course - are ideally retrieved at least in part from HL7 documentation. Specify the `from` value as a dot-delimited ID for a section of the documentation, for example `"2.15.9.17"` for the definition of table "0399" - Country Codes.

The values are valid entries for an ID type (or similar) referencing this table. The descriptions, on the other hand, are all flavor text for readability's sake. This interface almost never actually interprets table values.

### Alternative Values

Values are typically specified as above as key-value pairs. Alternatively, the descriptions may be arrays as such:

```
"values": [
    "value 1": "desc 1",
    "value 2": ["desc 2"],
    "value 3": ["desc 3 part 1", "desc 3 part 2"]
}
```

And yes, the forms of each pair can be mix-and-matched like this.

The keys can also be arrays. In this case, they define a composite type from a table, for example an HD. Obviously, we must change the form of the whole `values` body. The dictionary becomes an array of pairs like so:

```
"values": [
    ["value 1", "desc 1"],
    ["value 2", ["desc 2 part 1", "desc 2 part 2"]],
    [["value 3 part 1", "value 3 part 2"], "desc 3"],
    [["value 4 part 1", "value 4 part 2"], ["desc 4 part 1", "desc 4 part 2"]],
    [["23", "myhealthapplication.com", "DNS"], "My Health Application"]
]
```

The last example takes the form that you'd expect to see in table 0300 - a user-defined table of hierarchic designators (HD). The three fields in the key correspond to the three subcomponents of that composite type.

## Usage

This folder should be zipped and the extension changed to HL7GR. This may be provided to the file input in the web page. That page will construct the resources necessary to read and write HL7 using the specification(s) in the grammar file. Each subfolder corresponds to a distinct version and is parsed in complete isolation from the others.

## Interpreter Leniency

An important note is that the restrictions are only enforced by the system when writing messages. In reading them, Unicode is supported in all fields including ones supposed to be restricted to ASCII-only, and the length limits are freely surpassed. Additionally, unrecognized table values are accepted - all such violations are logged internally and may be written out to console or file after reading succeeded.

Unrecognized types and tables are parsed as best as possible, including entire unrecognized messages and segments. So long all the recognized segments are not malformed, and the very first segment is MSH, all unrecognized segments will be split into components. None of their types will be known, they will all therefore be treated as raw character strings, all unrecognized components will be presumed primmitives, this process will store a log of many many errors on the final, parsed entity.

# HL7 Grammar Loading & Finalization

## Entity Structure

An HL7 Entity is either a `PRIMITIVE`, non-`PRIMITIVE`, or `TABLE`. A non-`PRIMITIVE` is a `COMPOSITE`, `SEGMENT`, or `MESSAGE`. Nonprimitives have constituents with backing types defined elsewhere. A backing type's metatype must abide metatype checking rules as per its parent's metatype. If the parent metatype is `MESSAGE`, the constituents' backing types must all be metatype `SEGMENT`. If the parent is a `SEGMENT`, the constituents must all be `COMPOSITE` *or* `PRIMITIVE`.

Constituents of metatype `PRIMITIVE` or `COMPOSITE` may have a backing table which restricts their allowable values. The length of such a type, if it is explicitly specified, must be sufficient to express the values in that `TABLE` (greater than the table's length) and less than the maximum length of the backing type. If it is not explicitly specified, the constituent's length is taken from the backing table, if it exists, and from the underlying type if it does not.

An explicitly-specified length not meeting the above requirements is an error but will nonetheless be accepted as the maximum length of the constituent. Specifying a backing table whose length is greater than the maximum length of the underlying type is also an error, the length of the table will nonetheless be accepted as the true maximum length of the constituent.

A `MESSAGE`'s constituents may be segment groups. A segment group's constituents may be segments or segment groups. Segment groups may be optional or repeatable as a whole unit. Segment groups have no backing type or table, and must not have an explicitly-specified length. Their length is the sum of the lengths of their own constituents plus the number of dividers between them.

## Segment Ordering

HL7 2.5 § 2.5.2 discusses the possibility of the definition of unparseable messages using its syntax. This discussion remains unchanged in HL7 2.9. The outlined points inform the arrangements of segments in their message definitions in such a way as to guarantee that all messages are parseable.

If a sending application emits malformed messages, for example, by excluding a required field or by re-ordering the segments, the possibility of these unparseable messages re-emerges.

Reordering segments in any given message is very unlikely to cause an issue that can't be resolved by a clever-enough receiving application, which makes the bug especially insidious when it does eventually manifest, in a real healthcare environment, in such a way that no amount of cleverness can resolve the issue.

### Worked Example

Consider this portion of the `MESSAGE ADT A01` definition from HL7 2.5 § 3.3.1. Recall that `[]` denote optional segments and `{}` denote repeatable segments.

```
[{            --- PROCEDURE begin    
    PR1
    [{ROL}]
}]            --- PROCEDURE end
[ { GT1 } ]
[{            --- INSURANCE begin    
    IN1
    [IN2]
    [{IN3}]
    [{ROL}]
}]            --- INSURANCE begin    
```

Presume we move the second ROL up to the top of the INSURANCE section and don't include the optional GT1 field. Then our message would effectively look like this:

```
[{            --- PROCEDURE begin    
    PR1
    [{ROL}]
}]            --- PROCEDURE end
[{            --- INSURANCE begin    
    [{ROL}]
    IN1
    [IN2]
    [{IN3}]
}]            --- INSURANCE begin    
```

And a message following this syntax might have segments like this:

```
...
PR1| ...
ROL| ...
ROL| ...
ROL| ...
ROL| ...
ROL| ...
IN1| ...
...
```

Now, clearly, there are 5 ROL segments, but which belong to the "PROCEDURE" group and which to the "INSURANCE" group? It is impossible to tell. As long as our sending application never omits required segments and always sends segments in the correct order, this issue cannot occur... in HL7 2.5 or greater...

# HL7 Notes

## Null and Empty Values

In HL7, a blank field is distinct from he null field, which is transmitted as `""`. In my parser, the blank field is "null" whereas the null field is represented as an empty string. While this might seem a bit confusing, the values reflect HL7's internal understanding of the transmitted values. An empty field means *no data sent*, if an empty field is sent in a patch message of some kind, existing data in that field is retained. If the so-called "null value" is transmitted, however, it's more like *blank data sent*. If found in a patch message, corresponding database fields shoulld be wiped. In my implementation then, a value which is null means *no data* whereas an empty string means *blank data*, which is the normal interpretation of these values in JavaScript even though the words for them appear swapped from the HL7 specifications.

| HL7 field value              | HL7 Name for this | JavaScript Value | interpretation |
| ---------------------------- | ----------------- | ---------------- | -------------- |
| Pair of double quotes (`""`) | Null Value        | `""`             | Blank Data     |
| Nothing (` `)                | Empty Value       | `null`           | No data        |

Note that if the trailing fields are all *empty*, their delimiters may be omitted. For example,

```
||abc|def|||
```

is the same as 

```
||abc|def
```