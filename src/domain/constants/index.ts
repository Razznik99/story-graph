// Domain specific constants

export const MAX_STORY_TITLE_LENGTH = 100;
export const MAX_STORY_SYNOPSIS_LENGTH = 2000;

export const DEFAULT_PAGE_SIZE = 20;

export const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Japanese', 'Korean', 'Chinese', 'Russian', 'Arabic', 'Hindi', 'Portuguese', 'Italian', 'Dutch', 'Polish', 'Vietnamese', 'Thai', 'Tamil', 'Telugu', 'Urdu', 'Bengali'] as const;

// Enums / Constants for validation and UI
export const STORY_STATUSES = ['Draft', 'Serializing', 'Abandoned', 'Complete'] as const;
export const STORY_VISIBILITIES = ['private', 'public'] as const;
export const STORY_MEDIUM = [
    'Story', 'Movie', 'Game', 'Manga', 'Novel', 'Comic', 'Webtoon', 'Series', 'Book', 'Drama', 'Anime', 'RPG', 'Fanfiction'
] as const;

export const STORY_GENRES = [
    'Action', 'Adventure', 'Adult', 'Bara', 'Comedy', 'Crime', 'Cult', 'Cultivation', 'Cyberpunk',
    'DarkFantasy', 'Drama', 'Dystopian', 'Ecchi', 'Erotica', 'Fantasy', 'FairyTale', 'Gothic', 'Gore',
    'Gourmet', 'Harem', 'HaremReverse', 'Hentai', 'Historical', 'Horror', 'Isekai', 'Josei', 'Legal',
    'MartialArts', 'Mature', 'Mecha', 'Medical', 'Military', 'Mystery', 'Musical', 'Noir', 'Parody',
    'Police', 'Political', 'PostApocalyptic', 'Psychological', 'Romance', 'School', 'SciFi', 'Seinen',
    'Shoujo', 'Shounen', 'SliceOfLife', 'Smut', 'Space', 'Sports', 'Spy', 'Steampunk', 'Supernatural',
    'Tragedy', 'Thriller', 'UrbanFantasy', 'Vampire', 'Western', 'Wuxia', 'Xianxia', 'Xianyong',
    'Xuanhuan', 'Yaoi', 'Yuri'
] as const;

export const COLLABORATION_ROLES = ['Edit', 'Comment', 'View'] as const;
export const COLLABORATION_STATUS = ['PENDING', 'ACCEPTED', 'REJECTED'] as const;

export const EVENT_INTENSITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const EVENT_VISIBILITIES = ['PUBLIC', 'PRIVATE', 'SECRET'] as const;
export const EVENT_RELATIONSHIP_TYPES = [
    'CAUSES', 'CAUSED_BY', 'FORESHADOWS', 'RESOLVES', 'ESCALATES', 'DEESCALATES', 'PARALLEL_TO', 'CONTRADICTS'
] as const;

export const NOTE_RELATION_TYPES = ['REFERENCES', 'EXPANDS', 'DRAFT_OF', 'CONTRADICTS'] as const;

export const ANALYSIS_TYPES = ['auto', 'manual', 'scheduled'] as const;
export const ANALYSIS_SCOPES = ['full', 'partial'] as const;

export const SUGGESTION_ACTIONS = ['CREATE', 'UPDATE', 'DELETE'] as const;
export const SUGGESTION_TARGETS = ['CARD', 'EVENT', 'TIMELINE', 'STORY'] as const;

export const AI_PROVIDERS = ['OPENAI', 'GEMINI', 'ANTHROPIC'] as const;
