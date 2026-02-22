export const frontendSchemas = {
    Card: [
        { name: 'name', label: 'Name', type: 'string', required: true, description: 'Name of the card' },
        { name: 'cardTypeId', label: 'Type', type: 'select', required: true, options: [], description: 'Type of the card (Character, Location, etc.)' },
        { name: 'description', label: 'Description', type: 'text', required: false, description: 'Narrative description' },
        { name: 'imageUrl', label: 'Image', type: 'string', required: false, description: 'Prompt for image generator' },
        { name: 'attributes', label: 'Assigned Attributes', type: 'attributes_array', required: false, description: 'Mapped data properties' },
        { name: 'tags', label: 'Tags', type: 'string', required: false, description: 'Comma separated tags' }
    ],
    CardType: [
        { name: 'name', label: 'Name', type: 'string', required: true, description: 'Name of the card type' },
        { name: 'description', label: 'Description', type: 'text', required: false, description: 'Description of the card type' }
    ],
    CardRole: [
        { name: 'name', label: 'Name', type: 'string', required: true, description: 'Name of the role' },
        { name: 'description', label: 'Description', type: 'text', required: false, description: 'Description of the role' },
        { name: 'cardTypeId', label: 'Card Type', type: 'select', required: false, options: [], description: 'Associated Card Type' }
    ],
    Event: [
        { name: 'title', label: 'Title', type: 'string', required: true, description: 'Title of the event' },
        { name: 'eventTypeId', label: 'Type', type: 'select', required: true, options: [], description: 'Type of the event (Scene, Flashback, etc.)' },
        { name: 'description', label: 'Description', type: 'text', required: false, description: 'Description of the event' },
        { name: 'intensity', label: 'Intensity', type: 'select', required: true, options: [{ label: 'Low', value: 'LOW' }, { label: 'Medium', value: 'MEDIUM' }, { label: 'High', value: 'HIGH' }, { label: 'Critical', value: 'CRITICAL' }], description: 'Intensity of the event' },
        { name: 'visibility', label: 'Visibility', type: 'select', required: true, options: [{ label: 'Public', value: 'PUBLIC' }, { label: 'Private', value: 'PRIVATE' }, { label: 'Secret', value: 'SECRET' }], description: 'Visibility of the event' },
        { name: 'outcome', label: 'Outcome', type: 'text', required: false, description: 'Outcome of the event' },
        { name: 'timelineId', label: 'Timeline', type: 'string', required: false, description: 'Timeline ID' }
    ],
    EventType: [
        { name: 'name', label: 'Name', type: 'string', required: true, description: 'Name of the event type' },
        { name: 'description', label: 'Description', type: 'text', required: false, description: 'Description of the event type' }
    ],
    Attribute: [
        { name: 'name', label: 'Name', type: 'string', required: true, description: 'Name of the attribute' },
        { name: 'cardTypeId', label: 'Card Type', type: 'select', required: true, options: [], description: 'Associated Card Type' },
        { name: 'attrType', label: 'Attribute Type', type: 'select', required: true, options: [{ label: 'Text', value: 'Text' }, { label: 'Number', value: 'Number' }, { label: 'UnitNumber', value: 'UnitNumber' }, { label: 'Option', value: 'Option' }, { label: 'MultiOption', value: 'MultiOption' }, { label: 'Link', value: 'Link' }, { label: 'MultiLink', value: 'MultiLink' }], description: 'Data type' },
        { name: 'description', label: 'Description', type: 'text', required: false, description: 'Description' },
        { name: 'config', label: 'Configuration', type: 'json', required: false, description: 'Settings specific to the attribute type' }
    ],
    Note: [
        { name: 'title', label: 'Title', type: 'string', required: true, description: 'Title of the note' },
        { name: 'content', label: 'Content', type: 'text', required: true, description: 'Content of the note' }
    ],
    Story: [
        { name: 'title', label: 'Title', type: 'string', required: true, description: 'Title of the story' },
        { name: 'abbreviation', label: 'Abbreviation', type: 'string', required: true, description: 'Short abbreviation' },
        { name: 'language', label: 'Language', type: 'string', required: true, description: 'Language' },
        { name: 'medium', label: 'Medium', type: 'string', required: true, description: 'Medium' },
        { name: 'genres', label: 'Genres', type: 'string', required: true, description: 'Comma separated genres' },
        { name: 'synopsis', label: 'Synopsis', type: 'text', required: false, description: 'Synopsis' },
        { name: 'tags', label: 'Tags', type: 'string', required: false, description: 'Comma separated tags' },
        { name: 'status', label: 'Status', type: 'string', required: true, description: 'Status' },
        { name: 'visibility', label: 'Visibility', type: 'string', required: true, description: 'Visibility' },
        { name: 'coverUrl', label: 'Cover Image', type: 'string', required: false, description: 'Prompt for image generator' }
    ],
} as const;
