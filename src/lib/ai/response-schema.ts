export default function getCreateSchema(context: any) {

    switch (context?.createType) {

        case "CARD":
            return createCardSchema;

        case "CARD_TYPE":
            return createCardTypeSchema;

        case "CARD_ROLE":
            return createCardRoleSchema;

        case "EVENT":
            return createEventSchema;

        case "EVENT_TYPE":
            return createEventTypeSchema;

        case "ATTRIBUTE":
            return createAttributeSchema;

        case "NOTE":
            return createNoteSchema;

        default:
            throw new Error("Unknown createType");

    }

}

const createCardSchema = {
    type: "object",
    properties: {

        name: {
            type: "string",
            description: "Name of the card"
        },

        cardTypeId: {
            type: "string",
            description: "Must be retrieved using getCardTypes tool"
        },

        description: {
            type: "string",
            description: "Narrative description of the card",
            nullable: true
        },

        attributes: {
            type: "array",
            items: {
                type: "object",
                properties: {

                    attributeDefinitionId: {
                        type: "string",
                        description: "Must be retrieved using getAttributes tool"
                    },

                    value: {
                        type: "string",
                        description: "Value of the attribute depends attrType of attribute. if (attrType = 'Text') { type = 'String' }, if (attrtype = 'Number' or 'UnitNumber') { type = 'int' }, if (attrType = 'Option' or 'MultiOption') { type = 'String', enum = config }, if (attrtype = 'Link' or 'MultiLink') { type = 'string' description = 'must be gotten from getCard tool, only allow cards have the cardTypes in config }"
                    }

                },
                required: ["attributeDefinitionId", "value"]
            }
        },

        tags: {
            type: "array",
            items: { type: "string" }
        }

    },

    required: ["name", "cardTypeId"]
};

const createCardTypeSchema = {
    type: "object",
    properties: {
        name: {
            type: "string",
            description: "Name of the card type (e.g., Character, Location)"
        },
        description: {
            type: "string",
            description: "Description of the card type",
            nullable: true
        }
    },
    required: ["name"]
};

const createCardRoleSchema = {
    type: "object",
    properties: {
        name: {
            type: "string",
            description: "Name of the role (e.g., Protagonist, Antagonist)"
        },
        description: {
            type: "string",
            description: "Description of the role",
            nullable: true
        },
        cardTypeId: {
            type: "string",
            description: "Optional ID of the card type this role applies to, Must be retrieved using getCardTypes tool",
            nullable: true
        }
    },
    required: ["name"]
};

const createEventSchema = {
    type: "object",
    properties: {
        title: {
            type: "string",
            description: "Title of the event"
        },
        description: {
            type: "string",
            description: "Description of the event",
            nullable: true
        },
        eventTypeId: {
            type: "string",
            description: "ID of the event type, get using getEventType tool"
        },
        intensity: {
            type: "string",
            enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            description: "Intensity level of the event, how serious/important an event is."
        },
        visibility: {
            type: "string",
            enum: ["PUBLIC", "PRIVATE", "SECRET"],
            description: "Visibility of the event, default to 'PUBLIC' if not stated by user"
        },
        outcome: {
            type: "string",
            description: "Outcome or result of the event",
            nullable: true
        },
        timelineId: {
            type: "string",
            description: "ID of the timeline this event belongs to, Must be retrieved using getTimeline tool",
            nullable: true
        },
        tags: {
            type: "array",
            items: { type: "string" }
        }
    },
    required: ["title", "eventTypeId"]
};

const createEventTypeSchema = {
    type: "object",
    properties: {
        name: {
            type: "string",
            description: "Name of the event type (e.g., Scene, Flashback)"
        },
        description: {
            type: "string",
            description: "Description of the event type",
            nullable: true
        }
    },
    required: ["name"]
};

const createAttributeSchema = {
    type: "object",
    properties: {
        name: {
            type: "string",
            description: "Name of the attribute"
        },
        description: {
            type: "string",
            description: "Description of the attribute",
            nullable: true
        },
        cardTypeId: {
            type: "string",
            description: "ID of the card type this attribute belongs to"
        },
        attrType: {
            type: "string",
            description: "Type of the attribute value (e.g., Text, Number)"
        },
        config: {
            type: "object",
            description: "Configuration for the attribute",
            nullable: true
        }
    },
    required: ["name", "cardTypeId", "attrType"]
};

const createNoteSchema = {
    type: "object",
    properties: {
        title: {
            type: "string",
            description: "Title of the note"
        },
        content: {
            type: "string",
            description: "Description of the card type",
        }
    },
    required: ["title", "content"]
};
